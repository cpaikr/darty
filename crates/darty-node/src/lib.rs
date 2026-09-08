use std::{
    collections::BTreeMap,
    future::Future,
    panic::AssertUnwindSafe,
    sync::{Mutex, OnceLock},
};

use darty::{
    CompanyDetailRequest, CompanyRssRequest, DartyClient, DartyError, DisclosureTypesRequest,
    ErrorCode, ReportGuideRequest, SearchBodyRequest, SearchCompanyReportsRequest,
    SearchCompanyRequest, ViewReportRequest,
};
use futures_util::FutureExt;
use serde::Serialize;
use serde_json::{Value, json};
use tokio_util::sync::CancellationToken;
#[cfg(feature = "test-fixture")]
use url::Url;

static OPERATIONS: OnceLock<Mutex<BTreeMap<String, CancellationToken>>> = OnceLock::new();

fn operations() -> &'static Mutex<BTreeMap<String, CancellationToken>> {
    OPERATIONS.get_or_init(|| Mutex::new(BTreeMap::new()))
}

#[napi_derive::napi]
pub fn version() -> &'static str {
    env!("CARGO_PKG_VERSION")
}

#[napi_derive::napi]
pub struct NativeDartyClient {
    client: DartyClient,
}

#[napi_derive::napi]
impl NativeDartyClient {
    #[napi_derive::napi(constructor)]
    /// Creates a native client whose operations share one transport gate.
    ///
    /// # Errors
    ///
    /// Returns a Node-API error if the Rust SDK client cannot be initialized.
    pub fn new() -> napi::Result<Self> {
        build_client()
            .map(|client| Self { client })
            .map_err(|error| napi::Error::from_reason(error.message))
    }

    #[napi_derive::napi]
    #[allow(clippy::needless_pass_by_value)]
    /// Registers an operation synchronously before JavaScript attaches cancellation.
    ///
    /// # Errors
    ///
    /// Returns a Node-API error if the registry is unavailable or the identifier
    /// is already registered.
    pub fn register_operation(&self, operation_id: String) -> napi::Result<()> {
        let mut active = operations()
            .lock()
            .map_err(|_| napi::Error::from_reason("The operation registry is unavailable."))?;
        if active
            .insert(operation_id, CancellationToken::new())
            .is_some()
        {
            return Err(napi::Error::from_reason(
                "The operation identifier is already active.",
            ));
        }
        Ok(())
    }

    #[napi_derive::napi]
    #[allow(clippy::needless_pass_by_value)]
    pub fn cancel_operation(&self, operation_id: String) -> bool {
        let token = operations()
            .lock()
            .ok()
            .and_then(|active| active.get(&operation_id).cloned());
        token.is_some_and(|token| {
            token.cancel();
            true
        })
    }

    #[napi_derive::napi]
    /// Runs one supported SDK operation through this client's shared Rust implementation.
    ///
    /// # Errors
    ///
    /// Returns a Node-API error only when the binding registry or outcome
    /// serialization fails. Typed SDK failures are returned inside the JSON outcome.
    pub async fn execute_operation(
        &self,
        operation_id: String,
        operation: String,
        input_json: String,
    ) -> napi::Result<String> {
        let token = operations()
            .lock()
            .map_err(|_| napi::Error::from_reason("The operation registry is unavailable."))?
            .get(&operation_id)
            .cloned()
            .ok_or_else(|| {
                napi::Error::from_reason("The operation identifier is not registered.")
            })?;
        let guard = OperationGuard(operation_id);
        let outcome = resolve_operation(
            token,
            run_operation(self.client.clone(), operation, input_json),
        )
        .await;
        drop(guard);
        serde_json::to_string(&outcome)
            .map_err(|_| napi::Error::from_reason("Failed to serialize the native SDK outcome."))
    }
}

async fn resolve_operation<F>(token: CancellationToken, future: F) -> Value
where
    F: Future<Output = Result<Value, DartyError>>,
{
    let future = AssertUnwindSafe(future).catch_unwind();
    tokio::select! {
        () = token.cancelled() => json!({"cancelled": true}),
        caught = future => match caught {
            Ok(Ok(value)) => json!({"value": value}),
            Ok(Err(error)) => json!({"error": error}),
            Err(_) => json!({"error": internal_error("The native SDK operation panicked.")}),
        }
    }
}

struct OperationGuard(String);

impl Drop for OperationGuard {
    fn drop(&mut self) {
        if let Ok(mut active) = operations().lock() {
            active.remove(&self.0);
        }
    }
}

async fn run_operation(
    client: DartyClient,
    operation: String,
    input_json: String,
) -> Result<Value, DartyError> {
    match operation.as_str() {
        "search-body" => serialize(
            client
                .search_body(parse_input::<SearchBodyRequest>(&input_json, &operation)?)
                .await?,
        ),
        "company-detail" => serialize(
            client
                .company_detail(parse_input::<CompanyDetailRequest>(
                    &input_json,
                    &operation,
                )?)
                .await?,
        ),
        "company-rss" => serialize(
            client
                .company_rss(parse_input::<CompanyRssRequest>(&input_json, &operation)?)
                .await?,
        ),
        "search-company" => {
            let input = parse_input::<SearchCompanyRequest>(&input_json, &operation)?;
            serialize(client.search_company(input).await?)
        }
        "search-company-reports" => {
            let input = parse_input::<SearchCompanyReportsRequest>(&input_json, &operation)?;
            serialize(client.search_company_reports(input).await?)
        }
        "disclosure-types" => serialize(client.disclosure_types(parse_input::<
            DisclosureTypesRequest,
        >(
            &input_json, &operation
        )?)?),
        "report-guide" => serialize(
            client.report_guide(parse_input::<ReportGuideRequest>(&input_json, &operation)?),
        ),
        "view-report" => {
            let input = parse_input::<ViewReportRequest>(&input_json, &operation)?;
            serialize(client.view_report(input).await?)
        }
        _ => Err(invalid_request("Unknown Darty operation.", "operation")),
    }
}

#[cfg(not(feature = "test-fixture"))]
fn build_client() -> Result<DartyClient, DartyError> {
    DartyClient::new()
}

/// Builds the isolated deterministic test addon client.
///
/// This code is not compiled into the production addon. The acceptance test
/// opts into it through the `test-fixture` Cargo feature and builds the addon
/// in a separate target directory. Keeping the environment seam here, rather
/// than in the shipped JavaScript facade, prevents a production package from
/// silently selecting a fixture origin or fixed clock.
#[cfg(feature = "test-fixture")]
fn build_client() -> Result<DartyClient, DartyError> {
    let origin = std::env::var("DARTY_NODE_TEST_FIXTURE_ORIGIN").map_err(|_| {
        invalid_request(
            "The test addon requires DARTY_NODE_TEST_FIXTURE_ORIGIN.",
            "testFixtureOrigin",
        )
    })?;
    let origin = Url::parse(&origin).map_err(|_| {
        invalid_request(
            "DARTY_NODE_TEST_FIXTURE_ORIGIN must be a valid URL.",
            "testFixtureOrigin",
        )
    })?;
    let fetched_at = std::env::var("DARTY_NODE_TEST_FIXTURE_FETCHED_AT")
        .unwrap_or_else(|_| "2026-08-22T00:00:00.000Z".to_owned());
    DartyClient::for_fixture_origin(origin, fetched_at)
}

fn parse_input<T: serde::de::DeserializeOwned>(
    input: &str,
    operation: &str,
) -> Result<T, DartyError> {
    let mut deserializer = serde_json::Deserializer::from_str(input);
    let value = serde_path_to_error::deserialize(&mut deserializer).map_err(|error| {
        let path = error.path().to_string();
        // Missing/unknown struct fields are reported at the containing object.
        // Only take a field identifier from Serde's diagnostic, never a value.
        let diagnostic = error.inner().to_string();
        let field = ["missing field `", "unknown field `"].iter().find_map(|prefix| {
            diagnostic.strip_prefix(prefix).and_then(|tail| tail.split('`').next())
        });
        let parameter = field.unwrap_or_else(|| if path.is_empty() || path == "." { "input" } else { &path });
        let mut failure = invalid_request("Input must match the operation request schema.", parameter);
        failure.recovery_hint = Some(if parameter == "companyCode" {
            "If you only know a company name or 6-digit stock code, first use search-company to find the 8-digit companyCode, then call this operation again.".to_owned()
        } else {
            format!("Check {parameter} against the {operation} request schema and retry.")
        });
        failure
    })?;
    deserializer
        .end()
        .map_err(|_| invalid_request("Input must contain one JSON request object.", "input"))?;
    Ok(value)
}

fn serialize<T: Serialize>(value: T) -> Result<Value, DartyError> {
    serde_json::to_value(value).map_err(|_| internal_error("Failed to serialize the SDK response."))
}

fn invalid_request(message: &str, parameter: &str) -> DartyError {
    DartyError {
        code: ErrorCode::InvalidRequest,
        message: message.to_owned(),
        retryable: false,
        parameter: Some(parameter.to_owned()),
        source_url: None,
        recovery_hint: None,
    }
}

fn internal_error(message: &str) -> DartyError {
    DartyError {
        code: ErrorCode::InternalError,
        message: message.to_owned(),
        retryable: false,
        parameter: None,
        source_url: None,
        recovery_hint: None,
    }
}

#[cfg(test)]
mod tests {
    use super::resolve_operation;
    use tokio_util::sync::CancellationToken;

    #[tokio::test]
    async fn panic_is_contained_as_a_typed_internal_error() {
        let outcome = resolve_operation(CancellationToken::new(), async {
            panic!("binding boundary panic");
        })
        .await;

        assert_eq!(outcome["error"]["code"], "internal_error");
        assert_eq!(
            outcome["error"]["message"],
            "The native SDK operation panicked."
        );
    }
}
