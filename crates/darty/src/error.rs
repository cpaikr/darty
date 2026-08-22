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
