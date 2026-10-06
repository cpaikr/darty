#![cfg(feature = "fixture-origin")]

use std::{
    collections::HashMap,
    io::{Read, Write},
    net::{TcpListener, TcpStream},
    path::PathBuf,
    process::{Command, Output, Stdio},
    sync::{
        Arc, Mutex,
        atomic::{AtomicBool, AtomicU64, Ordering},
    },
    thread,
    time::Duration,
};

use flate2::{Compression, write::GzEncoder};
use serde_json::{Value, json};
use sha2::{Digest, Sha256};

static NEXT_DIRECTORY: AtomicU64 = AtomicU64::new(0);
const CURRENT: &str = env!("CARGO_PKG_VERSION");
const EXECUTABLE: &str = if cfg!(windows) { "darty.exe" } else { "darty" };
const RECEIPT: &str = ".darty-receipt.json";
const LOCK: &str = ".darty-upgrade.lock";
const OLDER: &str = "0.0.1";

type Routes = Arc<Mutex<HashMap<String, Vec<u8>>>>;

/// A local GitHub release origin and a copied darty installation.
struct Fixture {
    origin: String,
    directory: PathBuf,
    routes: Routes,
    requests: Arc<Mutex<Vec<String>>>,
    stop: Arc<AtomicBool>,
    server: Option<thread::JoinHandle<()>>,
}

impl Fixture {
    fn new() -> Self {
        let directory = std::env::temp_dir().join(format!(
            "darty-upgrade-{}-{}",
            std::process::id(),
            NEXT_DIRECTORY.fetch_add(1, Ordering::Relaxed)
        ));
        let _ = std::fs::remove_dir_all(&directory);
        std::fs::create_dir_all(directory.join("bin")).unwrap();
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let origin = format!("http://{}", listener.local_addr().unwrap());
        listener.set_nonblocking(true).unwrap();
        let routes = Routes::default();
        let requests = Arc::new(Mutex::new(Vec::new()));
        let stop = Arc::new(AtomicBool::new(false));
        let server = {
            let (routes, requests, stop) = (routes.clone(), requests.clone(), stop.clone());
            thread::spawn(move || {
                while !stop.load(Ordering::Relaxed) {
                    match listener.accept() {
                        Ok((socket, _)) => {
                            let (routes, requests) = (routes.clone(), requests.clone());
                            thread::spawn(move || serve(socket, &routes, &requests));
                        }
                        Err(error) if error.kind() == std::io::ErrorKind::WouldBlock => {
                            thread::sleep(Duration::from_millis(2));
                        }
                        Err(error) => panic!("fixture accept: {error}"),
                    }
                }
            })
        };
        Self {
            origin,
            directory,
            routes,
            requests,
            stop,
            server: Some(server),
        }
    }

    fn bin(&self) -> PathBuf {
        self.directory.join("bin")
    }

    fn executable(&self) -> PathBuf {
        self.bin().join(EXECUTABLE)
    }

    /// Copies the test build into place, with a receipt naming `version` when given.
    fn install(&self, version: Option<&str>) {
        std::fs::copy(env!("CARGO_BIN_EXE_darty"), self.executable()).unwrap();
        if let Some(version) = version {
            let receipt = json!({
                "schemaVersion": 1,
                "manager": "standalone",
                "version": version,
                "target": target(),
                "executable": self.executable(),
                "releaseRepository": "cpaikr/darty",
                "releaseTag": format!("v{version}"),
                "assetName": format!("darty-{version}-{}.tar.gz", target()),
                "sha256": digest(&std::fs::read(self.executable()).unwrap()),
            });
            std::fs::write(self.bin().join(RECEIPT), format!("{receipt}\n")).unwrap();
        }
    }

    /// Publishes `version` as the latest release; `listed` overrides the archive digest.
    fn publish(&self, version: &str, archive: &[u8], listed: Option<&str>) {
        let name = format!("darty-{version}-{}.tar.gz", target());
        let sha256 = listed.map_or_else(|| digest(archive), str::to_owned);
        let manifest = json!({
            "version": version, "tag": format!("v{version}"), "sourceRevision": "0",
            "compiler": "rustc@1.88.0",
            "targets": [{"target": target(), "archive": name, "sha256": sha256, "runtimeCertified": true}],
            "sdks": [],
        });
        let download = format!("/cpaikr/darty/releases/download/v{version}");
        let mut routes = self.routes.lock().unwrap();
        routes.insert(
            "/cpaikr/darty/releases/latest/download/release-manifest.json".to_owned(),
            manifest.to_string().into_bytes(),
        );
        routes.insert(
            format!("{download}/SHA256SUMS"),
            format!("{sha256}  {name}\n{}  install.sh\n", "0".repeat(64)).into_bytes(),
        );
        routes.insert(format!("{download}/{name}"), archive.to_vec());
    }

    /// Publishes `version` without an archive for this target.
    fn publish_incomplete(&self, version: &str) {
        let manifest = json!({
            "version": version, "tag": format!("v{version}"), "sourceRevision": "0",
            "compiler": "rustc@1.88.0", "targets": [], "sdks": [],
        });
        self.routes.lock().unwrap().insert(
            "/cpaikr/darty/releases/latest/download/release-manifest.json".to_owned(),
            manifest.to_string().into_bytes(),
        );
    }

    fn upgrade(&self, args: &[&str], running: Option<&str>) -> Output {
        let mut command = Command::new(self.executable());
        command
            .arg("upgrade")
            .args(args)
            .env("DARTY_FIXTURE_RELEASE_ORIGIN", &self.origin)
            .env_remove("DARTY_FIXTURE_ORIGIN")
            .env_remove("DARTY_FIXTURE_RUNNING_VERSION")
            .stdin(Stdio::null())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped());
        if let Some(running) = running {
            command.env("DARTY_FIXTURE_RUNNING_VERSION", running);
        }
        command.output().unwrap()
    }

    fn archive_requests(&self) -> usize {
        self.requests
            .lock()
            .unwrap()
            .iter()
            .filter(|path| path.ends_with(".tar.gz"))
            .count()
    }

    fn receipt(&self) -> Value {
        serde_json::from_slice(&std::fs::read(self.bin().join(RECEIPT)).unwrap()).unwrap()
    }

    /// Installation directory entries other than executables set aside on Windows.
    fn entries(&self) -> Vec<String> {
        let mut names = std::fs::read_dir(self.bin())
            .unwrap()
            .map(|entry| entry.unwrap().file_name().into_string().unwrap())
            .filter(|name| !(cfg!(windows) && name.starts_with(".darty-old-")))
            .collect::<Vec<_>>();
        names.sort();
        names
    }
}

impl Drop for Fixture {
    fn drop(&mut self) {
        self.stop.store(true, Ordering::Relaxed);
        self.server.take().unwrap().join().unwrap();
        let _ = std::fs::remove_dir_all(&self.directory);
    }
}

fn serve(mut socket: TcpStream, routes: &Routes, requests: &Mutex<Vec<String>>) {
    socket.set_nonblocking(false).unwrap();
    let mut request = Vec::new();
    let mut buffer = [0; 1024];
    while !request.windows(4).any(|window| window == b"\r\n\r\n") {
        match socket.read(&mut buffer) {
            Ok(0) | Err(_) => return,
            Ok(read) => request.extend_from_slice(&buffer[..read]),
        }
    }
    let path = String::from_utf8_lossy(&request)
        .split_whitespace()
        .nth(1)
        .unwrap_or_default()
        .to_owned();
    requests.lock().unwrap().push(path.clone());
    let body = routes.lock().unwrap().get(&path).cloned();
    let (status, body) = body.map_or(("404 Not Found", Vec::new()), |body| ("200 OK", body));
    let _ = write!(
        socket,
        "HTTP/1.1 {status}\r\nContent-Length: {}\r\nConnection: close\r\n\r\n",
        body.len()
    );
    let _ = socket.write_all(&body);
}

fn target() -> String {
    let output = Command::new(env!("CARGO_BIN_EXE_darty"))
        .arg("version")
        .output()
        .unwrap();
    let value: Value = serde_json::from_slice(&output.stdout).unwrap();
    value["result"]["target"]
        .as_str()
        .expect("tests run on a release target")
        .to_owned()
}

fn digest(bytes: &[u8]) -> String {
    format!("{:x}", Sha256::digest(bytes))
}

fn release_archive(executable: &[u8]) -> Vec<u8> {
    let mut builder = tar::Builder::new(GzEncoder::new(Vec::new(), Compression::fast()));
    for (name, bytes) in [
        (EXECUTABLE, executable),
        ("LICENSE.md", b"license".as_slice()),
    ] {
        let mut header = tar::Header::new_ustar();
        header.set_size(bytes.len() as u64);
        header.set_mode(0o755);
        builder.append_data(&mut header, name, bytes).unwrap();
    }
    builder.into_inner().unwrap().finish().unwrap()
}

fn envelope(output: &Output) -> Value {
    assert!(
        output.stderr.is_empty(),
        "{}",
        String::from_utf8_lossy(&output.stderr)
    );
    serde_json::from_slice(&output.stdout)
        .unwrap_or_else(|_| panic!("{}", String::from_utf8_lossy(&output.stdout)))
}

fn this_build() -> Vec<u8> {
    std::fs::read(env!("CARGO_BIN_EXE_darty")).unwrap()
}

#[test]
fn upgrade_replaces_a_managed_installation_and_its_receipt() {
    let fixture = Fixture::new();
    fixture.install(Some(OLDER));
    fixture.publish(CURRENT, &release_archive(&this_build()), None);

    let checked = fixture.upgrade(&["--check"], Some(OLDER));
    assert!(checked.status.success());
    let checked = envelope(&checked);
    assert_eq!(checked["metadata"]["output"], "upgrade");
    assert_eq!(checked["result"]["updateAvailable"], true);
    assert_eq!(checked["result"]["updated"], false);
    assert_eq!(checked["result"]["installedVersion"], OLDER);
    assert_eq!(
        checked["help"][0],
        format!("Run darty upgrade to install darty {CURRENT}.")
    );
    assert_eq!(fixture.archive_requests(), 0, "--check downloads nothing");

    let upgraded = fixture.upgrade(&[], Some(OLDER));
    assert!(upgraded.status.success());
    let upgraded = envelope(&upgraded);
    assert_eq!(upgraded["result"]["runningVersion"], OLDER);
    assert_eq!(upgraded["result"]["installedVersion"], CURRENT);
    assert_eq!(upgraded["result"]["updated"], true);
    assert_eq!(upgraded["result"]["target"], target());
    let receipt = fixture.receipt();
    assert_eq!(receipt["version"], CURRENT);
    assert_eq!(receipt["releaseTag"], format!("v{CURRENT}"));
    assert_eq!(receipt["sha256"], digest(&this_build()));
    assert_eq!(fixture.entries(), [RECEIPT, LOCK, EXECUTABLE]);

    // The replaced installation is managed at the new version.
    let current = envelope(&fixture.upgrade(&["--check"], None));
    assert_eq!(current["result"]["updateAvailable"], false);
    assert_eq!(current["result"]["installedVersion"], CURRENT);
}

#[test]
fn a_checksum_mismatch_leaves_the_installation_unchanged() {
    let fixture = Fixture::new();
    fixture.install(Some(OLDER));
    let receipt = std::fs::read(fixture.bin().join(RECEIPT)).unwrap();
    fixture.publish(
        CURRENT,
        &release_archive(&this_build()),
        Some(&digest(b"other")),
    );

    let output = fixture.upgrade(&[], Some(OLDER));
    assert_eq!(output.status.code(), Some(1));
    let failure = envelope(&output);
    assert_eq!(failure["error"]["code"], "upgrade_verification_failed");
    assert_eq!(failure["result"], Value::Null);
    assert_eq!(std::fs::read(fixture.bin().join(RECEIPT)).unwrap(), receipt);
    assert_eq!(fixture.entries(), [RECEIPT, LOCK, EXECUTABLE]);
}

#[test]
fn a_candidate_reporting_another_version_is_not_installed() {
    let fixture = Fixture::new();
    fixture.install(Some(OLDER));
    let receipt = std::fs::read(fixture.bin().join(RECEIPT)).unwrap();
    fixture.publish("999.0.0", &release_archive(&this_build()), None);

    let output = fixture.upgrade(&[], Some(OLDER));
    assert_eq!(output.status.code(), Some(1));
    let failure = envelope(&output);
    assert_eq!(failure["error"]["code"], "upgrade_verification_failed");
    assert!(
        failure["error"]["message"]
            .as_str()
            .unwrap()
            .contains("does not report darty 999.0.0"),
        "{failure}"
    );
    assert_eq!(std::fs::read(fixture.bin().join(RECEIPT)).unwrap(), receipt);
    assert_eq!(fixture.entries(), [RECEIPT, LOCK, EXECUTABLE]);
}

#[test]
fn installations_without_a_matching_receipt_are_not_managed() {
    let fixture = Fixture::new();
    fixture.install(None);
    fixture.publish(CURRENT, &release_archive(&this_build()), None);
    let unmanaged = envelope(&fixture.upgrade(&[], Some(OLDER)));
    assert_eq!(unmanaged["error"]["code"], "unmanaged_installation");
    assert!(
        unmanaged["error"]["recoveryHint"]
            .as_str()
            .unwrap()
            .contains("README")
    );

    // A receipt for another version describes a different executable.
    fixture.install(Some("0.0.2"));
    let mismatched = envelope(&fixture.upgrade(&["--check"], Some(OLDER)));
    assert_eq!(mismatched["error"]["code"], "upgrade_receipt_mismatch");
    assert!(fixture.requests.lock().unwrap().is_empty());
}

#[test]
fn an_incomplete_release_is_reported_but_not_installed() {
    let fixture = Fixture::new();
    fixture.install(Some(OLDER));
    fixture.publish_incomplete(CURRENT);

    let checked = fixture.upgrade(&["--check"], Some(OLDER));
    assert!(checked.status.success());
    let checked = envelope(&checked);
    assert_eq!(checked["result"]["updateAvailable"], true);
    assert_eq!(checked["result"]["distribution"], "incomplete_distribution");
    assert!(
        checked["help"][0]
            .as_str()
            .unwrap()
            .contains("until the release is complete")
    );

    let output = fixture.upgrade(&[], Some(OLDER));
    assert_eq!(output.status.code(), Some(1));
    assert_eq!(
        envelope(&output)["error"]["code"],
        "upgrade_release_invalid"
    );
    assert_eq!(fixture.archive_requests(), 0);
}

#[test]
fn an_upgrade_removes_files_left_by_interrupted_upgrades() {
    let fixture = Fixture::new();
    fixture.install(Some(OLDER));
    for leftover in [
        format!(".darty-new-1{}", std::env::consts::EXE_SUFFIX),
        format!(".darty-old-1{}", std::env::consts::EXE_SUFFIX),
        ".darty-receipt-new-1.json".to_owned(),
        ".darty-receipt-old-1.json".to_owned(),
    ] {
        std::fs::write(fixture.bin().join(leftover), b"leftover").unwrap();
    }
    fixture.publish(CURRENT, &release_archive(&this_build()), None);
    assert!(fixture.upgrade(&[], Some(OLDER)).status.success());
    assert_eq!(fixture.entries(), [RECEIPT, LOCK, EXECUTABLE]);
}
