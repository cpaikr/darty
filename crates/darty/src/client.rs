mod extra;

use std::sync::Arc;

#[cfg(feature = "fixture-origin")]
use std::time::Duration;

use chrono::{SecondsFormat, Utc};
use reqwest::Method;
#[cfg(feature = "fixture-origin")]
use url::Url;

#[cfg(feature = "fixture-origin")]
use crate::transport::DeadlineConfig;
use crate::{
    Completeness, ContentSection, DartyError, DisclosureTypeEvidence, ErrorCode, FilingCompany,
    MatchedDisclosureType, Navigation, NavigationEntry, ParsedTocNode, Receipt, ReportEndpoints,
    ReportSource, ReportsSourceBehavior, ResponseDetail, SearchCompanyMetadata,
    SearchCompanyPayload, SearchCompanyReportsMetadata, SearchCompanyReportsPayload,
    SearchCompanyReportsRequest, SearchCompanyReportsResponse, SearchCompanyRequest,
    SearchCompanyResponse, SearchReferences, SearchSource, SourceRequest, SourceTransport,
    ViewReportMetadata, ViewReportPayload, ViewReportReferences, ViewReportRequest,
    ViewReportResponse, Warning,
    parsers::{find_toc, public_toc},
};

const SEARCH_CAP: usize = 8 * 1024 * 1024;
const SHELL_CAP: usize = 16 * 1024 * 1024;
const CONTENT_CAP: usize = 64 * 1024 * 1024;
const COMPANY_SEARCH_URL: &str = "https://dart.fss.or.kr/dsae001/search.ax";
const REPORTS_SEARCH_URL: &str = "https://dart.fss.or.kr/dsab007/detailSearch.ax";
const REPORT_SHELL_URL: &str = "https://dart.fss.or.kr/dsaf001/main.do";
const REPORT_CONTENT_URL: &str = "https://dart.fss.or.kr/report/viewer.do";

#[derive(Clone)]
pub struct DartyClient {
    transport: SourceTransport,
    clock: Arc<dyn Clock>,
}

impl std::fmt::Debug for DartyClient {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        formatter
            .debug_struct("DartyClient")
            .finish_non_exhaustive()
    }
}

impl DartyClient {
    /// Creates a client with the canonical DART transport policy.
    ///
    /// # Errors
    ///
    /// Returns [`DartyError`] if the underlying HTTP client cannot be initialized.
    pub fn new() -> Result<Self, DartyError> {
        Ok(Self {
            transport: SourceTransport::dart()?,
            clock: Arc::new(SystemClock),
        })
    }

    #[cfg(feature = "fixture-origin")]
    #[doc(hidden)]
    pub fn for_fixture_origin(
        origin: Url,
        fetched_at: impl Into<String>,
    ) -> Result<Self, DartyError> {
        let deadlines = DeadlineConfig::default();
        Self::for_fixture_origin_with_deadlines(
            origin,
            fetched_at,
            deadlines.connect,
            deadlines.read,
            deadlines.total,
        )
    }

    #[cfg(feature = "fixture-origin")]
    #[doc(hidden)]
    pub fn for_fixture_origin_with_deadlines(
        origin: Url,
        fetched_at: impl Into<String>,
        connect_timeout: Duration,
        read_timeout: Duration,
        total_timeout: Duration,
    ) -> Result<Self, DartyError> {
        let deadlines = DeadlineConfig {
            connect: connect_timeout,
            read: read_timeout,
            total: total_timeout,
        };
        Ok(Self {
            transport: SourceTransport::fixture_with_deadlines(origin, deadlines)?,
            clock: Arc::new(FixedClock(fetched_at.into())),
        })
    }

    /// Searches DART companies and returns typed company identifiers.
    ///
    /// # Errors
    ///
    /// Returns [`DartyError`] for invalid input or a classified DART transport,
    /// decoding, or source-shape failure.
    pub async fn search_company(
        &self,
        request: SearchCompanyRequest,
    ) -> Result<SearchCompanyResponse, DartyError> {
        let request = crate::validate::search_company(request)?;
        let source = self
            .transport
            .execute(SourceRequest {
                method: Method::POST,
                path: "/dsae001/search.ax",
                referer: Some("https://dart.fss.or.kr/dsae001/main.do"),
                form: company_form(&request),
                query: Vec::new(),
                byte_cap: SEARCH_CAP,
            })
            .await?;
        let page = crate::parsers::company_page(&source.text, request.page).map_err(|reason| {
            DartyError::source(ErrorCode::SourceChanged, reason, &source.canonical_url)
        })?;
        let recognized_empty =
            page.items.is_empty() && page.dropped == 0 && page.pagination.total_count == 0;
        let warnings = search_warnings(page.dropped, recognized_empty, "company");
        Ok(SearchCompanyResponse {
            result: SearchCompanyPayload {
                request,
                pagination: page.pagination,
                items: page.items,
            },
            metadata: SearchCompanyMetadata {
                fetched_at: self.clock.now(),
                source: SearchSource {
                    system: "dart".to_owned(),
                    surface: "dsae001".to_owned(),
                    endpoint: COMPANY_SEARCH_URL.to_owned(),
                },
                source_behavior: crate::CompanySourceBehavior {
                    search_mode: "company".to_owned(),
                    caller_controls_page_size: true,
                    max_observed_page_size: 45,
                    observation_status: "observed".to_owned(),
                },
                completeness: completeness(page.dropped),
                dropped_item_count: page.dropped,
            },
            references: SearchReferences {
                search_url: COMPANY_SEARCH_URL.to_owned(),
            },
            warnings,
        })
    }

    /// Searches filings for one eight-digit DART company identifier.
    ///
    /// # Errors
    ///
    /// Returns [`DartyError`] for invalid input or a classified DART transport,
    /// decoding, or source-shape failure.
    pub async fn search_company_reports(
        &self,
        request: SearchCompanyReportsRequest,
    ) -> Result<SearchCompanyReportsResponse, DartyError> {
        let request = crate::validate::search_company_reports(request)?;
        let source = self
            .transport
            .execute(SourceRequest {
                method: Method::POST,
                path: "/dsab007/detailSearch.ax",
                referer: Some("https://dart.fss.or.kr/dsab007/main.do?option=corp"),
                form: reports_form(&request),
                query: Vec::new(),
                byte_cap: SEARCH_CAP,
            })
            .await?;
        let mut page =
            crate::parsers::reports_page(&source.text, &request.company_code, request.detail)
                .map_err(|reason| {
                    DartyError::source(ErrorCode::SourceChanged, reason, &source.canonical_url)
                })?;
        let recognized_empty =
            page.items.is_empty() && page.dropped == 0 && page.pagination.total_count == 0;
        if recognized_empty {
            page.pagination.current_page = 1;
            page.pagination.total_pages = 1;
        }
        let unique_disclosure = (request.disclosure_types.len() == 1)
            .then(|| disclosure_type(&request.disclosure_types[0]));
        if let Some(disclosure) = unique_disclosure {
            for item in &mut page.items {
                item.matched_disclosure_type = Some(disclosure.clone());
            }
        }
        let mut warnings = search_warnings(page.dropped, recognized_empty, "filing");
        if request.disclosure_types.len() > 1 && !page.items.is_empty() {
            warnings.push(Warning {
                code: "matched_disclosure_type_ambiguous".to_owned(),
                message: "Rows cannot be attributed to one disclosure type when multiple codes are requested."
                    .to_owned(),
                dropped_item_count: None,
            });
        }
        let company = page.items.first().map_or_else(
            || FilingCompany {
                company_code: request.company_code.clone(),
                name: None,
                market_label: None,
            },
            |item| item.company.clone(),
        );
        Ok(SearchCompanyReportsResponse {
            result: SearchCompanyReportsPayload {
                request,
                company,
                pagination: page.pagination,
                items: page.items,
            },
            metadata: SearchCompanyReportsMetadata {
                fetched_at: self.clock.now(),
                source: SearchSource {
                    system: "dart".to_owned(),
                    surface: "dsab007".to_owned(),
                    endpoint: REPORTS_SEARCH_URL.to_owned(),
                },
                source_behavior: ReportsSourceBehavior {
                    search_mode: "corp".to_owned(),
                    sort_by: "date".to_owned(),
                    caller_controls_page_size: true,
                    page_size_choices: vec![15, 30, 50, 100],
                    final_report_default: true,
                    observation_status: "observed".to_owned(),
                },
                completeness: completeness(page.dropped),
                dropped_item_count: page.dropped,
            },
            references: SearchReferences {
                search_url: REPORTS_SEARCH_URL.to_owned(),
            },
            warnings,
        })
    }

    /// Resolves a report's documents and TOC, or returns one requested section.
    ///
    /// # Errors
    ///
    /// Returns [`DartyError`] for invalid input, stale opaque identifiers, or a
    /// classified DART transport, decoding, or source-shape failure.
    pub async fn view_report(
        &self,
        request: ViewReportRequest,
    ) -> Result<ViewReportResponse, DartyError> {
        let request = crate::validate::view_report(request)?;
        let (receipt_number, receipt_document_number) =
            crate::validate::extract_receipt(&request.receipt)
                .ok_or_else(internal_validated_receipt_error)?;
        let shell = self
            .resolve_shell(
                &request,
                &receipt_number,
                receipt_document_number.as_deref(),
            )
            .await?;

        let selected_document = shell.documents[shell.selected_document_index]
            .public
            .clone();
        let has_toc = !shell.toc.is_empty();
        let rendered = self.render_report_content(&request, &shell).await?;

        let include_locators =
            request.section_id.is_none() || !matches!(request.detail, ResponseDetail::Concise);
        let returned_content = rendered.content.is_some();
        Ok(ViewReportResponse {
            result: ViewReportPayload {
                request,
                receipt: Receipt {
                    receipt_number: receipt_number.clone(),
                },
                document: selected_document,
                documents: include_locators.then(|| {
                    shell
                        .documents
                        .iter()
                        .map(|document| document.public.clone())
                        .collect()
                }),
                toc: include_locators.then(|| public_toc(&shell.toc)),
                content: rendered.content,
                navigation: rendered.navigation,
            },
            metadata: ViewReportMetadata {
                fetched_at: self.clock.now(),
                source: ReportSource {
                    system: "dart".to_owned(),
                    surface: "dsaf001".to_owned(),
                    endpoints: ReportEndpoints {
                        shell: REPORT_SHELL_URL.to_owned(),
                        content: returned_content.then(|| REPORT_CONTENT_URL.to_owned()),
                    },
                },
                toc_source: if has_toc { "dart" } else { "none" }.to_owned(),
            },
            references: ViewReportReferences {
                viewer_url: format!(
                    "{REPORT_SHELL_URL}?{}",
                    shell.documents[shell.selected_document_index].query
                ),
            },
            warnings: rendered.warnings,
        })
    }

    async fn resolve_shell(
        &self,
        request: &ViewReportRequest,
        receipt_number: &str,
        receipt_document_number: Option<&str>,
    ) -> Result<crate::ParsedShell, DartyError> {
        let mut shell = self
            .fetch_shell(receipt_number, receipt_document_number)
            .await?;
        if let Some(document_id) = request.document_id.as_deref() {
            let selected = shell
                .documents
                .iter()
                .find(|document| document.public.id == document_id)
                .ok_or_else(|| not_found("documentId", document_id))?;
            let document_number = query_value(&selected.query, "dcmNo");
            if selected.public.id != shell.documents[shell.selected_document_index].public.id {
                shell = self
                    .fetch_shell(receipt_number, document_number.as_deref())
                    .await?;
                let selection_confirmed = shell
                    .documents
                    .get(shell.selected_document_index)
                    .is_some_and(|document| {
                        document.public.id == document_id
                            && query_value(&document.query, "dcmNo") == document_number
                    });
                if !selection_confirmed {
                    return Err(DartyError::source(
                        ErrorCode::SourceChanged,
                        "DART did not select the requested report document.",
                        REPORT_SHELL_URL,
                    ));
                }
            }
        }
        Ok(shell)
    }

    async fn render_report_content(
        &self,
        request: &ViewReportRequest,
        shell: &crate::ParsedShell,
    ) -> Result<RenderedReport, DartyError> {
        let mut rendered = RenderedReport::default();
        if let Some(section_id) = request.section_id.as_deref() {
            let node = find_toc(&shell.toc, section_id)
                .ok_or_else(|| not_found("sectionId", section_id))?;
            let source = self.fetch_content(&node.locator).await?;
            rendered.content = Some(crate::render::render_content(
                &source.text,
                request.output_format,
                request.content_start_byte,
                request.max_bytes,
                "section",
                Some(ContentSection {
                    id: node.id.clone(),
                    title: node.title.clone(),
                }),
            ));
            rendered.navigation = Some(build_navigation(&shell.toc, section_id));
        } else if shell.toc.is_empty() {
            let source = self.fetch_content(&shell.initial_locator).await?;
            rendered.content = Some(crate::render::render_content(
                &source.text,
                request.output_format,
                request.content_start_byte,
                request.max_bytes,
                "document",
                None,
            ));
            rendered.warnings.push(Warning {
                code: "no_toc_returned_document".to_owned(),
                message: "DART returned no TOC; the selected document body is included instead."
                    .to_owned(),
                dropped_item_count: None,
            });
        }
        if rendered
            .content
            .as_ref()
            .is_some_and(|content| content.window.has_more)
        {
            rendered.warnings.push(Warning {
                code: "content_truncated".to_owned(),
                message: "The rendered content is windowed; continue with window.nextStartByte."
                    .to_owned(),
                dropped_item_count: None,
            });
        }
        Ok(rendered)
    }

    async fn fetch_shell(
        &self,
        receipt_number: &str,
        document_number: Option<&str>,
    ) -> Result<crate::ParsedShell, DartyError> {
        let mut query = vec![("rcpNo".to_owned(), receipt_number.to_owned())];
        if let Some(document_number) = document_number {
            query.push(("dcmNo".to_owned(), document_number.to_owned()));
        }
        let source = self
            .transport
            .execute(SourceRequest {
                method: Method::GET,
                path: "/dsaf001/main.do",
                referer: None,
                form: Vec::new(),
                query,
                byte_cap: SHELL_CAP,
            })
            .await?;
        let shell = crate::parsers::report_shell(&source.text).map_err(|failure| {
            let code = match failure.kind {
                crate::parsers::ShellParseErrorKind::SourceChanged => ErrorCode::SourceChanged,
                crate::parsers::ShellParseErrorKind::SourceParseFailure => {
                    ErrorCode::SourceParseFailure
                }
            };
            DartyError::source(code, failure.reason, &source.canonical_url)
        })?;
        if shell.receipt_number != receipt_number {
            return Err(DartyError::source(
                ErrorCode::SourceChanged,
                "The DART report shell resolved a different receipt number.",
                source.canonical_url,
            ));
        }
        let selected_document_number = query_value(
            &shell.documents[shell.selected_document_index].query,
            "dcmNo",
        )
        .unwrap_or_else(|| shell.initial_locator.document_number.clone());
        if document_number.is_some_and(|expected| selected_document_number != expected) {
            return Err(DartyError::source(
                ErrorCode::SourceChanged,
                "DART did not select the requested report document.",
                REPORT_SHELL_URL,
            ));
        }
        Ok(shell)
    }

    async fn fetch_content(
        &self,
        locator: &crate::ViewerLocator,
    ) -> Result<crate::SourceText, DartyError> {
        self.transport
            .execute(SourceRequest {
                method: Method::GET,
                path: "/report/viewer.do",
                referer: None,
                form: Vec::new(),
                query: vec![
                    ("rcpNo".to_owned(), locator.receipt_number.clone()),
                    ("dcmNo".to_owned(), locator.document_number.clone()),
                    ("eleId".to_owned(), locator.element_id.clone()),
                    ("offset".to_owned(), locator.offset.clone()),
                    ("length".to_owned(), locator.length.clone()),
                    ("dtd".to_owned(), locator.dtd.clone()),
                ],
                byte_cap: CONTENT_CAP,
            })
            .await
    }
}

#[derive(Default)]
struct RenderedReport {
    content: Option<crate::ReportContent>,
    navigation: Option<Navigation>,
    warnings: Vec<Warning>,
}

trait Clock: Send + Sync {
    fn now(&self) -> String;
}

struct SystemClock;

impl Clock for SystemClock {
    fn now(&self) -> String {
        Utc::now().to_rfc3339_opts(SecondsFormat::Millis, true)
    }
}

#[cfg(feature = "fixture-origin")]
struct FixedClock(String);

#[cfg(feature = "fixture-origin")]
impl Clock for FixedClock {
    fn now(&self) -> String {
        self.0.clone()
    }
}

fn company_form(request: &SearchCompanyRequest) -> Vec<(&'static str, String)> {
    let mut fields = vec![
        ("currentPage", request.page.to_string()),
        ("maxResults", request.page_size.to_string()),
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
        ("textCrpNm", request.company_name.clone()),
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

fn reports_form(request: &SearchCompanyReportsRequest) -> Vec<(&'static str, String)> {
    let report_name = request.report_name.clone().unwrap_or_default();
    let mut fields = vec![
        ("currentPage", request.page.to_string()),
        ("maxResults", request.page_size.to_string()),
        ("maxLinks", "10".to_owned()),
        ("sort", "date".to_owned()),
        (
            "series",
            match request.sort_direction {
                crate::SortDirection::Asc => "asc",
                crate::SortDirection::Desc => "desc",
            }
            .to_owned(),
        ),
        ("option", "corp".to_owned()),
        ("textCrpNm", String::new()),
        ("textCrpNm2", String::new()),
        ("textCrpCik", request.company_code.clone()),
        (
            "textPresenterNm",
            request.presenter_name.clone().unwrap_or_default(),
        ),
        ("reportName", report_name.clone()),
        ("reportName2", report_name),
    ];
    for code in &request.disclosure_types {
        fields.push(("publicType", code.clone()));
    }
    fields.extend([
        ("startDate", request.start_date.clone()),
        ("endDate", request.end_date.clone()),
        (
            "finalReport",
            if request.include_all_reports {
                ""
            } else {
                "recent"
            }
            .to_owned(),
        ),
        ("businessCode", request.industry_code.clone()),
        (
            "businessNm",
            if request.industry_code == "all" {
                "전체"
            } else {
                ""
            }
            .to_owned(),
        ),
        ("corporationType", request.corporation_type.clone()),
        (
            "closingAccountsMonth",
            request.closing_accounts_month.clone(),
        ),
        ("autoSearch", "N".to_owned()),
        ("autoSearchCorp", "Y".to_owned()),
    ]);
    fields
}

fn search_warnings(dropped: u32, empty: bool, noun: &str) -> Vec<Warning> {
    let mut warnings = Vec::new();
    if dropped > 0 {
        warnings.push(Warning {
            code: "partial_rows_dropped".to_owned(),
            message: format!("{dropped} unparseable {noun} row(s) were dropped."),
            dropped_item_count: Some(dropped),
        });
    }
    if empty {
        warnings.push(Warning {
            code: "no_results".to_owned(),
            message: format!("DART returned no matching {noun} results."),
            dropped_item_count: None,
        });
    }
    warnings
}

const fn completeness(dropped: u32) -> Completeness {
    if dropped == 0 {
        Completeness::Complete
    } else {
        Completeness::Partial
    }
}

fn disclosure_type(code: &str) -> MatchedDisclosureType {
    let category = code.get(..1).unwrap_or("");
    let category_label = match category {
        "A" => "정기공시",
        "B" => "주요사항보고",
        "C" => "발행공시",
        "D" => "지분공시",
        "E" => "기타공시",
        "F" => "외부감사관련",
        "G" => "펀드공시",
        "H" => "자산유동화",
        "I" => "거래소공시",
        "J" => "공정위공시",
        _ => "unknown",
    };
    let label = match code {
        "A001" => Some("사업보고서"),
        "A002" => Some("반기보고서"),
        "A003" => Some("분기보고서"),
        "B001" => Some("주요사항보고서"),
        "D001" => Some("주식등의대량보유상황보고서"),
        "D002" => Some("임원ㆍ주요주주특정증권등소유상황보고서"),
        "F001" => Some("감사보고서"),
        "F002" => Some("연결감사보고서"),
        "I001" => Some("수시공시"),
        "I002" => Some("공정공시"),
        "J004" => Some("기업집단현황공시"),
        _ => None,
    };
    MatchedDisclosureType {
        code: code.to_owned(),
        label: label.map(str::to_owned),
        category: category.to_owned(),
        category_label: category_label.to_owned(),
        evidence: DisclosureTypeEvidence {
            source: "single_disclosure_type_request".to_owned(),
        },
    }
}

fn not_found(parameter: &str, value: &str) -> DartyError {
    DartyError {
        code: ErrorCode::NotFound,
        message: format!("The requested {parameter} was not present in this report: {value}."),
        retryable: false,
        parameter: Some(parameter.to_owned()),
        source_url: None,
        recovery_hint: Some(
            "Rerun view-report for the same receipt and use a returned identifier.".to_owned(),
        ),
    }
}

fn internal_validated_receipt_error() -> DartyError {
    DartyError {
        code: ErrorCode::InternalError,
        message: "The validated report receipt could not be resolved.".to_owned(),
        retryable: false,
        parameter: None,
        source_url: None,
        recovery_hint: None,
    }
}

fn query_value(query: &str, key: &str) -> Option<String> {
    url::form_urlencoded::parse(query.as_bytes())
        .find_map(|(name, value)| (name == key).then(|| value.into_owned()))
}

fn build_navigation(roots: &[ParsedTocNode], selected_id: &str) -> Navigation {
    let mut entries = Vec::new();
    flatten_toc(roots, None, &mut entries);
    let selected_index = entries
        .iter()
        .position(|(node, _)| node.id == selected_id)
        .expect("selected TOC node exists");
    let (selected, parent) = &entries[selected_index];
    Navigation {
        parent: parent.as_ref().map(|node| navigation_entry(node)),
        previous: selected_index
            .checked_sub(1)
            .and_then(|index| entries.get(index))
            .map(|(node, _)| navigation_entry(node)),
        next: entries
            .get(selected_index + 1)
            .map(|(node, _)| navigation_entry(node)),
        children: selected.children.iter().map(navigation_entry).collect(),
    }
}

fn flatten_toc<'a>(
    nodes: &'a [ParsedTocNode],
    parent: Option<&'a ParsedTocNode>,
    output: &mut Vec<(&'a ParsedTocNode, Option<&'a ParsedTocNode>)>,
) {
    for node in nodes {
        output.push((node, parent));
        flatten_toc(&node.children, Some(node), output);
    }
}

fn navigation_entry(node: &ParsedTocNode) -> NavigationEntry {
    NavigationEntry {
        id: node.id.clone(),
        title: node.title.clone(),
    }
}
