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
        Reply::reports("00000003", REPORTS_EMPTY_BODY),
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

    let empty_reports = client
        .search_company_reports(SearchCompanyReportsRequest::new(
            "00000003", "20250101", "20260101",
        ))
        .await
        .unwrap();
    assert_eq!(empty_reports.result.pagination.current_page, 1);
    assert_eq!(empty_reports.result.pagination.total_pages, 1);

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
        let listener = TcpListener::bind(("127.0.0.1", 0)).await.unwrap();
        let address = listener.local_addr().unwrap();
        let arrivals = Arc::new(Mutex::new(Vec::new()));
        let recorded_arrivals = Arc::clone(&arrivals);
        let task = tokio::spawn(async move {
            for reply in replies {
                let (stream, _) = listener.accept().await.unwrap();
                recorded_arrivals.lock().unwrap().push(Instant::now());
                reply.serve(stream).await;
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

    fn delayed(mut self, duration: Duration) -> Self {
        self.response_delay = duration;
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
        }
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
        assert!(request.headers.contains_key("user-agent"));
        if self.method == "POST" {
            assert_eq!(
                request.headers.get("content-type").map(String::as_str),
                Some("application/x-www-form-urlencoded; charset=UTF-8")
            );
            assert_eq!(form_map(&request.body), pair_map(&self.form));
            let expected_referer = if self.path == "/dsae001/search.ax" {
                "https://dart.fss.or.kr/dsae001/main.do"
            } else {
                "https://dart.fss.or.kr/dsab007/main.do?option=corp"
            };
            assert_eq!(
                request.headers.get("referer").map(String::as_str),
                Some(expected_referer)
            );
        }

        tokio::time::sleep(self.response_delay).await;

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
        stream.write_all(head.as_bytes()).await.unwrap();
        stream.write_all(&self.body).await.unwrap();
        stream.shutdown().await.unwrap();
    }
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
