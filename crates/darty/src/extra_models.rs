use crate::{
    Completeness, Pagination, ResponseDetail, SearchReferences, SearchSource, SortDirection,
    Warning,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CompanyDetailRequest {
    pub company_code: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CompanyRssRequest {
    pub company_code: String,
    #[serde(default)]
    pub detail: ResponseDetail,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CompanyDetailInfo {
    pub company_code: String,
    pub company_name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub english_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub disclosure_company_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stock_code: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub representative_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub corporation_kind: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub corporate_registration_number: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub business_registration_number: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub address: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub homepage: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub phone_number: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub fax_number: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub industry_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub established_date: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub fiscal_month: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CompanyDetailPayload {
    pub request: CompanyDetailRequest,
    pub company: CompanyDetailInfo,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CompanyDetailMetadata {
    pub fetched_at: String,
    pub source: SearchSource,
    pub completeness: Completeness,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CompanyDetailReferences {
    pub detail_url: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CompanyDetailResponse {
    pub result: CompanyDetailPayload,
    pub metadata: CompanyDetailMetadata,
    pub references: CompanyDetailReferences,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CompanyRssChannel {
    pub title: String,
    pub link: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub language: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub published_at: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CompanyRssItem {
    pub title: String,
    pub link: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub receipt_number: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub published_at: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub creator: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub guid: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CompanyRssPayload {
    pub request: CompanyRssRequest,
    pub channel: CompanyRssChannel,
    pub items: Vec<CompanyRssItem>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CompanyRssMetadata {
    pub fetched_at: String,
    pub source: SearchSource,
    pub completeness: Completeness,
    pub item_count: usize,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CompanyRssReferences {
    pub rss_url: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CompanyRssResponse {
    pub result: CompanyRssPayload,
    pub metadata: CompanyRssMetadata,
    pub references: CompanyRssReferences,
}

#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum BodySortBy {
    #[default]
    Date,
    ReportName,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct SearchBodyRequest {
    pub keyword: String,
    pub start_date: String,
    pub end_date: String,
    #[serde(default = "crate::models::default_page")]
    pub page: u32,
    #[serde(default)]
    pub sort_by: BodySortBy,
    #[serde(default)]
    pub sort_direction: SortDirection,
    #[serde(
        default,
        deserialize_with = "crate::models::present_string",
        skip_serializing_if = "Option::is_none"
    )]
    pub company_code: Option<String>,
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
    pub detail: ResponseDetail,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchBodyCompany {
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub market_label: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub company_code: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchBodyFiling {
    pub receipt_number: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub document_number: Option<String>,
    pub report_title: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub report_modifier: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub report_period: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub report_name_suffix: Option<String>,
    pub receipt_date: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchBodyMatch {
    pub snippet_text: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub disclosure_type_label: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub content_type_label: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub presenter_name: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchBodyItemReferences {
    pub viewer_url: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchBodyEvidence {
    pub report_name_raw: String,
    pub raw_info_text: String,
    pub snippet_html: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchBodyItem {
    pub company: SearchBodyCompany,
    pub filing: SearchBodyFiling,
    pub r#match: SearchBodyMatch,
    pub references: SearchBodyItemReferences,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub evidence: Option<SearchBodyEvidence>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchBodyPayload {
    pub request: SearchBodyRequest,
    pub pagination: Pagination,
    pub items: Vec<SearchBodyItem>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BodySourceBehavior {
    pub effective_page_size: u32,
    pub effective_pager_width: u32,
    pub caller_controls_page_size: bool,
    pub caller_controls_pager_width: bool,
    pub observation_status: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchBodyMetadata {
    pub fetched_at: String,
    pub source: SearchSource,
    pub source_behavior: BodySourceBehavior,
    pub completeness: Completeness,
    pub dropped_item_count: u32,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchBodyResponse {
    pub result: SearchBodyPayload,
    pub metadata: SearchBodyMetadata,
    pub references: SearchReferences,
    pub warnings: Vec<Warning>,
}

impl CompanyDetailRequest {
    pub fn new(company_code: impl Into<String>) -> Self {
        Self {
            company_code: company_code.into(),
        }
    }
}
impl CompanyRssRequest {
    pub fn new(company_code: impl Into<String>) -> Self {
        Self {
            company_code: company_code.into(),
            detail: ResponseDetail::Concise,
        }
    }
}
impl SearchBodyRequest {
    pub fn new(
        keyword: impl Into<String>,
        start_date: impl Into<String>,
        end_date: impl Into<String>,
    ) -> Self {
        Self {
            keyword: keyword.into(),
            start_date: start_date.into(),
            end_date: end_date.into(),
            page: 1,
            sort_by: BodySortBy::Date,
            sort_direction: SortDirection::Desc,
            company_code: None,
            presenter_name: None,
            report_name: None,
            detail: ResponseDetail::Concise,
        }
    }
}
