use std::{collections::BTreeMap, sync::Arc, time::Duration};

use encoding_rs::{EUC_KR, UTF_8};
use futures_util::StreamExt;
use reqwest::{
    Client, Method,
    header::{CONTENT_TYPE, HeaderMap, HeaderValue, REFERER, USER_AGENT},
    redirect,
};
use tokio::{sync::Mutex, time::Instant};
use url::Url;

use crate::{DartyError, ErrorCode};

const DART_ORIGIN: &str = "https://dart.fss.or.kr";
const USER_AGENT_VALUE: &str = concat!(
    "darty/",
    env!("CARGO_PKG_VERSION"),
    " (+https://github.com/sjunepark/darty)"
);
const REQUEST_START_INTERVAL: Duration = Duration::from_millis(250);

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
    pub(crate) fn fixture(origin: Url) -> Result<Self, DartyError> {
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
        Self::new(origin)
    }

    fn new(request_origin: Url) -> Result<Self, DartyError> {
        let client = Client::builder()
            .redirect(redirect::Policy::none())
            .connect_timeout(Duration::from_secs(5))
            .read_timeout(Duration::from_secs(10))
            .timeout(Duration::from_secs(30))
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
            return Err(DartyError::source(
                ErrorCode::SourceUnavailable,
                format!("DART returned unexpected HTTP status {}.", status.as_u16()),
                canonical_url,
            ));
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
        if !media_type.eq_ignore_ascii_case("text/html") {
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
    use super::{decode, encode_form, parse_content_type};

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
}
