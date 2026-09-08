use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct SearchCompanyRequest {
    pub company_name: String,
    #[serde(default = "default_page")]
    pub page: u32,
    #[serde(default = "default_company_page_size")]
    pub page_size: u32,
}

impl SearchCompanyRequest {
    pub fn new(company_name: impl Into<String>) -> Self {
        Self {
            company_name: company_name.into(),
            page: default_page(),
            page_size: default_company_page_size(),
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum MarketKind {
    Kospi,
    Kosdaq,
    Konex,
    Etc,
    Unknown,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CompanyItemReferences {
    pub detail_endpoint: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CompanyItemEvidence {
    pub raw_company_link_href: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub raw_market_badge_text: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchCompanyItem {
    pub company_code: String,
    pub company_name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stock_code: Option<String>,
    pub market_kind: MarketKind,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub market_label: Option<String>,
    pub references: CompanyItemReferences,
    pub evidence: CompanyItemEvidence,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Pagination {
    pub current_page: u32,
    pub total_pages: u32,
    pub total_count: u32,
    pub returned_count: u32,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Warning {
    pub code: String,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub dropped_item_count: Option<u32>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchCompanyPayload {
    pub request: SearchCompanyRequest,
    pub pagination: Pagination,
    pub items: Vec<SearchCompanyItem>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchCompanyMetadata {
    pub fetched_at: String,
    pub source: SearchSource,
    pub source_behavior: CompanySourceBehavior,
    pub completeness: Completeness,
    pub dropped_item_count: u32,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchSource {
    pub system: String,
    pub surface: String,
    pub endpoint: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CompanySourceBehavior {
    pub search_mode: String,
    pub caller_controls_page_size: bool,
    pub max_observed_page_size: u32,
    pub observation_status: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Completeness {
    Complete,
    Partial,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchReferences {
    pub search_url: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchCompanyResponse {
    pub result: SearchCompanyPayload,
    pub metadata: SearchCompanyMetadata,
    pub references: SearchReferences,
    pub warnings: Vec<Warning>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "lowercase")]
pub enum SortDirection {
    Asc,
    #[default]
    Desc,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "lowercase")]
pub enum ResponseDetail {
    #[default]
    Concise,
    Detailed,
    Raw,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct SearchCompanyReportsRequest {
    pub company_code: String,
    pub start_date: String,
    pub end_date: String,
    #[serde(default = "default_page")]
    pub page: u32,
    #[serde(default = "default_reports_page_size")]
    pub page_size: u32,
    #[serde(default)]
    pub sort_direction: SortDirection,
    #[serde(
        default,
        deserialize_with = "crate::models::present_string",
        skip_serializing_if = "Option::is_none"
    )]
    pub presenter_name: Option<String>,
    #[serde(
        default,
        deserialize_with = "crate::models::present_string",
        skip_serializing_if = "Option::is_none"
    )]
    pub report_name: Option<String>,
    #[serde(default)]
    pub disclosure_types: Vec<String>,
    #[serde(default = "default_all")]
    pub industry_code: String,
    #[serde(default = "default_all")]
    pub corporation_type: String,
    #[serde(default = "default_all")]
    pub closing_accounts_month: String,
    #[serde(default)]
    pub include_all_reports: bool,
    #[serde(default)]
    pub detail: ResponseDetail,
}

impl SearchCompanyReportsRequest {
    pub fn new(
        company_code: impl Into<String>,
        start_date: impl Into<String>,
        end_date: impl Into<String>,
    ) -> Self {
        Self {
            company_code: company_code.into(),
            start_date: start_date.into(),
            end_date: end_date.into(),
            page: default_page(),
            page_size: default_reports_page_size(),
            sort_direction: SortDirection::Desc,
            presenter_name: None,
            report_name: None,
            disclosure_types: Vec::new(),
            industry_code: default_all(),
            corporation_type: default_all(),
            closing_accounts_month: default_all(),
            include_all_reports: false,
            detail: ResponseDetail::Concise,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FilingCompany {
    pub company_code: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub market_label: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Filing {
    pub receipt_number: String,
    pub report_title: String,
    pub receipt_date: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub presenter_name: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FilingItemReferences {
    pub viewer_url: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Remark {
    pub text: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub title: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FilingEvidence {
    pub raw_row_text: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MatchedDisclosureType {
    pub code: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub label: Option<String>,
    pub category: String,
    pub category_label: String,
    pub evidence: DisclosureTypeEvidence,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DisclosureTypeEvidence {
    pub source: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchCompanyReportsItem {
    pub company: FilingCompany,
    pub filing: Filing,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub matched_disclosure_type: Option<MatchedDisclosureType>,
    pub references: FilingItemReferences,
    pub remarks: Vec<Remark>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub evidence: Option<FilingEvidence>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchCompanyReportsPayload {
    pub request: SearchCompanyReportsRequest,
    pub company: FilingCompany,
    pub pagination: Pagination,
    pub items: Vec<SearchCompanyReportsItem>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReportsSourceBehavior {
    pub search_mode: String,
    pub sort_by: String,
    pub caller_controls_page_size: bool,
    pub page_size_choices: Vec<u32>,
    pub final_report_default: bool,
    pub observation_status: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchCompanyReportsMetadata {
    pub fetched_at: String,
    pub source: SearchSource,
    pub source_behavior: ReportsSourceBehavior,
    pub completeness: Completeness,
    pub dropped_item_count: u32,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchCompanyReportsResponse {
    pub result: SearchCompanyReportsPayload,
    pub metadata: SearchCompanyReportsMetadata,
    pub references: SearchReferences,
    pub warnings: Vec<Warning>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "lowercase")]
pub enum OutputFormat {
    Html,
    #[default]
    Markdown,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ViewReportRequest {
    pub receipt: String,
    #[serde(
        default,
        deserialize_with = "crate::models::present_string",
        skip_serializing_if = "Option::is_none"
    )]
    pub document_id: Option<String>,
    #[serde(
        default,
        deserialize_with = "crate::models::present_string",
        skip_serializing_if = "Option::is_none"
    )]
    pub section_id: Option<String>,
    #[serde(default)]
    pub output_format: OutputFormat,
    #[serde(default = "default_max_bytes")]
    pub max_bytes: u32,
    #[serde(default)]
    pub content_start_byte: u32,
    #[serde(default)]
    pub detail: ResponseDetail,
}

impl ViewReportRequest {
    pub fn new(receipt: impl Into<String>) -> Self {
        Self {
            receipt: receipt.into(),
            document_id: None,
            section_id: None,
            output_format: OutputFormat::Markdown,
            max_bytes: default_max_bytes(),
            content_start_byte: 0,
            detail: ResponseDetail::Concise,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum DocumentKind {
    Body,
    Attachment,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReportDocument {
    pub id: String,
    pub title: String,
    pub kind: DocumentKind,
    pub selected: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TocNode {
    pub id: String,
    pub title: String,
    pub children: Vec<TocNode>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Receipt {
    pub receipt_number: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ContentSection {
    pub id: String,
    pub title: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ContentWindow {
    pub unit: String,
    pub start_byte: u32,
    pub end_byte: u32,
    pub has_more: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub next_start_byte: Option<u32>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReportContent {
    pub scope: String,
    pub size_bytes: u32,
    pub returned_bytes: u32,
    pub is_full_content: bool,
    pub window: ContentWindow,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub section: Option<ContentSection>,
    pub format: OutputFormat,
    pub body: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NavigationEntry {
    pub id: String,
    pub title: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Navigation {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub parent: Option<NavigationEntry>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub previous: Option<NavigationEntry>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub next: Option<NavigationEntry>,
    pub children: Vec<NavigationEntry>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReportEndpoints {
    pub shell: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub content: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReportSource {
    pub system: String,
    pub surface: String,
    pub endpoints: ReportEndpoints,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ViewReportMetadata {
    pub fetched_at: String,
    pub source: ReportSource,
    pub toc_source: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ViewReportReferences {
    pub viewer_url: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ViewReportPayload {
    pub request: ViewReportRequest,
    pub receipt: Receipt,
    pub document: ReportDocument,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub documents: Option<Vec<ReportDocument>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub toc: Option<Vec<TocNode>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub content: Option<ReportContent>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub navigation: Option<Navigation>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ViewReportResponse {
    pub result: ViewReportPayload,
    pub metadata: ViewReportMetadata,
    pub references: ViewReportReferences,
    pub warnings: Vec<Warning>,
}

pub(crate) const fn default_page() -> u32 {
    1
}

const fn default_company_page_size() -> u32 {
    15
}

const fn default_reports_page_size() -> u32 {
    15
}

const fn default_max_bytes() -> u32 {
    50_000
}

fn default_all() -> String {
    "all".to_owned()
}

// Omitted request fields use serde defaults; an explicit null is invalid input.
pub(crate) fn present_string<'de, D: serde::Deserializer<'de>>(
    deserializer: D,
) -> Result<Option<String>, D::Error> {
    String::deserialize(deserializer).map(Some)
}

#[cfg(test)]
mod tests {
    use super::{ResponseDetail, SearchCompanyReportsRequest, ViewReportRequest};

    #[test]
    fn normalized_concise_detail_is_serialized_for_report_requests() {
        let reports = SearchCompanyReportsRequest::new("00000001", "20250101", "20260101");
        let view = ViewReportRequest::new("20260101000001");

        assert_eq!(serde_json::to_value(&reports).unwrap()["detail"], "concise");
        assert_eq!(serde_json::to_value(&view).unwrap()["detail"], "concise");

        let reports_without_detail = serde_json::json!({
            "companyCode": "00000001",
            "startDate": "20250101",
            "endDate": "20260101"
        });
        let view_without_detail = serde_json::json!({"receipt": "20260101000001"});
        let reports: SearchCompanyReportsRequest =
            serde_json::from_value(reports_without_detail).unwrap();
        let view: ViewReportRequest = serde_json::from_value(view_without_detail).unwrap();
        assert_eq!(reports.detail, ResponseDetail::Concise);
        assert_eq!(view.detail, ResponseDetail::Concise);
    }
}
