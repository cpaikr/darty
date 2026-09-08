use std::{collections::BTreeMap, sync::Arc, time::Duration};

use chrono::{DateTime, Utc};
use encoding_rs::{EUC_KR, UTF_8};
use futures_util::StreamExt;
use reqwest::{
    Client, Method, StatusCode,
    header::{CONTENT_TYPE, HeaderMap, HeaderValue, REFERER, RETRY_AFTER, USER_AGENT},
    redirect,
};
use tokio::{sync::Mutex, time::Instant};
use url::Url;

use crate::{DartyError, ErrorCode};

const DART_ORIGIN: &str = "https://dart.fss.or.kr";
const USER_AGENT_VALUE: &str = concat!(
    "darty/",
    env!("CARGO_PKG_VERSION"),
    " (+https://github.com/cpaikr/darty)"
);
const REQUEST_START_INTERVAL: Duration = Duration::from_millis(250);
const MAX_RETRY_AFTER_SECONDS: u64 = 86_400;
const MAX_RETRY_AFTER_VALUE_LENGTH: usize = 128;

#[derive(Clone, Copy, Debug)]
pub(crate) struct DeadlineConfig {
    pub connect: Duration,
    pub read: Duration,
    pub total: Duration,
}

impl Default for DeadlineConfig {
    fn default() -> Self {
        Self {
            connect: Duration::from_secs(5),
            read: Duration::from_secs(10),
            total: Duration::from_secs(30),
        }
    }
}

#[derive(Debug, Clone)]
pub(crate) struct SourceTransport {
    client: Client,
    request_origin: Url,
    request_gate: Arc<Mutex<Instant>>,
}

#[derive(Debug, Clone)]
pub(crate) struct SourceRequest {
    pub method: Method,
    pub path: &'static str,
    pub referer: Option<&'static str>,
    pub form: Vec<(&'static str, String)>,
    pub query: Vec<(String, String)>,
    pub byte_cap: usize,
}

#[derive(Debug, Clone)]
pub(crate) struct SourceText {
    pub text: String,
    pub canonical_url: String,
}

impl SourceTransport {
    pub(crate) fn dart() -> Result<Self, DartyError> {
        Self::new(Url::parse(DART_ORIGIN).expect("static DART origin"))
    }

    #[cfg(feature = "fixture-origin")]
    pub(crate) fn fixture_with_deadlines(
        origin: Url,
        deadlines: DeadlineConfig,
    ) -> Result<Self, DartyError> {
        let loopback = origin
            .host_str()
            .is_some_and(|host| host == "localhost" || host == "127.0.0.1" || host == "::1");
        if origin.scheme() != "http" || !loopback {
            return Err(DartyError::invalid(
                "fixture origin must be an http loopback URL.",
                "fixtureOrigin",
                "Use the candidate fixture server on localhost.",
            ));
        }
        Self::new_with_deadlines(origin, deadlines)
    }

    fn new(request_origin: Url) -> Result<Self, DartyError> {
        Self::new_with_deadlines(request_origin, DeadlineConfig::default())
    }

    fn new_with_deadlines(
        request_origin: Url,
        deadlines: DeadlineConfig,
    ) -> Result<Self, DartyError> {
        let client = Client::builder()
            .redirect(redirect::Policy::none())
            .connect_timeout(deadlines.connect)
            .read_timeout(deadlines.read)
            .timeout(deadlines.total)
            .build()
            .map_err(|_| DartyError {
                code: ErrorCode::InternalError,
                message: "Failed to initialize the DART HTTP client.".to_owned(),
                retryable: false,
                parameter: None,
                source_url: None,
                recovery_hint: None,
            })?;
        Ok(Self {
            client,
            request_origin,
            request_gate: Arc::new(Mutex::new(Instant::now())),
        })
    }

    pub(crate) async fn execute(&self, request: SourceRequest) -> Result<SourceText, DartyError> {
        let mut request_permit = self.request_gate.lock().await;
        tokio::time::sleep_until(*request_permit).await;
        *request_permit = Instant::now() + REQUEST_START_INTERVAL;
        let result = self.execute_serialized(request).await;
        drop(request_permit);
        result
    }

    async fn execute_serialized(&self, request: SourceRequest) -> Result<SourceText, DartyError> {
        let actual_url = self
            .request_origin
            .join(request.path)
            .expect("canonical relative DART path");
        let canonical_url = canonical_url(request.path);
        let mut headers = HeaderMap::new();
        headers.insert(USER_AGENT, HeaderValue::from_static(USER_AGENT_VALUE));
        if let Some(referer) = request.referer {
            headers.insert(REFERER, HeaderValue::from_static(referer));
        }

        let mut builder = self
            .client
            .request(request.method.clone(), actual_url)
            .headers(headers);
        if !request.query.is_empty() {
            builder = builder.query(&request.query);
        }
        if request.method == Method::POST {
            let body = encode_form(&request.form);
            builder = builder
                .header(
                    CONTENT_TYPE,
                    HeaderValue::from_static("application/x-www-form-urlencoded; charset=UTF-8"),
                )
                .body(body);
        }

        let response = builder.send().await.map_err(|_| {
            DartyError::source(
                ErrorCode::SourceUnavailable,
                "The DART source request failed or timed out.",
                &canonical_url,
            )
        })?;
        let status = response.status();
        if status.as_u16() != 200 {
            let mut error = DartyError::source(
                ErrorCode::SourceUnavailable,
                format!("DART returned unexpected HTTP status {}.", status.as_u16()),
                canonical_url,
            );
            error.recovery_hint = retry_after_hint(status, response.headers(), Utc::now());
            return Err(error);
        }

        let content_type = response
            .headers()
            .get(CONTENT_TYPE)
            .and_then(|value| value.to_str().ok())
            .ok_or_else(|| {
                DartyError::source(
                    ErrorCode::SourceParseFailure,
                    "DART returned no usable Content-Type header.",
                    &canonical_url,
                )
            })?
            .to_owned();
        let (media_type, charset) = parse_content_type(&content_type);
        let accepted = if request.path == "/api/companyRSS.xml" {
            ["application/xml", "text/xml", "application/rss+xml"]
                .iter()
                .any(|value| media_type.eq_ignore_ascii_case(value))
        } else {
            media_type.eq_ignore_ascii_case("text/html")
        };
        if !accepted {
            return Err(DartyError::source(
                ErrorCode::SourceParseFailure,
                "DART returned an unsupported response media type.",
                canonical_url,
            ));
        }

        let mut bytes = Vec::new();
        let mut stream = response.bytes_stream();
        while let Some(chunk) = stream.next().await {
            let chunk = chunk.map_err(|_| {
                DartyError::source(
                    ErrorCode::SourceUnavailable,
                    "The DART response body failed or timed out while streaming.",
                    &canonical_url,
                )
            })?;
            if bytes.len().saturating_add(chunk.len()) > request.byte_cap {
                return Err(DartyError::source(
                    ErrorCode::SourceParseFailure,
                    "The DART response exceeded the supported byte limit.",
                    canonical_url,
                ));
            }
            bytes.extend_from_slice(&chunk);
        }

        let text = decode(&bytes, charset.as_deref(), &canonical_url)?;
        Ok(SourceText {
            text,
            canonical_url,
        })
    }
}

fn encode_form(fields: &[(&str, String)]) -> String {
    let mut serializer = url::form_urlencoded::Serializer::new(String::new());
    for (key, value) in fields {
        serializer.append_pair(key, value);
    }
    serializer.finish()
}

fn canonical_url(path: &str) -> String {
    Url::parse(DART_ORIGIN)
        .expect("static DART origin")
        .join(path)
        .expect("canonical relative DART path")
        .to_string()
}

fn retry_after_hint(status: StatusCode, headers: &HeaderMap, now: DateTime<Utc>) -> Option<String> {
    if status != StatusCode::TOO_MANY_REQUESTS {
        return None;
    }
    let value = headers.get(RETRY_AFTER)?.to_str().ok()?.trim();
    if value.is_empty() || value.len() > MAX_RETRY_AFTER_VALUE_LENGTH {
        return None;
    }
    if let Ok(seconds) = value.parse::<u64>() {
        return (seconds <= MAX_RETRY_AFTER_SECONDS)
            .then(|| format!("Retry after {seconds} seconds."));
    }
    let date = DateTime::parse_from_rfc2822(value)
        .ok()?
        .with_timezone(&Utc);
    let milliseconds = date.signed_duration_since(now).num_milliseconds();
    let seconds = if milliseconds <= 0 {
        0
    } else {
        u64::try_from(milliseconds.saturating_add(999) / 1_000)
            .expect("positive duration should convert to seconds")
    };
    (seconds <= MAX_RETRY_AFTER_SECONDS).then(|| format!("Retry after {seconds} seconds."))
}

fn parse_content_type(value: &str) -> (&str, Option<String>) {
    let mut parts = value.split(';');
    let media_type = parts.next().unwrap_or_default().trim();
    let parameters = parts
        .filter_map(|part| part.trim().split_once('='))
        .map(|(name, value)| {
            (
                name.trim().to_ascii_lowercase(),
                value.trim().trim_matches('"').to_ascii_lowercase(),
            )
        })
        .collect::<BTreeMap<_, _>>();
    (media_type, parameters.get("charset").cloned())
}

fn decode(bytes: &[u8], charset: Option<&str>, source_url: &str) -> Result<String, DartyError> {
    let encoding = match charset.map(str::to_ascii_lowercase).as_deref() {
        None | Some("utf-8" | "utf8") => UTF_8,
        Some("ms949" | "euc-kr" | "ks_c_5601-1987") => EUC_KR,
        Some(_) => {
            return Err(DartyError::source(
                ErrorCode::SourceParseFailure,
                "DART declared an unsupported response charset.",
                source_url,
            ));
        }
    };
    let (decoded, _, _) = encoding.decode(bytes);
    Ok(decoded.into_owned())
}

#[cfg(test)]
mod tests {
    use std::time::Duration;

    use chrono::{DateTime, Utc};
    use reqwest::{
        StatusCode,
        header::{HeaderMap, HeaderValue, RETRY_AFTER},
    };

    use super::{
        DeadlineConfig, MAX_RETRY_AFTER_VALUE_LENGTH, decode, encode_form, parse_content_type,
        retry_after_hint,
    };

    fn test_now() -> DateTime<Utc> {
        DateTime::parse_from_rfc3339("2026-08-23T00:00:00Z")
            .expect("fixed test clock")
            .with_timezone(&Utc)
    }

    #[test]
    fn form_keeps_repeated_fields() {
        assert_eq!(
            encode_form(&[
                ("publicType", "A001".to_owned()),
                ("publicType", "A002".to_owned()),
            ]),
            "publicType=A001&publicType=A002"
        );
    }

    #[test]
    fn content_type_is_case_insensitive_and_parameterized() {
        let (media, charset) = parse_content_type("Text/HTML; Charset=MS949");
        assert_eq!(media, "Text/HTML");
        assert_eq!(charset.as_deref(), Some("ms949"));
    }

    #[test]
    fn malformed_input_is_replaced() {
        let decoded = decode(b"prefix \xff suffix", None, "https://dart.invalid").unwrap();
        assert!(decoded.contains('\u{fffd}'));
    }

    #[test]
    fn production_deadline_defaults_are_five_ten_and_thirty_seconds() {
        let deadlines = DeadlineConfig::default();
        assert_eq!(deadlines.connect, Duration::from_secs(5));
        assert_eq!(deadlines.read, Duration::from_secs(10));
        assert_eq!(deadlines.total, Duration::from_secs(30));
    }

    #[test]
    fn retry_after_keeps_bounded_numeric_hint_only_for_429() {
        let mut headers = HeaderMap::new();
        headers.insert(RETRY_AFTER, HeaderValue::from_static("30"));
        assert_eq!(
            retry_after_hint(StatusCode::TOO_MANY_REQUESTS, &headers, test_now()).as_deref(),
            Some("Retry after 30 seconds.")
        );
        assert!(retry_after_hint(StatusCode::SERVICE_UNAVAILABLE, &headers, test_now()).is_none());
    }

    #[test]
    fn retry_after_http_date_is_relative_to_the_injected_clock() {
        let mut headers = HeaderMap::new();
        headers.insert(
            RETRY_AFTER,
            HeaderValue::from_static("Sun, 23 Aug 2026 00:00:30 GMT"),
        );
        assert_eq!(
            retry_after_hint(StatusCode::TOO_MANY_REQUESTS, &headers, test_now()).as_deref(),
            Some("Retry after 30 seconds.")
        );
    }

    #[test]
    fn retry_after_http_date_in_the_past_is_immediate() {
        let mut headers = HeaderMap::new();
        headers.insert(
            RETRY_AFTER,
            HeaderValue::from_static("Sat, 22 Aug 2026 23:59:59 GMT"),
        );
        assert_eq!(
            retry_after_hint(StatusCode::TOO_MANY_REQUESTS, &headers, test_now()).as_deref(),
            Some("Retry after 0 seconds.")
        );
    }

    #[test]
    fn retry_after_http_date_far_in_the_future_is_omitted() {
        let mut headers = HeaderMap::new();
        headers.insert(
            RETRY_AFTER,
            HeaderValue::from_static("Mon, 24 Aug 2026 00:00:01 GMT"),
        );
        assert!(retry_after_hint(StatusCode::TOO_MANY_REQUESTS, &headers, test_now()).is_none());
    }

    #[test]
    fn retry_after_omits_malformed_and_oversized_values() {
        let mut headers = HeaderMap::new();
        headers.insert(RETRY_AFTER, HeaderValue::from_static("tomorrow"));
        assert!(retry_after_hint(StatusCode::TOO_MANY_REQUESTS, &headers, test_now()).is_none());

        headers.insert(RETRY_AFTER, HeaderValue::from_static("86401"));
        assert!(retry_after_hint(StatusCode::TOO_MANY_REQUESTS, &headers, test_now()).is_none());

        let oversized = "1".repeat(MAX_RETRY_AFTER_VALUE_LENGTH + 1);
        headers.insert(RETRY_AFTER, HeaderValue::from_str(&oversized).unwrap());
        assert!(retry_after_hint(StatusCode::TOO_MANY_REQUESTS, &headers, test_now()).is_none());
    }
}
