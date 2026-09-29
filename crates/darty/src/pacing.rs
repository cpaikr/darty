use std::{
    fs::{File, OpenOptions},
    io::{Read, Seek, SeekFrom, Write},
    path::PathBuf,
    time::Duration,
};

use fs4::fs_std::FileExt;

use crate::{DartyError, ErrorCode};

const DEFAULT_INTERVAL_MS: u64 = 500;
const MAX_INTERVAL_MS: u64 = 60_000;
const LOCK_POLL: Duration = Duration::from_millis(25);

#[derive(Debug, Clone)]
pub(crate) struct Pacing {
    pub interval: Duration,
    path: Option<PathBuf>,
}

enum Attempt {
    Ready(File, Duration),
    Wait(Duration),
}

impl Pacing {
    #[cfg(feature = "fixture-origin")]
    pub(crate) fn isolated_fixture() -> Self {
        Self {
            interval: Duration::from_millis(DEFAULT_INTERVAL_MS),
            path: None,
        }
    }

    pub(crate) fn from_env(fixture: bool) -> Result<Self, DartyError> {
        let interval = match std::env::var("DARTY_REQUEST_INTERVAL_MS") {
            Ok(value) => parse_interval(&value)?,
            Err(std::env::VarError::NotPresent) => Duration::from_millis(DEFAULT_INTERVAL_MS),
            Err(std::env::VarError::NotUnicode(_)) => return Err(invalid_interval()),
        };
        let directory = std::env::var_os("DARTY_STATE_DIR").map(PathBuf::from);
        // Ordinary fixture clients stay isolated; subprocess tests explicitly share a directory.
        let path = if interval.is_zero() || (fixture && directory.is_none()) {
            None
        } else {
            let directory = directory.or_else(default_state_directory).ok_or_else(|| {
                state_error("No user state directory is available; set DARTY_STATE_DIR.")
            })?;
            if !directory.is_absolute() {
                return Err(state_error(
                    "DARTY_STATE_DIR must be an absolute directory path.",
                ));
            }
            Some(directory.join("request-pacing-v1.lock"))
        };
        Ok(Self { interval, path })
    }

    pub(crate) async fn acquire(&self) -> Result<Option<File>, DartyError> {
        let Some(path) = &self.path else {
            return Ok(None);
        };
        loop {
            let path = path.clone();
            let interval = self.interval;
            // File operations stay off the async executor. No worker blocks on another process.
            let attempt = tokio::task::spawn_blocking(move || try_acquire(&path, interval))
                .await
                .map_err(|_| state_error("The request pacing worker failed."))?
                .map_err(|error| state_error(&format!("Request pacing state failed: {error}")))?;
            match attempt {
                Attempt::Ready(mut file, delay) => {
                    // Wait under the lock: slow connection setup, cancellation, process death,
                    // and wall-clock changes cannot turn expired reservations into a burst.
                    tokio::time::sleep(delay).await;
                    let interval = self.interval;
                    let file = tokio::task::spawn_blocking(move || {
                        write_interval(&mut file, interval)?;
                        Ok::<_, std::io::Error>(file)
                    })
                    .await
                    .map_err(|_| state_error("The request pacing worker failed."))?
                    .map_err(|error| {
                        state_error(&format!("Request pacing state failed: {error}"))
                    })?;
                    return Ok(Some(file));
                }
                Attempt::Wait(delay) => tokio::time::sleep(delay).await,
            }
        }
    }
}

fn parse_interval(value: &str) -> Result<Duration, DartyError> {
    if value.is_empty() || !value.bytes().all(|byte| byte.is_ascii_digit()) {
        return Err(invalid_interval());
    }
    value
        .parse::<u64>()
        .ok()
        .filter(|milliseconds| *milliseconds <= MAX_INTERVAL_MS)
        .map(Duration::from_millis)
        .ok_or_else(invalid_interval)
}

fn invalid_interval() -> DartyError {
    DartyError::invalid(
        "DARTY_REQUEST_INTERVAL_MS must be an integer from 0 through 60000.",
        "DARTY_REQUEST_INTERVAL_MS",
        "Use 500 for default pacing; use 0 only for controlled fixture/test runs.",
    )
}

fn default_state_directory() -> Option<PathBuf> {
    if cfg!(windows) {
        std::env::var_os("LOCALAPPDATA").map(|root| PathBuf::from(root).join("darty"))
    } else {
        std::env::var_os("XDG_STATE_HOME")
            .filter(|root| !root.is_empty())
            .map(|root| PathBuf::from(root).join("darty"))
            .or_else(|| {
                std::env::var_os("HOME").map(|root| PathBuf::from(root).join(".local/state/darty"))
            })
    }
}

fn state_error(message: &str) -> DartyError {
    DartyError {
        code: ErrorCode::InternalError,
        message: message.to_owned(),
        retryable: false,
        parameter: None,
        source_url: None,
        recovery_hint: Some(
            "Check DARTY_STATE_DIR and its permissions. Use the same local directory for all Darty processes. Stop all Darty processes before repairing a damaged pacing file."
                .to_owned(),
        ),
    }
}

fn try_acquire(path: &std::path::Path, interval: Duration) -> std::io::Result<Attempt> {
    std::fs::create_dir_all(path.parent().expect("pacing file has a parent"))?;
    let mut file = OpenOptions::new()
        .create(true)
        .truncate(false)
        .read(true)
        .write(true)
        .open(path)?;
    if !FileExt::try_lock_exclusive(&file)? {
        return Ok(Attempt::Wait(LOCK_POLL));
    }

    let mut delay = interval;
    let length = file.metadata()?.len();
    if length != 0 {
        if length != 8 {
            return Err(std::io::Error::other("invalid pacing record length"));
        }
        let mut record = [0; 8];
        file.read_exact(&mut record)?;
        let previous_interval = u64::from_le_bytes(record);
        if previous_interval > MAX_INTERVAL_MS {
            return Err(std::io::Error::other("invalid pacing interval record"));
        }
        // Respect both callers when processes use different nonzero intervals.
        delay = interval.max(Duration::from_millis(previous_interval));
    }

    // Preserve the longer cooldown if this process is cancelled while waiting.
    write_interval(&mut file, delay)?;
    // Never unlink or replace this inode: all processes must lock the same file.
    // Retaining the handle through the request releases the OS lock on cancellation or exit.
    Ok(Attempt::Ready(file, delay))
}

fn write_interval(file: &mut File, interval: Duration) -> std::io::Result<()> {
    let record = u64::try_from(interval.as_millis())
        .expect("bounded interval")
        .to_le_bytes();
    file.seek(SeekFrom::Start(0))?;
    file.write_all(&record)?;
    file.flush()?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn interval_is_bounded_and_strict() {
        for value in [
            "",
            "-1",
            "+1",
            " 500",
            "1.5",
            "60001",
            "18446744073709551616",
        ] {
            assert_eq!(
                parse_interval(value).unwrap_err().code,
                ErrorCode::InvalidRequest
            );
        }
        assert_eq!(parse_interval("0").unwrap(), Duration::ZERO);
        assert_eq!(parse_interval("500").unwrap(), Duration::from_millis(500));
        assert_eq!(parse_interval("60000").unwrap(), Duration::from_secs(60));
    }

    #[tokio::test]
    async fn a_long_held_or_cancelled_permit_does_not_expire_the_next_cooldown() {
        let directory =
            std::env::temp_dir().join(format!("darty-pacing-unit-{}", std::process::id()));
        std::fs::create_dir(&directory).unwrap();
        let pacing = Pacing {
            interval: Duration::from_millis(100),
            path: Some(directory.join("request-pacing-v1.lock")),
        };
        let permit = pacing.acquire().await.unwrap();
        tokio::time::sleep(Duration::from_millis(200)).await;
        drop(permit);
        let released = tokio::time::Instant::now();
        let permit = pacing.acquire().await.unwrap();
        assert!(released.elapsed() >= Duration::from_millis(100));
        drop(permit);

        let waiting_pacing = pacing.clone();
        let waiting = tokio::spawn(async move { waiting_pacing.acquire().await });
        tokio::time::sleep(Duration::from_millis(25)).await;
        waiting.abort();
        assert!(waiting.await.unwrap_err().is_cancelled());
        let cancelled = tokio::time::Instant::now();
        let permit = tokio::time::timeout(Duration::from_secs(2), pacing.acquire())
            .await
            .unwrap()
            .unwrap();
        assert!(cancelled.elapsed() >= Duration::from_millis(100));
        drop(permit);
        std::fs::remove_dir_all(directory).unwrap();
    }
}
