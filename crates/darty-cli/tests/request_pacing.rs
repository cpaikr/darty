#![cfg(feature = "fixture-origin")]

use std::{
    io::{Read, Write},
    net::TcpListener,
    path::PathBuf,
    process::{Child, Command, Stdio},
    sync::{
        Arc,
        atomic::{AtomicBool, AtomicU64, Ordering},
        mpsc,
    },
    thread,
    time::{Duration, Instant},
};

static NEXT_DIRECTORY: AtomicU64 = AtomicU64::new(0);
const BODY: &[u8] =
    include_bytes!("../../../fixtures/dart/vertical-v1/bodies/company-populated.utf8.html");

struct Fixture {
    origin: String,
    directory: PathBuf,
    arrivals: mpsc::Receiver<Instant>,
    stop: Arc<AtomicBool>,
    server: Option<thread::JoinHandle<()>>,
}

impl Fixture {
    fn new(first_response_delay: Duration) -> Self {
        let directory = std::env::temp_dir().join(format!(
            "darty-pacing-{}-{}",
            std::process::id(),
            NEXT_DIRECTORY.fetch_add(1, Ordering::Relaxed)
        ));
        std::fs::create_dir(&directory).unwrap();
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let origin = format!("http://{}", listener.local_addr().unwrap());
        listener.set_nonblocking(true).unwrap();
        let (sender, arrivals) = mpsc::channel();
        let stop = Arc::new(AtomicBool::new(false));
        let server_stop = stop.clone();
        let server = thread::spawn(move || {
            let mut first = true;
            while !server_stop.load(Ordering::Relaxed) {
                match listener.accept() {
                    Ok((mut socket, _)) => {
                        let sender = sender.clone();
                        let delay = if first {
                            first_response_delay
                        } else {
                            Duration::ZERO
                        };
                        first = false;
                        thread::spawn(move || {
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
                            sender.send(Instant::now()).unwrap();
                            thread::sleep(delay);
                            let headers = format!(
                                "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=UTF-8\r\nContent-Length: {}\r\nConnection: close\r\n\r\n",
                                BODY.len()
                            );
                            let _ = socket.write_all(headers.as_bytes());
                            let _ = socket.write_all(BODY);
                        });
                    }
                    Err(error) if error.kind() == std::io::ErrorKind::WouldBlock => {
                        thread::sleep(Duration::from_millis(2));
                    }
                    Err(error) => panic!("fixture accept: {error}"),
                }
            }
        });
        Self {
            origin,
            directory,
            arrivals,
            stop,
            server: Some(server),
        }
    }

    fn command(&self, interval: Option<&str>) -> Command {
        let mut command = Command::new(env!("CARGO_BIN_EXE_darty"));
        command
            .args(["search-company", "--company-name", "가람"])
            .env("DARTY_FIXTURE_ORIGIN", &self.origin)
            .env("DARTY_STATE_DIR", &self.directory)
            .env_remove("DARTY_REQUEST_INTERVAL_MS")
            .stdout(Stdio::piped())
            .stderr(Stdio::piped());
        if let Some(interval) = interval {
            command.env("DARTY_REQUEST_INTERVAL_MS", interval);
        }
        command
    }

    fn arrival(&self) -> Instant {
        self.arrivals
            .recv_timeout(Duration::from_secs(10))
            .expect("fixture request")
    }
}

impl Drop for Fixture {
    fn drop(&mut self) {
        self.stop.store(true, Ordering::Relaxed);
        self.server.take().unwrap().join().unwrap();
        std::fs::remove_dir_all(&self.directory).unwrap();
    }
}

fn success(child: Child) {
    let output = child.wait_with_output().unwrap();
    assert!(
        output.status.success(),
        "{}",
        String::from_utf8_lossy(&output.stdout)
    );
}

#[test]
fn concurrent_cli_processes_share_default_500_ms_pacing() {
    let fixture = Fixture::new(Duration::ZERO);
    let children: Vec<_> = (0..4)
        .map(|_| fixture.command(None).spawn().unwrap())
        .collect();
    let arrivals: Vec<_> = (0..4).map(|_| fixture.arrival()).collect();
    for child in children {
        success(child);
    }
    let gaps: Vec<_> = arrivals
        .windows(2)
        .map(|pair| pair[1].duration_since(pair[0]))
        .collect();
    eprintln!("cross-process request gaps: {gaps:?}");
    assert!(
        gaps.iter().all(|gap| *gap >= Duration::from_millis(475)),
        "{gaps:?}"
    );
}

#[test]
fn interval_survives_process_exit_and_respects_both_callers() {
    let fixture = Fixture::new(Duration::ZERO);
    success(fixture.command(Some("700")).spawn().unwrap());
    let first = fixture.arrival();
    success(fixture.command(Some("50")).spawn().unwrap());
    let second = fixture.arrival();
    assert!(second.duration_since(first) >= Duration::from_millis(675));
    success(fixture.command(Some("700")).spawn().unwrap());
    assert!(fixture.arrival().duration_since(second) >= Duration::from_millis(675));
}

#[test]
fn zero_bypasses_shared_state_and_invalid_configuration_fails_before_network() {
    let fixture = Fixture::new(Duration::ZERO);
    let path = fixture.directory.join("request-pacing-v1.lock");
    std::fs::write(&path, b"corrupt").unwrap();
    success(fixture.command(Some("0")).spawn().unwrap());
    fixture.arrival();
    for (interval, code) in [
        ("-1", "invalid_request"),
        ("60001", "invalid_request"),
        ("500", "internal_error"),
    ] {
        let output = fixture.command(Some(interval)).output().unwrap();
        assert!(!output.status.success());
        assert!(String::from_utf8_lossy(&output.stdout).contains(code));
    }
    assert!(fixture.arrivals.try_recv().is_err());
    assert_eq!(std::fs::read(path).unwrap(), b"corrupt");
}

#[test]
fn killed_holder_and_waiter_do_not_leave_a_stale_lock() {
    let fixture = Fixture::new(Duration::from_secs(5));
    let mut holder = fixture.command(None).spawn().unwrap();
    let first = fixture.arrival();
    let mut waiter = fixture.command(None).spawn().unwrap();
    thread::sleep(Duration::from_millis(100));
    waiter.kill().unwrap();
    waiter.wait().unwrap();
    holder.kill().unwrap();
    holder.wait().unwrap();
    let next = fixture.command(None).spawn().unwrap();
    let second = fixture.arrival();
    success(next);
    let gap = second.duration_since(first);
    assert!(gap >= Duration::from_millis(475), "{gap:?}");
    assert!(gap < Duration::from_secs(3), "stale lock: {gap:?}");
}

#[test]
fn unusable_state_directory_fails_closed() {
    let fixture = Fixture::new(Duration::ZERO);
    let file = fixture.directory.join("not-a-directory");
    std::fs::write(&file, b"file").unwrap();
    let output = fixture
        .command(None)
        .env("DARTY_STATE_DIR", file)
        .output()
        .unwrap();
    assert!(!output.status.success());
    assert!(String::from_utf8_lossy(&output.stdout).contains("internal_error"));
    assert!(fixture.arrivals.try_recv().is_err());
}
