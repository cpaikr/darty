use crate::{
    BodySortBy, BodySourceBehavior, CompanyDetailMetadata, CompanyDetailPayload,
    CompanyDetailReferences, CompanyDetailRequest, CompanyDetailResponse, CompanyRssMetadata,
    CompanyRssPayload, CompanyRssReferences, CompanyRssRequest, CompanyRssResponse, Completeness,
    DartyClient, DartyError, ErrorCode, SearchBodyMetadata, SearchBodyPayload, SearchBodyRequest,
    SearchBodyResponse, SearchReferences, SearchSource, SortDirection, SourceRequest,
};
use reqwest::Method;

fn company_code(value: &str) -> Result<String, DartyError> {
    if value.len() != 8 || !value.bytes().all(|byte| byte.is_ascii_digit()) {
        return Err(DartyError::invalid(
            "companyCode must be an 8-digit DART company code.",
            "companyCode",
            "Use search-company to resolve an 8-digit companyCode.",
        ));
    }
    Ok(value.to_owned())
}

impl DartyClient {
    /// Fetches a normalized company overview.
    ///
    /// # Errors
    /// Returns typed input, not-found, transport, or source-shape failures.
    pub async fn company_detail(
        &self,
        mut request: CompanyDetailRequest,
    ) -> Result<CompanyDetailResponse, DartyError> {
        request.company_code = company_code(request.company_code.trim())?;
        let source = self
            .transport
            .execute(SourceRequest {
                method: Method::GET,
                path: "/dsae001/select.ax",
                referer: Some("https://dart.fss.or.kr/dsae001/main.do"),
                form: Vec::new(),
                query: vec![("selectKey".to_owned(), request.company_code.clone())],
                byte_cap: super::SEARCH_CAP,
            })
            .await?;
        let company = crate::extra_parsers::company_detail(&source.text, &request.company_code)
            .map_err(|code| {
                if code == ErrorCode::NotFound {
                    return DartyError {
                        code,
                        message: "DART returned no company for the requested company code."
                            .to_owned(),
                        retryable: false,
                        parameter: None,
                        source_url: Some(source.canonical_url.clone()),
                        recovery_hint: Some(
                            "If you only know a company name or 6-digit stock code, first use search-company to find the 8-digit companyCode, then call this operation again.".to_owned(),
                        ),
                    };
                }
                DartyError::source(
                    code,
                    "DART company detail structure did not match expectations.",
                    &source.canonical_url,
                )
            })?;
        let detail_url = format!(
            "{}?selectKey={}",
            source.canonical_url, request.company_code
        );
        Ok(CompanyDetailResponse {
            result: CompanyDetailPayload { request, company },
            metadata: CompanyDetailMetadata {
                fetched_at: self.clock.now(),
                source: SearchSource {
                    system: "dart".to_owned(),
                    surface: "dsae001".to_owned(),
                    endpoint: detail_url.clone(),
                },
                completeness: Completeness::Complete,
            },
            references: CompanyDetailReferences { detail_url },
        })
    }

    /// Fetches a company's current RSS feed with bounded XML parsing.
    ///
    /// # Errors
    /// Returns typed input, transport, XML-decoding, or source-shape failures.
    pub async fn company_rss(
        &self,
        mut request: CompanyRssRequest,
    ) -> Result<CompanyRssResponse, DartyError> {
        request.company_code = company_code(request.company_code.trim())?;
        let source = self
            .transport
            .execute(SourceRequest {
                method: Method::GET,
                path: "/api/companyRSS.xml",
                referer: None,
                form: Vec::new(),
                query: vec![("crpCd".to_owned(), request.company_code.clone())],
                byte_cap: super::SEARCH_CAP,
            })
            .await?;
        let (channel, items) = crate::extra_parsers::company_rss(&source.text, request.detail)
            .map_err(|code| {
                DartyError::source(
                    code,
                    "DART RSS structure could not be parsed safely.",
                    &source.canonical_url,
                )
            })?;
        let rss_url = format!("{}?crpCd={}", source.canonical_url, request.company_code);
        let item_count = items.len();
        Ok(CompanyRssResponse {
            result: CompanyRssPayload {
                request,
                channel,
                items,
            },
            metadata: CompanyRssMetadata {
                fetched_at: self.clock.now(),
                source: SearchSource {
                    system: "dart".to_owned(),
                    surface: "companyRSS".to_owned(),
                    endpoint: rss_url.clone(),
                },
                completeness: Completeness::Complete,
                item_count,
            },
            references: CompanyRssReferences { rss_url },
        })
    }

    /// Searches filing body text while preserving DART keyword syntax.
    ///
    /// # Errors
    /// Returns typed input, transport, or source-shape failures.
    pub async fn search_body(
        &self,
        request: SearchBodyRequest,
    ) -> Result<SearchBodyResponse, DartyError> {
        let request = validate_body(request)?;
        let source = self
            .transport
            .execute(SourceRequest {
                method: Method::POST,
                path: "/dsab007/search.ax",
                referer: None,
                form: body_form(&request),
                query: Vec::new(),
                byte_cap: super::SEARCH_CAP,
            })
            .await?;
        let (pagination, items, dropped) = crate::extra_parsers::body_page(&source.text, &request)
            .map_err(|reason| {
                DartyError::source(ErrorCode::SourceChanged, reason, &source.canonical_url)
            })?;
        let mut warnings = Vec::new();
        if dropped > 0 {
            warnings.push(crate::Warning {
                code: "partial_rows_dropped".to_owned(),
                message: format!(
                    "Dropped {dropped} search result row(s) because they could not be parsed."
                ),
                dropped_item_count: Some(dropped),
            });
        }
        if pagination.total_count == 0 && items.is_empty() {
            warnings.push(crate::Warning { code: "no_results".to_owned(), message: "No DART 본문내용 results. DART applies document-level keywords plus explicit date/company/report filters; widen the date range or remove optional filters, then search again.".to_owned(), dropped_item_count: None });
        }
        Ok(SearchBodyResponse {
            result: SearchBodyPayload {
                request,
                pagination,
                items,
            },
            metadata: SearchBodyMetadata {
                fetched_at: self.clock.now(),
                source: SearchSource {
                    system: "dart".to_owned(),
                    surface: "dsab007".to_owned(),
                    endpoint: source.canonical_url.clone(),
                },
                source_behavior: BodySourceBehavior {
                    effective_page_size: 10,
                    effective_pager_width: 10,
                    caller_controls_page_size: false,
                    caller_controls_pager_width: false,
                    observation_status: "observed".to_owned(),
                },
                completeness: super::completeness(dropped),
                dropped_item_count: dropped,
            },
            references: SearchReferences {
                search_url: source.canonical_url,
            },
            warnings,
        })
    }
}

fn validate_body(mut request: SearchBodyRequest) -> Result<SearchBodyRequest, DartyError> {
    if request.keyword.is_empty() {
        return Err(DartyError::invalid(
            "keyword cannot be empty.",
            "keyword",
            "Use a non-empty body search expression.",
        ));
    }
    let start = crate::validate::parse_date(&request.start_date, "startDate")?;
    let end = crate::validate::parse_date(&request.end_date, "endDate")?;
    if start > end {
        return Err(DartyError::invalid(
            "startDate must be on or before endDate.",
            "startDate",
            "Use an ordered YYYYMMDD date window.",
        ));
    }
    if !(1..=100).contains(&request.page) {
        return Err(DartyError::invalid(
            "page must be an integer between 1 and 100.",
            "page",
            "Use a page between 1 and 100.",
        ));
    }
    if let Some(code) = request.company_code.as_mut() {
        *code = company_code(code)?;
    }
    crate::validate::trim_optional(&mut request.presenter_name, "presenterName")?;
    crate::validate::trim_optional(&mut request.report_name, "reportName")?;
    Ok(request)
}

fn body_form(request: &SearchBodyRequest) -> Vec<(&'static str, String)> {
    let mut form = Vec::new();
    for key in [
        "lateKeyword",
        "flrCik",
        "dspTypeTab",
        "tocSrch",
        "b_flrCik",
        "b_docType",
        "b_dspType",
        "b_synonym",
        "b_reSearch",
        "reportNamePopYn",
        "textCrpNm",
        "decadeType",
        "docType",
    ] {
        form.push((key, String::new()));
    }
    for (key, value) in [
        ("maxResults", "10"),
        ("maxLinks", "10"),
        ("isSort", "false"),
        ("isTab", "false"),
        ("autoSearch", "N"),
        ("option", "contents"),
    ] {
        form.push((key, value.to_owned()));
    }
    form.push(("currentPage", request.page.to_string()));
    form.push((
        "sort",
        match request.sort_by {
            BodySortBy::Date => "DATE",
            BodySortBy::ReportName => "rpt_nm",
        }
        .to_owned(),
    ));
    form.push((
        "sortType",
        match request.sort_direction {
            SortDirection::Asc => "asc",
            SortDirection::Desc => "desc",
        }
        .to_owned(),
    ));
    for (key, mirror, value) in [
        (
            "textCrpCik",
            "b_textCrpCik",
            request.company_code.as_deref().unwrap_or_default(),
        ),
        ("keyword", "b_keyword", &request.keyword),
        (
            "textPresenterNm",
            "b_textPresenterNm",
            request.presenter_name.as_deref().unwrap_or_default(),
        ),
        (
            "reportName",
            "b_reportName",
            request.report_name.as_deref().unwrap_or_default(),
        ),
        ("startDate", "b_startDate", &request.start_date),
        ("endDate", "b_endDate", &request.end_date),
    ] {
        form.push((key, value.to_owned()));
        form.push((mirror, value.to_owned()));
    }
    form
}

#[cfg(test)]
mod tests {
    use super::{body_form, validate_body};
    use crate::SearchBodyRequest;

    #[test]
    fn body_dates_require_exact_wire_syntax_and_company_codes_are_not_trimmed() {
        for date in ["2026031", "2026 3 1", " 20260301", "20260301 ", "20260229"] {
            let error =
                validate_body(SearchBodyRequest::new("배당", date, "20260331")).unwrap_err();
            assert_eq!(error.parameter.as_deref(), Some("startDate"));
        }
        let mut request = SearchBodyRequest::new("배당", "20260301", "20260331");
        request.company_code = Some(" 00126380 ".to_owned());
        assert_eq!(
            validate_body(request).unwrap_err().parameter.as_deref(),
            Some("companyCode")
        );
    }

    #[test]
    fn keyword_is_preserved_in_both_wire_fields_while_text_filters_are_normalized() {
        for keyword in [" 배당 ", " ", "사과|포도", "\"사과 포도\""] {
            let mut request = SearchBodyRequest::new(keyword, "20260301", "20260331");
            request.presenter_name = Some(" 가람전자 ".to_owned());
            request.report_name = Some(" 사업보고서 ".to_owned());
            let request = validate_body(request).unwrap();
            let form = body_form(&request);
            for key in ["keyword", "b_keyword"] {
                assert_eq!(
                    form.iter().find(|(name, _)| *name == key).unwrap().1,
                    keyword
                );
            }
            assert_eq!(request.presenter_name.as_deref(), Some("가람전자"));
            assert_eq!(request.report_name.as_deref(), Some("사업보고서"));
        }
    }
}
