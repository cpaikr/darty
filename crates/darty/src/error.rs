use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ErrorCode {
    InvalidRequest,
    NotFound,
    SourceUnavailable,
    SourceChanged,
    SourceParseFailure,
    InternalError,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Error)]
#[error("{message}")]
#[serde(rename_all = "camelCase")]
pub struct DartyError {
    pub code: ErrorCode,
    pub message: String,
    pub retryable: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub parameter: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub source_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub recovery_hint: Option<String>,
}

impl DartyError {
    pub(crate) fn invalid(
        message: impl Into<String>,
        parameter: impl Into<String>,
        recovery_hint: impl Into<String>,
    ) -> Self {
        Self {
            code: ErrorCode::InvalidRequest,
            message: message.into(),
            retryable: false,
            parameter: Some(parameter.into()),
            source_url: None,
            recovery_hint: Some(recovery_hint.into()),
        }
    }

    pub(crate) fn source(
        code: ErrorCode,
        message: impl Into<String>,
        source_url: impl Into<String>,
    ) -> Self {
        debug_assert!(matches!(
            code,
            ErrorCode::SourceUnavailable | ErrorCode::SourceChanged | ErrorCode::SourceParseFailure
        ));
        Self {
            code,
            message: message.into(),
            retryable: code == ErrorCode::SourceUnavailable,
            parameter: None,
            source_url: Some(source_url.into()),
            recovery_hint: None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::{DartyError, ErrorCode};

    #[test]
    fn error_json_is_camel_case_and_missing_optional_fields_are_none() {
        let error = DartyError {
            code: ErrorCode::SourceChanged,
            message: "changed".to_owned(),
            retryable: false,
            parameter: None,
            source_url: Some("https://dart.fss.or.kr/example".to_owned()),
            recovery_hint: Some("retry the lookup".to_owned()),
        };
        let serialized = serde_json::to_value(&error).unwrap();
        assert_eq!(serialized["sourceUrl"], "https://dart.fss.or.kr/example");
        assert_eq!(serialized["recoveryHint"], "retry the lookup");
        assert!(serialized.get("source_url").is_none());

        let minimal: DartyError = serde_json::from_value(serde_json::json!({
            "code": "invalid_request",
            "message": "invalid",
            "retryable": false
        }))
        .unwrap();
        assert!(minimal.parameter.is_none());
        assert!(minimal.source_url.is_none());
        assert!(minimal.recovery_hint.is_none());
    }
}
