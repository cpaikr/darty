#![cfg(feature = "fixture-origin")]

use std::{
    collections::BTreeMap,
    fmt::Write as _,
    sync::{Arc, Mutex},
    time::{Duration, Instant},
};

use darty::{
    Completeness, DartyClient, ErrorCode, OutputFormat, ResponseDetail,
    SearchCompanyReportsRequest, SearchCompanyRequest, ViewReportRequest,
};
use tokio::{
    io::{AsyncReadExt, AsyncWriteExt},
    net::{TcpListener, TcpStream},
    task::JoinHandle,
};
use url::Url;

const FETCHED_AT: &str = "2026-08-22T00:00:00.000Z";
const COMPANY_BODY: &[u8] =
    include_bytes!("../../../fixtures/dart/vertical-v1/bodies/company-populated.utf8.html");
const COMPANY_EMPTY_BODY: &[u8] =
    include_bytes!("../../../fixtures/dart/vertical-v1/bodies/company-empty.utf8.html");
const COMPANY_PARTIAL_BODY: &[u8] =
    include_bytes!("../../../fixtures/dart/vertical-v1/bodies/company-partial.utf8.html");
const REPORTS_BODY: &[u8] =
    include_bytes!("../../../fixtures/dart/vertical-v1/bodies/reports-populated.utf8.html");
const REPORTS_EMPTY_BODY: &[u8] =
    include_bytes!("../../../fixtures/dart/vertical-v1/bodies/reports-empty.utf8.html");
const SHELL_BODY: &[u8] =
    include_bytes!("../../../fixtures/dart/vertical-v1/bodies/report-shell-toc.utf8.html");
const ATTACHMENT_SHELL_BODY: &[u8] =
    include_bytes!("../../../fixtures/dart/vertical-v1/bodies/report-shell-attachment.utf8.html");
const NO_TOC_SHELL_BODY: &[u8] =
    include_bytes!("../../../fixtures/dart/vertical-v1/bodies/report-shell-no-toc.utf8.html");
const SECTION_BODY: &[u8] =
    include_bytes!("../../../fixtures/dart/vertical-v1/bodies/report-section.utf8.html");
const SECTION_MS949_BODY: &[u8] =
    include_bytes!("../../../fixtures/dart/vertical-v1/bodies/report-section.ms949.bin");
const OVERSIZED_SEED: &[u8] =
    include_bytes!("../../../fixtures/dart/vertical-v1/bodies/oversized-seed.ascii.html");

#[tokio::test]
async fn company_to_section_workflow_uses_exact_wire_and_opaque_ids() {
    let fixture = FixtureServer::spawn(vec![
        Reply::company("가람", COMPANY_BODY),
        Reply::reports("00000001", REPORTS_BODY),
        Reply::shell("20260101000001", None, SHELL_BODY),
        Reply::shell("20260101000001", None, SHELL_BODY),
        Reply::content(
            "20260101000001",
            "10000001",
            "2",
            "200",
            "300",
            "dart4.xsd",
            SECTION_BODY,
            "text/html; charset=UTF-8",
        ),
    ])
    .await;
    let client = fixture.client();

    let companies = client
        .search_company(SearchCompanyRequest::new(" 가람 "))
        .await
        .unwrap();
    assert_eq!(companies.result.request.company_name, "가람");
    assert_eq!(companies.result.items[0].company_code, "00000001");
    assert_eq!(companies.metadata.fetched_at, FETCHED_AT);

    let reports = client
        .search_company_reports(SearchCompanyReportsRequest::new(
            "00000001", "20250101", "20260101",
        ))
        .await
        .unwrap();
    assert_eq!(
        reports.result.items[0].filing.receipt_number,
        "20260101000001"
    );
    assert_eq!(reports.result.request.detail, ResponseDetail::Concise);
    assert_eq!(
        serde_json::to_value(&reports).unwrap()["result"]["request"]["detail"],
        "concise"
    );

    let report = client
        .view_report(ViewReportRequest::new("20260101000001"))
        .await
        .unwrap();
    assert_eq!(report.result.document.id, "document:body:1");
    assert_eq!(report.result.toc.as_ref().unwrap()[0].id, "section:1");
    assert_eq!(
        report.result.toc.as_ref().unwrap()[0].children[0].id,
        "section:1.1"
    );
    assert_eq!(report.result.request.detail, ResponseDetail::Concise);
    assert_eq!(
        serde_json::to_value(&report).unwrap()["result"]["request"]["detail"],
        "concise"
    );
    let serialized = serde_json::to_string(&report).unwrap();
    assert!(!serialized.contains("dcmNo"));
    assert!(!serialized.contains("offset"));
    assert!(!serialized.contains("length"));

    let mut section_request = ViewReportRequest::new("20260101000001");
    section_request.section_id = Some("section:1.1".to_owned());
    let section = client.view_report(section_request).await.unwrap();
    assert!(section.result.documents.is_none());
    assert!(section.result.toc.is_none());
    assert!(
        section
            .result
            .content
            .as_ref()
            .unwrap()
            .body
            .contains("CP949 확장 음절 갂")
    );
    assert_eq!(
        section
            .result
            .navigation
            .as_ref()
            .unwrap()
            .parent
            .as_ref()
            .unwrap()
            .id,
        "section:1"
    );

    fixture.finish().await;
}

#[tokio::test]
async fn invalid_shell_string_decoding_is_a_typed_parse_failure() {
    let malformed = String::from_utf8(SHELL_BODY.to_vec()).unwrap().replace(
        r#"node1['text'] = "I. 회사의 개요";"#,
        r#"node1['text'] = "Invalid \uZZZZ title";"#,
    );
    let fixture = FixtureServer::spawn(vec![Reply::shell(
        "20260101000001",
        None,
        malformed.as_bytes(),
    )])
    .await;

    let error = fixture
        .client()
        .view_report(ViewReportRequest::new("20260101000001"))
        .await
        .unwrap_err();
    assert_eq!(error.code, ErrorCode::SourceParseFailure);
    assert!(!error.retryable);
    assert_eq!(
        error.source_url.as_deref(),
        Some("https://dart.fss.or.kr/dsaf001/main.do")
    );

    fixture.finish().await;
}

#[tokio::test]
async fn empty_partial_and_filter_projection_follow_public_semantics() {
    let all_dropped_companies = String::from_utf8(COMPANY_BODY.to_vec())
        .unwrap()
        .replace("select('00000001')", "select('invalid-1')")
        .replace("select('00000002')", "select('invalid-2')")
        .replace("[1/1] [총 2건]", "[2/3] [총 7건]");
    let all_dropped_reports = String::from_utf8(REPORTS_BODY.to_vec())
        .unwrap()
        .replace("20260101000001", "invalid-receipt")
        .replace("[1/1] [총 1건]", "[2/3] [총 7건]");
    let fixture = FixtureServer::spawn(vec![
        Reply::company_page("빈회사", 7, COMPANY_EMPTY_BODY),
        Reply::company("부분회사", COMPANY_PARTIAL_BODY),
        Reply::company_page("깨진회사", 2, all_dropped_companies.as_bytes()),
        Reply::reports_page("00000003", 3, REPORTS_EMPTY_BODY),
        Reply::reports_page("00000001", 2, all_dropped_reports.as_bytes()),
        Reply::advanced_reports(REPORTS_BODY),
    ])
    .await;
    let client = fixture.client();

    let mut empty_request = SearchCompanyRequest::new("빈회사");
    empty_request.page = 7;
    let empty = client.search_company(empty_request).await.unwrap();
    assert_eq!(empty.result.pagination.current_page, 7);
    assert_eq!(empty.result.pagination.total_pages, 0);
    assert_eq!(empty.warnings[0].code, "no_results");

    let partial = client
        .search_company(SearchCompanyRequest::new("부분회사"))
        .await
        .unwrap();
    assert_eq!(partial.metadata.completeness, Completeness::Partial);
    assert_eq!(partial.metadata.dropped_item_count, 1);

    let mut dropped_company_request = SearchCompanyRequest::new("깨진회사");
    dropped_company_request.page = 2;
    let all_dropped_companies = client
        .search_company(dropped_company_request)
        .await
        .unwrap();
    assert_eq!(all_dropped_companies.result.pagination.current_page, 2);
    assert_eq!(all_dropped_companies.result.pagination.total_pages, 3);
    assert_eq!(all_dropped_companies.result.pagination.total_count, 7);
    assert_eq!(
        all_dropped_companies.metadata.completeness,
        Completeness::Partial
    );
    assert_eq!(all_dropped_companies.metadata.dropped_item_count, 2);
    assert!(
        all_dropped_companies
            .warnings
            .iter()
            .all(|warning| warning.code != "no_results")
    );

    let mut empty_reports_request =
        SearchCompanyReportsRequest::new("00000003", "20250101", "20260101");
    empty_reports_request.page = 3;
    let empty_reports = client
        .search_company_reports(empty_reports_request)
        .await
        .unwrap();
    assert_eq!(empty_reports.result.pagination.current_page, 1);
    assert_eq!(empty_reports.result.pagination.total_pages, 1);
    assert!(
        empty_reports
            .warnings
            .iter()
            .any(|warning| warning.code == "no_results")
    );

    let mut dropped_request = SearchCompanyReportsRequest::new("00000001", "20250101", "20260101");
    dropped_request.page = 2;
    let all_dropped = client
        .search_company_reports(dropped_request)
        .await
        .unwrap();
    assert_eq!(all_dropped.result.pagination.current_page, 2);
    assert_eq!(all_dropped.result.pagination.total_pages, 3);
    assert_eq!(all_dropped.result.pagination.total_count, 7);
    assert_eq!(all_dropped.metadata.completeness, Completeness::Partial);
    assert_eq!(all_dropped.metadata.dropped_item_count, 1);
    assert!(
        all_dropped
            .warnings
            .iter()
            .all(|warning| warning.code != "no_results")
    );

    let mut advanced = SearchCompanyReportsRequest::new("00000001", "20250101", "20260101");
    advanced.report_name = Some(" 연차보고서 ".to_owned());
    advanced.disclosure_types = vec!["A002".to_owned(), "A001".to_owned()];
    advanced.industry_code = "ROOT0001".to_owned();
    advanced.detail = ResponseDetail::Raw;
    let advanced = client.search_company_reports(advanced).await.unwrap();
    assert!(advanced.result.items[0].matched_disclosure_type.is_none());
    assert!(advanced.result.items[0].evidence.is_some());
    assert!(
        advanced
            .warnings
            .iter()
            .any(|warning| warning.code == "matched_disclosure_type_ambiguous")
    );

    fixture.finish().await;
}

#[tokio::test]
async fn no_toc_report_decodes_ms949_and_returns_windowed_document() {
    let fixture = FixtureServer::spawn(vec![
        Reply::shell("20260101000002", None, NO_TOC_SHELL_BODY),
        Reply::content(
            "20260101000002",
            "10000003",
            "0",
            "0",
            "0",
            "HTML",
            SECTION_MS949_BODY,
            "text/html; charset=MS949",
        ),
    ])
    .await;
    let client = fixture.client();
    let mut request = ViewReportRequest::new("20260101000002");
    request.output_format = OutputFormat::Html;
    request.max_bytes = 1_000;
    let response = client.view_report(request).await.unwrap();

    assert_eq!(response.metadata.toc_source, "none");
    assert!(
        response
            .result
            .content
            .as_ref()
            .unwrap()
            .body
            .contains('갂')
    );
    assert!(
        response
            .warnings
            .iter()
            .any(|warning| warning.code == "no_toc_returned_document")
    );
    assert!(response.metadata.source.endpoints.content.is_some());
    fixture.finish().await;
}

#[tokio::test]
async fn public_validation_is_typed_and_does_not_hit_the_network() {
    let fixture = FixtureServer::spawn(Vec::new()).await;
    let client = fixture.client();

    let company_error = client
        .search_company(SearchCompanyRequest::new("x"))
        .await
        .unwrap_err();
    assert_eq!(company_error.code, ErrorCode::InvalidRequest);
    assert_eq!(company_error.parameter.as_deref(), Some("companyName"));

    let report_error = client
        .view_report(ViewReportRequest::new(
            "https://example.invalid/?rcpNo=20260101000001",
        ))
        .await
        .unwrap_err();
    assert_eq!(report_error.code, ErrorCode::InvalidRequest);
    assert_eq!(report_error.parameter.as_deref(), Some("receipt"));
    fixture.finish().await;
}

#[tokio::test]
async fn transport_faults_are_sanitized_and_classified() {
    let fixture = FixtureServer::spawn(vec![
        Reply::company_response(
            "오류회사",
            503,
            Some("text/html; charset=UTF-8"),
            Vec::new(),
        ),
        Reply::company_redirect("이동회사"),
        Reply::company_response(
            "매체회사",
            200,
            Some("application/json; charset=UTF-8"),
            b"{}".to_vec(),
        ),
        Reply::company_response(
            "문자회사",
            200,
            Some("text/html; charset=shift_jis"),
            Vec::new(),
        ),
        Reply::company_response(
            "대형회사",
            200,
            Some("text/html; charset=UTF-8"),
            vec![b'x'; 8 * 1024 * 1024 + 1],
        ),
    ])
    .await;
    let client = fixture.client();

    for company_name in ["오류회사", "이동회사"] {
        let error = client
            .search_company(SearchCompanyRequest::new(company_name))
            .await
            .unwrap_err();
        assert_eq!(error.code, ErrorCode::SourceUnavailable);
        assert!(error.retryable);
        assert!(error.message.contains("DART"));
    }
    for company_name in ["매체회사", "문자회사", "대형회사"] {
        let error = client
            .search_company(SearchCompanyRequest::new(company_name))
            .await
            .unwrap_err();
        assert_eq!(error.code, ErrorCode::SourceParseFailure);
        assert!(!error.retryable);
        assert!(error.message.contains("DART"));
    }
    fixture.finish().await;
}

#[tokio::test]
async fn operation_specific_manifest_caps_reject_cap_plus_one_before_parsing() {
    // These sizes mirror source-oversized-shell and source-oversized-content in
    // fixtures/dart/vertical-v1/manifest.json. The search cap is covered by the
    // transport_faults_are_sanitized_and_classified case above.
    let fixture = FixtureServer::spawn(vec![
        Reply::shell_response("20260101000001", None, 16 * 1024 * 1024 + 1),
        Reply::shell("20260101000001", None, SHELL_BODY),
        Reply::content_response(
            "20260101000001",
            "10000001",
            "2",
            "200",
            "300",
            "dart4.xsd",
            64 * 1024 * 1024 + 1,
        ),
    ])
    .await;
    let client = fixture.client();

    let shell_error = client
        .view_report(ViewReportRequest::new("20260101000001"))
        .await
        .unwrap_err();
    assert_eq!(shell_error.code, ErrorCode::SourceParseFailure);
    assert!(!shell_error.retryable);
    assert_eq!(
        shell_error.source_url.as_deref(),
        Some("https://dart.fss.or.kr/dsaf001/main.do")
    );

    let mut content_request = ViewReportRequest::new("20260101000001");
    content_request.section_id = Some("section:1.1".to_owned());
    let content_error = client.view_report(content_request).await.unwrap_err();
    assert_eq!(content_error.code, ErrorCode::SourceParseFailure);
    assert!(!content_error.retryable);
    assert_eq!(
        content_error.source_url.as_deref(),
        Some("https://dart.fss.or.kr/report/viewer.do")
    );

    fixture.finish().await;
}

#[tokio::test]
async fn transport_deadlines_are_bounded_and_phase_specific() {
    // The manifest's 5/10/30 second values remain the production policy (the
    // exact defaults are asserted in transport.rs). This fixture-only
    // constructor injects millisecond values so each real timeout is exercised
    // without making the integration suite wait 45 seconds. The header-stall
    // fixture accepts the socket first, so it is a request/read failure
    // equivalent, not evidence of a connect-timeout duration.
    let header_fixture = FixtureServer::spawn(vec![
        Reply::company("헤더정지", COMPANY_BODY).stall_before_headers(),
    ])
    .await;
    let header_client = header_fixture.client_with_deadlines(
        Duration::from_millis(40),
        Duration::from_millis(40),
        Duration::from_secs(1),
    );
    let started = Instant::now();
    let header_error = header_client
        .search_company(SearchCompanyRequest::new("헤더정지"))
        .await
        .unwrap_err();
    let header_elapsed = started.elapsed();
    assert_eq!(header_error.code, ErrorCode::SourceUnavailable);
    assert!(header_error.retryable);
    assert_eq!(
        header_error.message,
        "The DART source request failed or timed out."
    );
    assert_eq!(
        header_error.source_url.as_deref(),
        Some("https://dart.fss.or.kr/dsae001/search.ax")
    );
    assert!(header_elapsed >= Duration::from_millis(25));
    assert!(header_elapsed < Duration::from_millis(500));
    header_fixture.finish().await;

    let idle_fixture = FixtureServer::spawn(vec![
        Reply::company("본문정지", COMPANY_BODY).stall_after_body(),
    ])
    .await;
    let idle_client = idle_fixture.client_with_deadlines(
        Duration::from_secs(1),
        Duration::from_millis(40),
        Duration::from_secs(1),
    );
    let started = Instant::now();
    let idle_error = idle_client
        .search_company(SearchCompanyRequest::new("본문정지"))
        .await
        .unwrap_err();
    let idle_elapsed = started.elapsed();
    assert_eq!(idle_error.code, ErrorCode::SourceUnavailable);
    assert!(idle_error.retryable);
    assert_eq!(
        idle_error.message,
        "The DART response body failed or timed out while streaming."
    );
    assert_eq!(
        idle_error.source_url.as_deref(),
        Some("https://dart.fss.or.kr/dsae001/search.ax")
    );
    assert!(idle_elapsed >= Duration::from_millis(25));
    assert!(idle_elapsed < Duration::from_millis(500));
    idle_fixture.finish().await;

    let total_fixture =
        FixtureServer::spawn(vec![Reply::company("전체정지", COMPANY_BODY).drip_body()]).await;
    let total_client = total_fixture.client_with_deadlines(
        Duration::from_secs(1),
        Duration::from_secs(1),
        Duration::from_millis(140),
    );
    let started = Instant::now();
    let total_error = total_client
        .search_company(SearchCompanyRequest::new("전체정지"))
        .await
        .unwrap_err();
    let total_elapsed = started.elapsed();
    assert_eq!(total_error.code, ErrorCode::SourceUnavailable);
    assert!(total_error.retryable);
    assert_eq!(
        total_error.message,
        "The DART response body failed or timed out while streaming."
    );
    assert_eq!(
        total_error.source_url.as_deref(),
        Some("https://dart.fss.or.kr/dsae001/search.ax")
    );
    assert!(total_elapsed >= Duration::from_millis(110));
    assert!(total_elapsed < Duration::from_millis(500));
    total_fixture.finish().await;
}

#[tokio::test]
async fn refused_loopback_connect_is_a_source_failure_without_a_timing_claim() {
    // A listener that accepts and delays headers cannot prove a connect
    // deadline: TCP connection establishment has already succeeded. Port 0
    // provides the deterministic refusal path that this fixture seam can
    // safely exercise without relying on wall-clock thresholds.
    let client = DartyClient::for_fixture_origin_with_deadlines(
        Url::parse("http://127.0.0.1:0/").unwrap(),
        FETCHED_AT,
        Duration::from_secs(5),
        Duration::from_secs(10),
        Duration::from_secs(30),
    )
    .unwrap();
    let error = client
        .search_company(SearchCompanyRequest::new("가람"))
        .await
        .unwrap_err();
    assert_eq!(error.code, ErrorCode::SourceUnavailable);
    assert!(error.retryable);
    assert_eq!(
        error.source_url.as_deref(),
        Some("https://dart.fss.or.kr/dsae001/search.ax")
    );
}

#[tokio::test]
async fn content_failures_expose_only_the_canonical_endpoint() {
    let fixture = FixtureServer::spawn(vec![
        Reply::shell("20260101000002", None, NO_TOC_SHELL_BODY),
        Reply::content(
            "20260101000002",
            "10000003",
            "0",
            "0",
            "0",
            "HTML",
            &[],
            "text/html; charset=UTF-8",
        )
        .with_status(503),
    ])
    .await;
    let error = fixture
        .client()
        .view_report(ViewReportRequest::new("20260101000002"))
        .await
        .unwrap_err();
    assert_eq!(error.code, ErrorCode::SourceUnavailable);
    assert_eq!(
        error.source_url.as_deref(),
        Some("https://dart.fss.or.kr/report/viewer.do")
    );
    fixture.finish().await;
}

#[tokio::test]
async fn requested_document_must_be_selected_after_shell_refetch() {
    let fixture = FixtureServer::spawn(vec![
        Reply::shell("20260101000001", None, SHELL_BODY),
        Reply::shell("20260101000001", Some("10000002"), SHELL_BODY),
    ])
    .await;
    let mut request = ViewReportRequest::new("20260101000001");
    request.document_id = Some("document:attachment:1".to_owned());
    let error = fixture.client().view_report(request).await.unwrap_err();
    assert_eq!(error.code, ErrorCode::SourceChanged);
    assert_eq!(
        error.source_url.as_deref(),
        Some("https://dart.fss.or.kr/dsaf001/main.do")
    );
    fixture.finish().await;
}

#[tokio::test]
async fn requested_document_must_keep_its_upstream_identity_after_refetch() {
    let changed_attachment = String::from_utf8(ATTACHMENT_SHELL_BODY.to_vec())
        .unwrap()
        .replace("10000002", "10000009");
    let fixture = FixtureServer::spawn(vec![
        Reply::shell("20260101000001", None, SHELL_BODY),
        Reply::shell(
            "20260101000001",
            Some("10000002"),
            changed_attachment.as_bytes(),
        ),
    ])
    .await;
    let mut request = ViewReportRequest::new("20260101000001");
    request.document_id = Some("document:attachment:1".to_owned());
    let error = fixture.client().view_report(request).await.unwrap_err();
    assert_eq!(error.code, ErrorCode::SourceChanged);
    fixture.finish().await;
}

#[tokio::test]
async fn selected_attachment_reference_reopens_the_selected_document() {
    let fixture = FixtureServer::spawn(vec![
        Reply::shell("20260101000001", None, SHELL_BODY),
        Reply::shell("20260101000001", Some("10000002"), ATTACHMENT_SHELL_BODY),
    ])
    .await;
    let mut request = ViewReportRequest::new("20260101000001");
    request.document_id = Some("document:attachment:1".to_owned());
    let response = fixture.client().view_report(request).await.unwrap();
    assert_eq!(response.result.document.id, "document:attachment:1");
    assert_eq!(
        response.references.viewer_url,
        "https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260101000001&dcmNo=10000002"
    );
    fixture.finish().await;
}

#[tokio::test]
async fn receipt_url_document_number_must_be_selected_by_dart() {
    let fixture = FixtureServer::spawn(vec![Reply::shell(
        "20260101000001",
        Some("10000002"),
        SHELL_BODY,
    )])
    .await;
    let error = fixture
        .client()
        .view_report(ViewReportRequest::new(
            "https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260101000001&dcmNo=10000002",
        ))
        .await
        .unwrap_err();
    assert_eq!(error.code, ErrorCode::SourceChanged);
    fixture.finish().await;
}

#[tokio::test]
async fn receipt_url_document_number_can_match_the_main_body_locator() {
    let fixture = FixtureServer::spawn(vec![Reply::shell(
        "20260101000001",
        Some("10000001"),
        SHELL_BODY,
    )])
    .await;
    let response = fixture
        .client()
        .view_report(ViewReportRequest::new(
            "https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260101000001&dcmNo=10000001",
        ))
        .await
        .unwrap();
    assert_eq!(response.result.document.id, "document:body:1");
    fixture.finish().await;
}

#[tokio::test]
async fn client_serializes_in_flight_requests() {
    let fixture = FixtureServer::spawn(vec![
        Reply::company("가람", COMPANY_BODY).delayed(Duration::from_millis(350)),
        Reply::company("가람", COMPANY_BODY),
    ])
    .await;
    let arrivals = fixture.arrivals();
    let first_client = fixture.client();
    let second_client = first_client.clone();
    let first = tokio::spawn(async move {
        first_client
            .search_company(SearchCompanyRequest::new("가람"))
            .await
    });
    wait_for_arrivals(&arrivals, 1).await;
    let second = tokio::spawn(async move {
        second_client
            .search_company(SearchCompanyRequest::new("가람"))
            .await
    });
    first.await.unwrap().unwrap();
    second.await.unwrap().unwrap();
    let times = arrivals.lock().unwrap().clone();
    assert!(times[1].duration_since(times[0]) >= Duration::from_millis(325));
    fixture.finish().await;
}

#[tokio::test]
async fn client_spaces_fast_request_starts_by_at_least_250_milliseconds() {
    let fixture = FixtureServer::spawn(vec![
        Reply::company("가람", COMPANY_BODY),
        Reply::company("가람", COMPANY_BODY),
    ])
    .await;
    let arrivals = fixture.arrivals();
    let client = fixture.client();
    let first = client
        .search_company(SearchCompanyRequest::new("가람"))
        .await;
    let second = client
        .search_company(SearchCompanyRequest::new("가람"))
        .await;
    first.unwrap();
    second.unwrap();
    let times = arrivals.lock().unwrap().clone();
    assert!(times[1].duration_since(times[0]) >= Duration::from_millis(240));
    fixture.finish().await;
}

#[tokio::test]
async fn cancelled_gate_waiter_does_not_block_the_next_request() {
    let fixture = FixtureServer::spawn(vec![
        Reply::company("가람", COMPANY_BODY).delayed(Duration::from_millis(350)),
        Reply::company("가람", COMPANY_BODY),
    ])
    .await;
    let arrivals = fixture.arrivals();
    let client = fixture.client();
    let first_client = client.clone();
    let first = tokio::spawn(async move {
        first_client
            .search_company(SearchCompanyRequest::new("가람"))
            .await
    });
    wait_for_arrivals(&arrivals, 1).await;

    let cancelled_client = client.clone();
    let cancelled = tokio::spawn(async move {
        cancelled_client
            .search_company(SearchCompanyRequest::new("가람"))
            .await
    });
    tokio::task::yield_now().await;
    let final_request = tokio::spawn(async move {
        client
            .search_company(SearchCompanyRequest::new("가람"))
            .await
    });
    tokio::time::sleep(Duration::from_millis(25)).await;
    cancelled.abort();

    first.await.unwrap().unwrap();
    final_request.await.unwrap().unwrap();
    assert!(cancelled.await.unwrap_err().is_cancelled());
    let times = arrivals.lock().unwrap().clone();
    assert_eq!(times.len(), 2);
    assert!(times[1].duration_since(times[0]) >= Duration::from_millis(325));
    fixture.finish().await;
}

#[tokio::test]
async fn cancelled_in_flight_request_allows_a_following_request_to_progress() {
    let fixture = FixtureServer::spawn_concurrent(vec![
        Reply::company("가람", COMPANY_BODY).delayed(Duration::from_millis(750)),
        Reply::company("가람", COMPANY_BODY),
    ])
    .await;
    let arrivals = fixture.arrivals();
    let client = fixture.client();
    let cancelled_client = client.clone();
    let in_flight = tokio::spawn(async move {
        cancelled_client
            .search_company(SearchCompanyRequest::new("가람"))
            .await
    });
    wait_for_arrivals(&arrivals, 1).await;

    let cancelled_at = Instant::now();
    in_flight.abort();
    assert!(in_flight.await.unwrap_err().is_cancelled());

    let next = tokio::time::timeout(
        Duration::from_millis(1_000),
        client.search_company(SearchCompanyRequest::new("가람")),
    )
    .await
    .expect("the request after cancellation should not remain queued")
    .unwrap();
    assert_eq!(next.result.items[0].company_code, "00000001");
    assert!(cancelled_at.elapsed() < Duration::from_millis(1_000));
    assert_eq!(arrivals.lock().unwrap().len(), 2);

    fixture.finish().await;
}

async fn wait_for_arrivals(arrivals: &Arc<Mutex<Vec<Instant>>>, expected: usize) {
    tokio::time::timeout(Duration::from_secs(1), async {
        loop {
            if arrivals.lock().unwrap().len() >= expected {
                return;
            }
            tokio::task::yield_now().await;
        }
    })
    .await
    .expect("fixture request did not arrive");
}

struct FixtureServer {
    origin: Url,
    arrivals: Arc<Mutex<Vec<Instant>>>,
    task: JoinHandle<()>,
}

impl FixtureServer {
    async fn spawn(replies: Vec<Reply>) -> Self {
        Self::spawn_mode(replies, false).await
    }

    async fn spawn_concurrent(replies: Vec<Reply>) -> Self {
        Self::spawn_mode(replies, true).await
    }

    async fn spawn_mode(replies: Vec<Reply>, concurrent: bool) -> Self {
        let listener = TcpListener::bind(("127.0.0.1", 0)).await.unwrap();
        let address = listener.local_addr().unwrap();
        let arrivals = Arc::new(Mutex::new(Vec::new()));
        let recorded_arrivals = Arc::clone(&arrivals);
        let task = tokio::spawn(async move {
            if concurrent {
                let mut servers = Vec::with_capacity(replies.len());
                for reply in replies {
                    let (stream, _) = listener.accept().await.unwrap();
                    recorded_arrivals.lock().unwrap().push(Instant::now());
                    servers.push(tokio::spawn(reply.serve(stream)));
                }
                for server in servers {
                    server.await.unwrap();
                }
            } else {
                for reply in replies {
                    let (stream, _) = listener.accept().await.unwrap();
                    recorded_arrivals.lock().unwrap().push(Instant::now());
                    reply.serve(stream).await;
                }
            }
        });
        Self {
            origin: Url::parse(&format!("http://{address}/")).unwrap(),
            arrivals,
            task,
        }
    }

    fn client(&self) -> DartyClient {
        DartyClient::for_fixture_origin(self.origin.clone(), FETCHED_AT).unwrap()
    }

    fn client_with_deadlines(
        &self,
        connect_timeout: Duration,
        read_timeout: Duration,
        total_timeout: Duration,
    ) -> DartyClient {
        DartyClient::for_fixture_origin_with_deadlines(
            self.origin.clone(),
            FETCHED_AT,
            connect_timeout,
            read_timeout,
            total_timeout,
        )
        .unwrap()
    }

    fn arrivals(&self) -> Arc<Mutex<Vec<Instant>>> {
        Arc::clone(&self.arrivals)
    }

    async fn finish(self) {
        tokio::time::timeout(Duration::from_secs(10), self.task)
            .await
            .expect("fixture server did not finish")
            .unwrap();
    }
}

struct Reply {
    method: &'static str,
    path: &'static str,
    query: Vec<(&'static str, &'static str)>,
    form: Vec<(&'static str, String)>,
    status: u16,
    body: Vec<u8>,
    content_type: Option<&'static str>,
    extra_headers: Vec<(&'static str, &'static str)>,
    response_delay: Duration,
    stall_before_headers: bool,
    stall_after_body: bool,
    drip_body: bool,
}

impl Reply {
    fn company(company_name: &str, body: &'static [u8]) -> Self {
        Self::company_page(company_name, 1, body)
    }

    fn company_page(company_name: &str, page: u32, body: &[u8]) -> Self {
        Self {
            method: "POST",
            path: "/dsae001/search.ax",
            query: Vec::new(),
            form: company_form(company_name, page),
            status: 200,
            body: body.to_vec(),
            content_type: Some("text/html; charset=UTF-8"),
            extra_headers: Vec::new(),
            response_delay: Duration::ZERO,
            stall_before_headers: false,
            stall_after_body: false,
            drip_body: false,
        }
    }

    fn company_response(
        company_name: &str,
        status: u16,
        content_type: Option<&'static str>,
        body: Vec<u8>,
    ) -> Self {
        let mut reply = Self::company(company_name, &[]);
        reply.status = status;
        reply.content_type = content_type;
        reply.body = body;
        reply
    }

    fn company_redirect(company_name: &str) -> Self {
        let mut reply = Self::company_response(company_name, 302, None, Vec::new());
        reply
            .extra_headers
            .push(("Location", "https://example.invalid/outside-dart"));
        reply
    }

    fn shell_response(receipt: &'static str, document: Option<&'static str>, bytes: usize) -> Self {
        let mut reply = Self::shell(receipt, document, &[]);
        reply.body = repeated_fixture_body(bytes);
        reply
    }

    fn delayed(mut self, duration: Duration) -> Self {
        self.response_delay = duration;
        self
    }

    fn stall_before_headers(mut self) -> Self {
        self.stall_before_headers = true;
        self
    }

    fn stall_after_body(mut self) -> Self {
        self.stall_after_body = true;
        self
    }

    fn drip_body(mut self) -> Self {
        self.drip_body = true;
        self.body = vec![b'x'; 256];
        self
    }

    fn with_status(mut self, status: u16) -> Self {
        self.status = status;
        self
    }

    fn reports(company_code: &str, body: &'static [u8]) -> Self {
        Self::reports_page(company_code, 1, body)
    }

    fn reports_page(company_code: &str, page: u32, body: &[u8]) -> Self {
        let mut form = reports_form(company_code, "", &[], "all");
        form.iter_mut()
            .find(|(name, _)| *name == "currentPage")
            .expect("reports form has currentPage")
            .1 = page.to_string();
        Self {
            method: "POST",
            path: "/dsab007/detailSearch.ax",
            query: Vec::new(),
            form,
            status: 200,
            body: body.to_owned(),
            content_type: Some("text/html; charset=UTF-8"),
            extra_headers: Vec::new(),
            response_delay: Duration::ZERO,
            stall_before_headers: false,
            stall_after_body: false,
            drip_body: false,
        }
    }

    fn advanced_reports(body: &'static [u8]) -> Self {
        Self {
            method: "POST",
            path: "/dsab007/detailSearch.ax",
            query: Vec::new(),
            form: reports_form("00000001", "연차보고서", &["A001", "A002"], "ROOT0001"),
            status: 200,
            body: body.to_vec(),
            content_type: Some("text/html; charset=UTF-8"),
            extra_headers: Vec::new(),
            response_delay: Duration::ZERO,
            stall_before_headers: false,
            stall_after_body: false,
            drip_body: false,
        }
    }

    fn shell(receipt: &'static str, document: Option<&'static str>, body: &[u8]) -> Self {
        let mut query = vec![("rcpNo", receipt)];
        if let Some(document) = document {
            query.push(("dcmNo", document));
        }
        Self {
            method: "GET",
            path: "/dsaf001/main.do",
            query,
            form: Vec::new(),
            status: 200,
            body: body.to_vec(),
            content_type: Some("text/html; charset=UTF-8"),
            extra_headers: Vec::new(),
            response_delay: Duration::ZERO,
            stall_before_headers: false,
            stall_after_body: false,
            drip_body: false,
        }
    }

    #[allow(clippy::too_many_arguments)]
    fn content(
        receipt: &'static str,
        document: &'static str,
        element: &'static str,
        offset: &'static str,
        length: &'static str,
        dtd: &'static str,
        body: &'static [u8],
        content_type: &'static str,
    ) -> Self {
        Self {
            method: "GET",
            path: "/report/viewer.do",
            query: vec![
                ("rcpNo", receipt),
                ("dcmNo", document),
                ("eleId", element),
                ("offset", offset),
                ("length", length),
                ("dtd", dtd),
            ],
            form: Vec::new(),
            status: 200,
            body: body.to_vec(),
            content_type: Some(content_type),
            extra_headers: Vec::new(),
            response_delay: Duration::ZERO,
            stall_before_headers: false,
            stall_after_body: false,
            drip_body: false,
        }
    }

    #[allow(clippy::too_many_arguments)]
    fn content_response(
        receipt: &'static str,
        document: &'static str,
        element: &'static str,
        offset: &'static str,
        length: &'static str,
        dtd: &'static str,
        bytes: usize,
    ) -> Self {
        let mut reply = Self::content(
            receipt,
            document,
            element,
            offset,
            length,
            dtd,
            &[],
            "text/html; charset=UTF-8",
        );
        reply.body = repeated_fixture_body(bytes);
        reply
    }

    async fn serve(self, mut stream: TcpStream) {
        let request = read_request(&mut stream).await;
        let expected_target = if self.query.is_empty() {
            self.path.to_owned()
        } else {
            let mut url = Url::parse("http://fixture.invalid").unwrap();
            url.set_path(self.path);
            url.query_pairs_mut()
                .extend_pairs(self.query.iter().copied());
            format!("{}?{}", url.path(), url.query().unwrap())
        };
        assert_eq!(request.method, self.method);
        assert_eq!(request.target, expected_target);
        assert_eq!(
            request.headers.get("user-agent").map(String::as_str),
            Some(concat!(
                "darty/",
                env!("CARGO_PKG_VERSION"),
                " (+https://github.com/cpaikr/darty)"
            ))
        );
        if self.method == "POST" {
            assert_eq!(
                request.headers.get("content-type").map(String::as_str),
                Some("application/x-www-form-urlencoded; charset=UTF-8")
            );
            assert_eq!(form_map(&request.body), pair_map(&self.form));
            let expected_referer = match self.path {
                "/dsae001/search.ax" => Some("https://dart.fss.or.kr/dsae001/main.do"),
                "/dsab007/detailSearch.ax" => {
                    Some("https://dart.fss.or.kr/dsab007/main.do?option=corp")
                }
                "/dsab007/search.ax" => None,
                _ => panic!("unexpected fixture POST path"),
            };
            assert_eq!(
                request.headers.get("referer").map(String::as_str),
                expected_referer
            );
        }

        if self.path == "/dsae001/select.ax" {
            assert_eq!(
                request.headers.get("referer").map(String::as_str),
                Some("https://dart.fss.or.kr/dsae001/main.do")
            );
        }
        tokio::time::sleep(self.response_delay).await;

        if self.stall_before_headers {
            wait_for_client_close(&mut stream).await;
            return;
        }

        let mut head = format!("HTTP/1.1 {} Fixture\r\n", self.status);
        if let Some(content_type) = self.content_type {
            write!(head, "Content-Type: {content_type}\r\n")
                .expect("writing to a string cannot fail");
        }
        for (name, value) in self.extra_headers {
            write!(head, "{name}: {value}\r\n").expect("writing to a string cannot fail");
        }
        write!(
            head,
            "Content-Length: {}\r\nConnection: close\r\n\r\n",
            self.body.len()
        )
        .expect("writing to a string cannot fail");
        if stream.write_all(head.as_bytes()).await.is_err() {
            return;
        }
        if self.stall_after_body {
            if let Some(first) = self.body.first()
                && stream.write_all(std::slice::from_ref(first)).await.is_err()
            {
                return;
            }
            wait_for_client_close(&mut stream).await;
            return;
        }
        if self.drip_body {
            for byte in &self.body {
                if stream.write_all(std::slice::from_ref(byte)).await.is_err() {
                    return;
                }
                tokio::time::sleep(Duration::from_millis(10)).await;
            }
        } else if stream.write_all(&self.body).await.is_err() {
            return;
        }
        let _ = stream.shutdown().await;
    }
}

async fn wait_for_client_close(stream: &mut TcpStream) {
    let mut byte = [0_u8; 1];
    let _ = tokio::time::timeout(Duration::from_secs(1), stream.read(&mut byte)).await;
}

struct CapturedRequest {
    method: String,
    target: String,
    headers: BTreeMap<String, String>,
    body: Vec<u8>,
}

async fn read_request(stream: &mut TcpStream) -> CapturedRequest {
    let mut bytes = Vec::new();
    let header_end = loop {
        let mut chunk = [0_u8; 4096];
        let read = stream.read(&mut chunk).await.unwrap();
        assert!(read > 0, "connection ended before HTTP headers");
        bytes.extend_from_slice(&chunk[..read]);
        if let Some(index) = bytes.windows(4).position(|window| window == b"\r\n\r\n") {
            break index + 4;
        }
    };
    let header_text = std::str::from_utf8(&bytes[..header_end]).unwrap();
    let mut lines = header_text.split("\r\n");
    let mut request_line = lines.next().unwrap().split_whitespace();
    let method = request_line.next().unwrap().to_owned();
    let target = request_line.next().unwrap().to_owned();
    let headers = lines
        .filter_map(|line| line.split_once(':'))
        .map(|(name, value)| (name.to_ascii_lowercase(), value.trim().to_owned()))
        .collect::<BTreeMap<_, _>>();
    let content_length = headers
        .get("content-length")
        .map_or(0, |value| value.parse::<usize>().unwrap());
    while bytes.len() < header_end + content_length {
        let mut chunk = [0_u8; 4096];
        let read = stream.read(&mut chunk).await.unwrap();
        assert!(read > 0, "connection ended before HTTP body");
        bytes.extend_from_slice(&chunk[..read]);
    }
    CapturedRequest {
        method,
        target,
        headers,
        body: bytes[header_end..header_end + content_length].to_vec(),
    }
}

fn repeated_fixture_body(bytes: usize) -> Vec<u8> {
    let mut body = Vec::with_capacity(bytes);
    while body.len() < bytes {
        let remaining = bytes - body.len();
        body.extend_from_slice(&OVERSIZED_SEED[..remaining.min(OVERSIZED_SEED.len())]);
    }
    body
}

fn pair_map(pairs: &[(&str, String)]) -> BTreeMap<String, Vec<String>> {
    let mut fields = BTreeMap::<String, Vec<String>>::new();
    for (name, value) in pairs {
        fields
            .entry((*name).to_owned())
            .or_default()
            .push(value.clone());
    }
    fields
}

fn form_map(body: &[u8]) -> BTreeMap<String, Vec<String>> {
    let pairs = url::form_urlencoded::parse(body)
        .map(|(name, value)| (name.into_owned(), value.into_owned()))
        .collect::<Vec<_>>();
    let borrowed = pairs
        .iter()
        .map(|(name, value)| (name.as_str(), value.clone()))
        .collect::<Vec<_>>();
    pair_map(&borrowed)
}

fn company_form(company_name: &str, page: u32) -> Vec<(&'static str, String)> {
    let mut fields = vec![
        ("currentPage", page.to_string()),
        ("maxResults", "15".to_owned()),
        ("maxLinks", "10".to_owned()),
        ("sort", String::new()),
        ("series", String::new()),
        ("gubun", String::new()),
        ("selectKey", String::new()),
        ("searchIndex", String::new()),
        ("textCrpCik", String::new()),
        ("autoSearch", "true".to_owned()),
        ("businessCode", "all".to_owned()),
        ("bsnRgsNo", String::new()),
        ("corpTypeAll", "all".to_owned()),
        ("autoSearchCorp", "Y".to_owned()),
        ("searchType", "1".to_owned()),
        ("textCrpNm", company_name.to_owned()),
        ("bsnRgsNo_1", String::new()),
        ("bsnRgsNo_2", String::new()),
        ("bsnRgsNo_3", String::new()),
        ("crpRgsNo", String::new()),
    ];
    for value in ["P", "A", "X", "E"] {
        fields.push(("corpType", value.to_owned()));
    }
    fields
}

fn reports_form(
    company_code: &str,
    report_name: &str,
    public_types: &[&str],
    business_code: &str,
) -> Vec<(&'static str, String)> {
    let mut fields = vec![
        ("currentPage", "1".to_owned()),
        ("maxResults", "15".to_owned()),
        ("maxLinks", "10".to_owned()),
        ("sort", "date".to_owned()),
        ("series", "desc".to_owned()),
        ("option", "corp".to_owned()),
        ("textCrpNm", String::new()),
        ("textCrpNm2", String::new()),
        ("textCrpCik", company_code.to_owned()),
        ("textPresenterNm", String::new()),
        ("reportName", report_name.to_owned()),
        ("reportName2", report_name.to_owned()),
    ];
    for public_type in public_types {
        fields.push(("publicType", (*public_type).to_owned()));
    }
    fields.extend([
        ("startDate", "20250101".to_owned()),
        ("endDate", "20260101".to_owned()),
        ("finalReport", "recent".to_owned()),
        ("businessCode", business_code.to_owned()),
        (
            "businessNm",
            if business_code == "all" { "전체" } else { "" }.to_owned(),
        ),
        ("corporationType", "all".to_owned()),
        ("closingAccountsMonth", "all".to_owned()),
        ("autoSearch", "N".to_owned()),
        ("autoSearchCorp", "Y".to_owned()),
    ]);
    fields
}

static PARITY: std::sync::LazyLock<serde_json::Value> = std::sync::LazyLock::new(|| {
    serde_json::from_str(include_str!(
        "../../../fixtures/dart/parity-v1/manifest.json"
    ))
    .unwrap()
});

#[tokio::test]
async fn full_parity_corpus_checks_exact_requests_and_source_outcomes() {
    for case in PARITY["cases"].as_array().unwrap() {
        let reply = parity_reply(case);
        let fixture = FixtureServer::spawn(vec![reply]).await;
        let client = fixture.client();
        let outcome = execute_parity(&client, case).await;
        if case["expected"]["kind"] == "failure" {
            let error = outcome.unwrap_err();
            assert_eq!(
                serde_json::to_value(error.code).unwrap(),
                case["expected"]["code"],
                "{}",
                case["id"]
            );
            assert_eq!(
                serde_json::Value::Bool(error.retryable),
                case["expected"]["retryable"],
                "{}",
                case["id"]
            );
        } else {
            let outcome = outcome.unwrap_or_else(|error| panic!("{}: {error:?}", case["id"]));
            assert_parity_result(&outcome, case);
        }
        fixture.finish().await;
    }
}

fn parity_reply(case: &'static serde_json::Value) -> Reply {
    let request = &case["request"];
    let response = &case["response"];
    let mut reply = Reply::company("", &[]);
    reply.method = request["method"].as_str().unwrap();
    reply.path = request["path"].as_str().unwrap();
    reply.query = request["query"]
        .as_object()
        .unwrap()
        .iter()
        .map(|(key, value)| (key.as_str(), value.as_str().unwrap()))
        .collect();
    reply.form = request["form"]
        .as_object()
        .unwrap()
        .iter()
        .map(|(key, value)| (key.as_str(), value.as_str().unwrap().to_owned()))
        .collect();
    reply.content_type = Some(response["contentType"].as_str().unwrap());
    reply.body = std::fs::read(
        std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("../../fixtures/dart/parity-v1")
            .join(response["bodyPath"].as_str().unwrap()),
    )
    .unwrap();
    reply
}

async fn execute_parity(
    client: &DartyClient,
    case: &serde_json::Value,
) -> Result<serde_json::Value, darty::DartyError> {
    let form = &case["request"]["form"];
    let query = &case["request"]["query"];
    match case["operationId"].as_str().unwrap() {
        "searchBodyFragment" => {
            let mut request = darty::SearchBodyRequest::new(
                form["keyword"].as_str().unwrap(),
                form["startDate"].as_str().unwrap(),
                form["endDate"].as_str().unwrap(),
            );
            request.page = form["currentPage"].as_str().unwrap().parse().unwrap();
            request.sort_by = if form["sort"] == "rpt_nm" {
                darty::BodySortBy::ReportName
            } else {
                darty::BodySortBy::Date
            };
            request.sort_direction = if form["sortType"] == "asc" {
                darty::SortDirection::Asc
            } else {
                darty::SortDirection::Desc
            };
            request.company_code = nonempty_json(&form["textCrpCik"]);
            request.presenter_name = nonempty_json(&form["textPresenterNm"]);
            request.report_name = nonempty_json(&form["reportName"]);
            request.detail = ResponseDetail::Raw;
            client
                .search_body(request)
                .await
                .map(|result| serde_json::to_value(result).unwrap())
        }
        "fetchCompanyDetail" => client
            .company_detail(darty::CompanyDetailRequest::new(
                query["selectKey"].as_str().unwrap(),
            ))
            .await
            .map(|result| serde_json::to_value(result).unwrap()),
        "fetchCompanyRss" => {
            let mut request = darty::CompanyRssRequest::new(query["crpCd"].as_str().unwrap());
            request.detail = ResponseDetail::Raw;
            client
                .company_rss(request)
                .await
                .map(|result| serde_json::to_value(result).unwrap())
        }
        other => panic!("unknown fixture operation {other}"),
    }
}

fn nonempty_json(value: &serde_json::Value) -> Option<String> {
    value
        .as_str()
        .filter(|value| !value.is_empty())
        .map(str::to_owned)
}

fn assert_subset(actual: &serde_json::Value, expected: &serde_json::Value) {
    if let Some(fields) = expected.as_object() {
        for (key, value) in fields {
            assert_subset(&actual[key], value);
        }
    } else {
        assert_eq!(actual, expected);
    }
}

fn assert_omitted(
    actual: &serde_json::Value,
    omitted: &serde_json::Value,
    case: &serde_json::Value,
) {
    for field in omitted.as_array().map(Vec::as_slice).unwrap_or_default() {
        let key = field.as_str().unwrap();
        assert!(
            actual.get(key).is_none(),
            "{}: {key} must be omitted",
            case["id"]
        );
    }
}

fn assert_parity_result(outcome: &serde_json::Value, case: &serde_json::Value) {
    let expected = &case["expected"];
    let result = &outcome["result"];
    match case["operationId"].as_str().unwrap() {
        "searchBodyFragment" => {
            assert_subset(&result["pagination"], &expected["pagination"]);
            assert_eq!(
                outcome["metadata"]["droppedItemCount"],
                expected["droppedRows"]
            );
            if let Some(first) = expected["first"].as_object() {
                let item = &result["items"][0];
                for (key, value) in first {
                    let actual = match key.as_str() {
                        "companyName" => &item["company"]["name"],
                        "companyCode" => &item["company"]["companyCode"],
                        "snippetText" => &item["match"][key],
                        "snippetHtml" => &item["evidence"][key],
                        "viewerUrl" => &item["references"][key],
                        _ => &item["filing"][key],
                    };
                    assert_eq!(actual, value, "{}: {key}", case["id"]);
                }
            }
        }
        "fetchCompanyDetail" => {
            assert_subset(&result["company"], &expected["company"]);
            assert_omitted(&result["company"], &expected["omittedCompanyFields"], case);
        }
        "fetchCompanyRss" => {
            if let Some(channel) = expected.get("channel") {
                assert_subset(&result["channel"], channel);
            }
            assert_eq!(
                result["items"].as_array().unwrap().len(),
                usize::try_from(expected["items"].as_u64().unwrap()).unwrap()
            );
            if expected.get("first").is_some() {
                assert_subset(&result["items"][0], &expected["first"]);
                assert_omitted(&result["items"][0], &expected["omittedItemFields"], case);
            }
        }
        _ => unreachable!(),
    }
}

#[tokio::test]
async fn parity_operations_share_transport_fault_bounds_and_sanitized_errors() {
    for id in ["body-populated", "detail-populated", "rss-populated"] {
        let case = PARITY["cases"]
            .as_array()
            .unwrap()
            .iter()
            .find(|case| case["id"] == id)
            .unwrap();
        for fault in ["http", "redirect", "media", "charset", "size", "idle"] {
            let mut reply = parity_reply(case);
            let expected_code = match fault {
                "http" => {
                    reply.status = 503;
                    reply.body.clear();
                    ErrorCode::SourceUnavailable
                }
                "redirect" => {
                    reply.status = 302;
                    reply.extra_headers.push((
                        "Location",
                        "https://example.invalid/private?secret=never-leak",
                    ));
                    ErrorCode::SourceUnavailable
                }
                "media" => {
                    reply.content_type = Some("application/json");
                    ErrorCode::SourceParseFailure
                }
                "charset" => {
                    reply.content_type = Some("text/html; charset=shift_jis");
                    ErrorCode::SourceParseFailure
                }
                "size" => {
                    reply.body = vec![b' '; 8 * 1024 * 1024 + 1];
                    ErrorCode::SourceParseFailure
                }
                "idle" => {
                    reply.stall_after_body = true;
                    ErrorCode::SourceUnavailable
                }
                _ => unreachable!(),
            };
            let fixture = FixtureServer::spawn(vec![reply]).await;
            let client = fixture.client_with_deadlines(
                Duration::from_millis(50),
                Duration::from_millis(50),
                Duration::from_secs(1),
            );
            let error = execute_parity(&client, case).await.unwrap_err();
            assert_eq!(error.code, expected_code, "{id}/{fault}");
            assert_eq!(
                error.retryable,
                expected_code == ErrorCode::SourceUnavailable
            );
            assert_eq!(
                error.source_url,
                Some(format!(
                    "https://dart.fss.or.kr{}",
                    case["request"]["path"].as_str().unwrap()
                ))
            );
            let serialized = serde_json::to_string(&error).unwrap();
            assert!(!serialized.contains("127.0.0.1"));
            assert!(!serialized.contains("never-leak"));
            fixture.finish().await;
        }
    }
}

#[tokio::test]
async fn rss_node_limit_fails_closed_before_projection() {
    let case = PARITY["cases"]
        .as_array()
        .unwrap()
        .iter()
        .find(|case| case["id"] == "rss-populated")
        .unwrap();
    let mut reply = parity_reply(case);
    reply.body = format!("<rss><channel><title>fictional</title><link>https://dart.fss.or.kr/</link>{}</channel></rss>", "<extra/>".repeat(100_001)).into_bytes();
    let fixture = FixtureServer::spawn(vec![reply]).await;
    let error = execute_parity(&fixture.client(), case).await.unwrap_err();
    assert_eq!(error.code, ErrorCode::SourceParseFailure);
    assert!(!error.retryable);
    fixture.finish().await;
}
