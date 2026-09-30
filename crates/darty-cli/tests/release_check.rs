#![cfg(feature = "fixture-origin")]

use std::{
    io::{Read, Write},
    net::TcpListener,
    path::PathBuf,
    process::{Command, Output, Stdio},
    sync::{
        Arc, Mutex,
        atomic::{AtomicBool, AtomicU64, AtomicUsize, Ordering},
    },
    thread,
    time::{Duration, Instant},
};

use serde_json::{Value, json};

static NEXT_DIRECTORY: AtomicU64 = AtomicU64::new(0);
const BODY: &[u8] =
    include_bytes!("../../../fixtures/dart/vertical-v1/bodies/company-populated.utf8.html");
const CURRENT: &str = env!("CARGO_PKG_VERSION");
const LATEST_MANIFEST_PATH: &str = "/cpaikr/darty/releases/latest/download/release-manifest.json";
const ASSET_PATH: &str = "/release-assets/release-manifest.json";

#[derive(Clone)]
enum Releases {
    Manifest(String),
    Status(u16),
    Delay(Duration),
}

/// One local origin serving DART fixture pages and GitHub release data.
struct Fixture {
    origin: String,
    directory: PathBuf,
    releases: Arc<Mutex<Releases>>,
    release_requests: Arc<AtomicUsize>,
    stop: Arc<AtomicBool>,
    server: Option<thread::JoinHandle<()>>,
}

impl Fixture {
    fn new() -> Self {
        let directory = std::env::temp_dir().join(format!(
            "darty-release-check-{}-{}",
            std::process::id(),
            NEXT_DIRECTORY.fetch_add(1, Ordering::Relaxed)
        ));
        std::fs::create_dir(&directory).unwrap();
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let origin = format!("http://{}", listener.local_addr().unwrap());
        listener.set_nonblocking(true).unwrap();
        let releases = Arc::new(Mutex::new(Releases::Status(500)));
        let release_requests = Arc::new(AtomicUsize::new(0));
        let stop = Arc::new(AtomicBool::new(false));
        let server = {
            let (releases, release_requests, stop) =
                (releases.clone(), release_requests.clone(), stop.clone());
            thread::spawn(move || {
                while !stop.load(Ordering::Relaxed) {
                    match listener.accept() {
                        Ok((socket, _)) => {
                            let (releases, release_requests) =
                                (releases.clone(), release_requests.clone());
                            thread::spawn(move || {
                                serve(socket, &releases, &release_requests);
                            });
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
            releases,
            release_requests,
            stop,
            server: Some(server),
        }
    }

    fn set_releases(&self, releases: Releases) {
        *self.releases.lock().unwrap() = releases;
    }

    fn cache_file(&self) -> PathBuf {
        self.directory.join("cache").join("release-check-v1.json")
    }

    fn command(&self, args: &[&str]) -> Command {
        let mut command = Command::new(env!("CARGO_BIN_EXE_darty"));
        command
            .args(args)
            .env("DARTY_FIXTURE_ORIGIN", &self.origin)
            .env("DARTY_FIXTURE_RELEASE_ORIGIN", &self.origin)
            .env("DARTY_STATE_DIR", self.directory.join("state"))
            .env("DARTY_CACHE_DIR", self.directory.join("cache"))
            .env("DARTY_REQUEST_INTERVAL_MS", "0")
            .env_remove("DARTY_NO_UPDATE_CHECK")
            .stdout(Stdio::piped())
            .stderr(Stdio::piped());
        command
    }

    fn search(&self) -> Command {
        self.command(&["search-company", "--company-name", "가람"])
    }

    fn requests(&self) -> usize {
        self.release_requests.load(Ordering::SeqCst)
    }
}

impl Drop for Fixture {
    fn drop(&mut self) {
        self.stop.store(true, Ordering::Relaxed);
        self.server.take().unwrap().join().unwrap();
        let _ = std::fs::remove_dir_all(&self.directory);
    }
}

/// A latest-release manifest for `version`; `complete` lists this platform.
fn manifest(version: &str, complete: bool) -> String {
    let target = if complete {
        target()
    } else {
        "other-target".to_owned()
    };
    json!({
        "version": version, "tag": format!("v{version}"), "sourceRevision": "0",
        "compiler": "rustc@1.88.0",
        "targets": [{"target": target, "archive": format!("darty-{version}-{target}.tar.gz"),
                     "sha256": "0", "runtimeCertified": false}],
        "sdks": [],
    })
    .to_string()
}

fn serve(
    mut socket: std::net::TcpStream,
    releases: &Mutex<Releases>,
    release_requests: &AtomicUsize,
) {
    // Windows inherits the listener's nonblocking mode on accepted sockets.
    socket.set_nonblocking(false).unwrap();
    socket
        .set_read_timeout(Some(Duration::from_secs(5)))
        .unwrap();
    let mut request = Vec::new();
    let mut byte = [0];
    while !request.ends_with(b"\r\n\r\n") {
        if socket.read_exact(&mut byte).is_err() {
            return;
        }
        request.push(byte[0]);
    }
    let headers = String::from_utf8(request).unwrap();
    let path = headers.split_whitespace().nth(1).unwrap_or_default();
    let length: usize = headers
        .lines()
        .find_map(|line| {
            let (name, value) = line.split_once(':')?;
            name.eq_ignore_ascii_case("content-length")
                .then(|| value.trim().parse().unwrap())
        })
        .unwrap_or(0);
    if socket.read_exact(&mut vec![0; length]).is_err() {
        return;
    }
    // Like github.com, the latest-release link redirects to the asset host.
    let (status, content_type, body, location) = if path == LATEST_MANIFEST_PATH {
        release_requests.fetch_add(1, Ordering::SeqCst);
        let releases = releases.lock().unwrap().clone();
        match releases {
            Releases::Manifest(_) => (302, "text/plain", Vec::new(), Some(ASSET_PATH)),
            Releases::Status(status) => (status, "text/plain", b"Not Found".to_vec(), None),
            Releases::Delay(delay) => {
                thread::sleep(delay);
                (302, "text/plain", Vec::new(), Some(ASSET_PATH))
            }
        }
    } else if path == ASSET_PATH {
        match releases.lock().unwrap().clone() {
            Releases::Manifest(body) => (200, "application/octet-stream", body.into_bytes(), None),
            _ => (404, "text/plain", Vec::new(), None),
        }
    } else {
        (200, "text/html; charset=UTF-8", BODY.to_vec(), None)
    };
    let location = location.map_or_else(String::new, |path| format!("Location: {path}\r\n"));
    let headers = format!(
        "HTTP/1.1 {status} Fixture\r\nContent-Type: {content_type}\r\n{location}Content-Length: {}\r\nConnection: close\r\n\r\n",
        body.len()
    );
    let _ = socket.write_all(headers.as_bytes());
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

fn newer_version() -> String {
    let major: u64 = CURRENT.split('.').next().unwrap().parse().unwrap();
    format!("{}.0.0", major + 1)
}

fn success(output: &Output) -> Value {
    assert!(
        output.status.success(),
        "{}",
        String::from_utf8_lossy(&output.stdout)
    );
    assert!(
        output.stderr.is_empty(),
        "{}",
        String::from_utf8_lossy(&output.stderr)
    );
    serde_json::from_slice(&output.stdout).expect("one JSON envelope")
}

#[test]
fn update_notice_is_advisory_and_leaves_the_primary_result_unchanged() {
    let fixture = Fixture::new();
    let latest = newer_version();
    fixture.set_releases(Releases::Manifest(manifest(&latest, true)));

    let mut checked = success(&fixture.search().output().unwrap());
    let advisories = checked
        .as_object_mut()
        .unwrap()
        .remove("advisories")
        .expect("update advisory");
    assert_eq!(advisories.as_array().unwrap().len(), 1);
    let advisory = &advisories[0];
    assert_eq!(advisory["code"], "update_available");
    assert_eq!(advisory["check"]["latestVersion"], latest.as_str());
    assert_eq!(advisory["check"]["distribution"], "complete");
    assert_eq!(advisory["check"]["runtimeCertified"], false);
    assert_eq!(advisory["check"]["freshness"], "fresh");
    assert!(advisory["message"].as_str().unwrap().contains("README"));
    assert_eq!(fixture.requests(), 1);

    let unchecked = success(
        &fixture
            .search()
            .env("DARTY_NO_UPDATE_CHECK", "1")
            .output()
            .unwrap(),
    );
    assert_eq!(checked, unchecked, "only advisories differ");

    // Cached evidence answers later invocations without another request.
    let cached = success(&fixture.search().output().unwrap());
    assert_eq!(cached["advisories"][0]["code"], "update_available");
    assert_eq!(fixture.requests(), 1);
}

#[test]
fn incomplete_distribution_is_reported_without_falling_back() {
    let fixture = Fixture::new();
    fixture.set_releases(Releases::Manifest(manifest(&newer_version(), false)));
    let value = success(&fixture.search().output().unwrap());
    assert_eq!(
        value["advisories"][0]["code"],
        "update_incomplete_distribution"
    );
    assert_eq!(
        value["advisories"][0]["check"]["distribution"],
        "incomplete_distribution"
    );
}

#[test]
fn equal_release_is_quiet_and_the_explicit_report_is_complete() {
    let fixture = Fixture::new();
    fixture.set_releases(Releases::Manifest(manifest(CURRENT, true)));
    let value = success(&fixture.search().output().unwrap());
    assert!(value.get("advisories").is_none(), "{value}");

    let report = success(&fixture.command(&["version", "--check"]).output().unwrap());
    let check = &report["result"]["releaseCheck"];
    assert_eq!(report["result"]["version"], CURRENT);
    assert_eq!(check["comparison"], "equal");
    assert_eq!(check["freshness"], "fresh");
    assert_eq!(check["latestVersion"], CURRENT);
    assert!((0..5).contains(&check["ageSeconds"].as_i64().unwrap()));
    assert!(check["releaseUrl"].as_str().unwrap().ends_with(CURRENT));
    assert!(report.get("advisories").is_none());
}

#[test]
fn missing_latest_manifest_means_no_stable_release() {
    let fixture = Fixture::new();
    fixture.set_releases(Releases::Status(404));
    let value = success(&fixture.search().output().unwrap());
    assert!(value.get("advisories").is_none(), "{value}");
    let report = success(&fixture.command(&["version", "--check"]).output().unwrap());
    let check = &report["result"]["releaseCheck"];
    assert_eq!(check["comparison"], "no_stable_release");
    assert_eq!(check["freshness"], "fresh");
    assert_eq!(fixture.requests(), 1, "cached absence is not refetched");
}

#[test]
fn failed_refresh_keeps_stale_evidence_and_waits_for_the_cooldown() {
    let fixture = Fixture::new();
    std::fs::create_dir_all(fixture.cache_file().parent().unwrap()).unwrap();
    let stale = json!({
        "target": target(),
        "evidence": {"observedAt": "2020-01-01T00:00:00Z", "latest": {
            "version": CURRENT, "url": "https://example.test/current",
            "distribution": "complete", "runtimeCertified": true}},
        "lastFailureAt": null,
    });
    std::fs::write(fixture.cache_file(), stale.to_string()).unwrap();
    fixture.set_releases(Releases::Status(503));

    let value = success(&fixture.search().output().unwrap());
    let advisory = &value["advisories"][0];
    assert_eq!(advisory["code"], "update_check_stale");
    assert_eq!(advisory["check"]["freshness"], "stale");
    assert_eq!(advisory["check"]["observedAt"], "2020-01-01T00:00:00Z");
    assert!(advisory["check"]["lastRefreshFailedAt"].is_string());
    assert!(
        advisory["check"]["problems"][0]
            .as_str()
            .unwrap()
            .contains("503")
    );
    assert_eq!(fixture.requests(), 1);

    let again = success(&fixture.search().output().unwrap());
    assert_eq!(again["advisories"][0]["code"], "update_check_stale");
    assert_eq!(fixture.requests(), 1, "retry waits for the cooldown");
}

#[test]
fn corrupt_cache_is_replaced_and_reported_without_failing() {
    let fixture = Fixture::new();
    std::fs::create_dir_all(fixture.cache_file().parent().unwrap()).unwrap();
    std::fs::write(fixture.cache_file(), b"{not json").unwrap();
    fixture.set_releases(Releases::Manifest(manifest(CURRENT, true)));
    let value = success(&fixture.search().output().unwrap());
    assert_eq!(value["advisories"][0]["code"], "update_check_problem");
    let value = success(&fixture.search().output().unwrap());
    assert!(value.get("advisories").is_none(), "{value}");
}

#[test]
fn refresh_budget_exhaustion_stays_advisory() {
    let fixture = Fixture::new();
    fixture.set_releases(Releases::Delay(Duration::from_secs(8)));
    let started = Instant::now();
    let value = success(&fixture.search().output().unwrap());
    let elapsed = started.elapsed();
    assert!(elapsed < Duration::from_secs(5), "{elapsed:?}");
    let advisory = &value["advisories"][0];
    assert_eq!(advisory["code"], "update_check_unavailable");
    assert!(
        advisory["check"]["problems"][0]
            .as_str()
            .unwrap()
            .contains("budget")
    );
}

#[test]
fn failures_help_version_and_local_commands_never_check() {
    let fixture = Fixture::new();
    fixture.set_releases(Releases::Manifest(manifest(&newer_version(), true)));
    for args in [
        &[][..],
        &["--help"],
        &["search-company", "--help"],
        &["version", "--help"],
        &["--version"],
        &["version"],
        &["disclosure-types"],
        &["report-guide"],
        &["search-company"],
        &["missing-command"],
    ] {
        let output = fixture.command(args).output().unwrap();
        assert!(output.stderr.is_empty(), "{args:?}");
        assert!(
            !String::from_utf8_lossy(&output.stdout).contains("\"advisories\""),
            "{args:?}"
        );
    }
    let version = fixture.command(&["--version"]).output().unwrap();
    assert_eq!(
        String::from_utf8(version.stdout).unwrap().trim_end(),
        format!("darty {CURRENT}")
    );
    assert_eq!(fixture.requests(), 0);
    assert!(!fixture.cache_file().parent().unwrap().exists());
}

#[test]
fn opt_out_disables_incidental_and_explicit_checks() {
    let fixture = Fixture::new();
    fixture.set_releases(Releases::Manifest(manifest(&newer_version(), true)));
    let value = success(
        &fixture
            .search()
            .env("DARTY_NO_UPDATE_CHECK", "1")
            .output()
            .unwrap(),
    );
    assert!(value.get("advisories").is_none());
    let report = success(
        &fixture
            .command(&["version", "--check"])
            .env("DARTY_NO_UPDATE_CHECK", "1")
            .output()
            .unwrap(),
    );
    let check = &report["result"]["releaseCheck"];
    assert_eq!(check["freshness"], "unavailable");
    assert!(
        check["problems"][0]
            .as_str()
            .unwrap()
            .contains("DARTY_NO_UPDATE_CHECK")
    );
    assert_eq!(fixture.requests(), 0);
    assert!(!fixture.cache_file().parent().unwrap().exists());

    // "0" keeps checks enabled.
    let value = success(
        &fixture
            .search()
            .env("DARTY_NO_UPDATE_CHECK", "0")
            .output()
            .unwrap(),
    );
    assert_eq!(value["advisories"][0]["code"], "update_available");
}

#[test]
fn fixture_origin_without_release_origin_never_contacts_github() {
    let fixture = Fixture::new();
    let value = success(
        &fixture
            .search()
            .env_remove("DARTY_FIXTURE_RELEASE_ORIGIN")
            .output()
            .unwrap(),
    );
    assert!(value.get("advisories").is_none());
    let report = success(
        &fixture
            .command(&["version", "--check"])
            .env_remove("DARTY_FIXTURE_RELEASE_ORIGIN")
            .output()
            .unwrap(),
    );
    let check = &report["result"]["releaseCheck"];
    assert_eq!(check["freshness"], "unavailable");
    assert!(check["problems"][0].as_str().unwrap().contains("fixture"));
    assert!(!fixture.cache_file().parent().unwrap().exists());
}
