use chrono::{Datelike, Months, NaiveDate};

use crate::{DartyError, SearchCompanyReportsRequest, SearchCompanyRequest, ViewReportRequest};

const DISCLOSURE_TYPES: &[&str] = &[
    "A001", "A002", "A003", "A004", "A005", "B001", "B002", "B003", "C001", "C002", "C003", "C004",
    "C005", "C006", "C007", "C008", "C009", "C010", "C011", "D001", "D002", "D003", "D004", "D005",
    "E001", "E002", "E003", "E004", "E005", "E006", "E007", "E008", "E009", "F001", "F002", "F003",
    "F004", "F005", "G001", "G002", "G003", "H001", "H002", "H003", "H004", "H005", "H006", "I001",
    "I002", "I003", "I004", "I005", "I006", "J001", "J002", "J004", "J005", "J006", "J008", "J009",
];

pub(crate) fn search_company(
    mut request: SearchCompanyRequest,
) -> Result<SearchCompanyRequest, DartyError> {
    request.company_name = request.company_name.trim().to_owned();
    if request.company_name.chars().count() < 2 {
        return Err(DartyError::invalid(
            "companyName must contain at least 2 characters.",
            "companyName",
            "Use at least 2 characters and try search-company again.",
        ));
    }
    if !(1..=100).contains(&request.page) {
        return Err(DartyError::invalid(
            "page must be an integer between 1 and 100.",
            "page",
            "Use a page between 1 and 100.",
        ));
    }
    if !(1..=45).contains(&request.page_size) {
        return Err(DartyError::invalid(
            "pageSize must be an integer between 1 and 45.",
            "pageSize",
            "Use a pageSize between 1 and 45.",
        ));
    }
    Ok(request)
}

pub(crate) fn search_company_reports(
    mut request: SearchCompanyReportsRequest,
) -> Result<SearchCompanyReportsRequest, DartyError> {
    if !is_ascii_digits(&request.company_code, 8, 8) {
        return Err(DartyError::invalid(
            "companyCode must be an 8-digit DART company code.",
            "companyCode",
            "Use search-company to resolve an 8-digit companyCode.",
        ));
    }

    let start = parse_date(&request.start_date, "startDate")?;
    let end = parse_date(&request.end_date, "endDate")?;
    if start > end {
        return Err(DartyError::invalid(
            "startDate must be on or before endDate.",
            "startDate",
            "Use an ordered YYYYMMDD date window.",
        ));
    }
    let earliest = subtract_ten_years(end);
    if start < earliest {
        return Err(DartyError::invalid(
            format!(
                "search-company-reports date windows cannot exceed 10 years; earliest startDate for {} is {}.",
                request.end_date,
                earliest.format("%Y%m%d")
            ),
            "startDate",
            "Split the request into date windows of 10 years or less.",
        ));
    }

    if !(1..=100).contains(&request.page) {
        return Err(DartyError::invalid(
            "page must be an integer between 1 and 100.",
            "page",
            "Use a page between 1 and 100.",
        ));
    }
    request.page_size = match request.page_size {
        5 | 10 => 15,
        15 | 30 | 50 | 100 => request.page_size,
        _ => {
            return Err(DartyError::invalid(
                "pageSize must be one of 5, 10, 15, 30, 50, or 100.",
                "pageSize",
                "Use a supported DART result page size.",
            ));
        }
    };

    validate_report_filters(&mut request)?;

    Ok(request)
}

fn validate_report_filters(request: &mut SearchCompanyReportsRequest) -> Result<(), DartyError> {
    trim_optional(&mut request.presenter_name, "presenterName")?;
    trim_optional(&mut request.report_name, "reportName")?;
    let mut unknown_codes = Vec::new();
    for code in request
        .disclosure_types
        .iter()
        .filter(|code| !DISCLOSURE_TYPES.contains(&code.as_str()))
    {
        if !unknown_codes.contains(&code.as_str()) {
            unknown_codes.push(code.as_str());
        }
    }
    if !unknown_codes.is_empty() {
        return Err(DartyError::invalid(
            format!(
                "Unsupported DART disclosure type code: {}.",
                unknown_codes.join(", ")
            ),
            "disclosureTypes",
            "Use disclosure-types to find a supported detailed code.",
        ));
    }
    request.disclosure_types.sort();
    request.disclosure_types.dedup();

    let valid_industry = request.industry_code == "all"
        || request
            .industry_code
            .strip_prefix("ROOT")
            .is_some_and(|value| is_ascii_digits(value, 4, 4))
        || is_ascii_digits(&request.industry_code, 2, 5);
    if !valid_industry {
        return Err(DartyError::invalid(
            "industryCode must be all, ROOTdddd, or a 2-5 digit DART industry code.",
            "industryCode",
            "Use all when the DART industry code is unknown.",
        ));
    }
    if !matches!(
        request.corporation_type.as_str(),
        "all" | "P" | "A" | "N" | "E"
    ) {
        return Err(DartyError::invalid(
            "corporationType must be all, P, A, N, or E.",
            "corporationType",
            "Use all when the corporation type is unknown.",
        ));
    }
    if request.closing_accounts_month.len() == 1
        && request
            .closing_accounts_month
            .bytes()
            .all(|byte| byte.is_ascii_digit())
    {
        request.closing_accounts_month = format!("0{}", request.closing_accounts_month);
    }
    if request.closing_accounts_month != "all"
        && !matches!(
            request.closing_accounts_month.as_str(),
            "01" | "02" | "03" | "04" | "05" | "06" | "07" | "08" | "09" | "10" | "11" | "12"
        )
    {
        return Err(DartyError::invalid(
            "closingAccountsMonth must be all or 01 through 12.",
            "closingAccountsMonth",
            "Use all or a zero-padded fiscal closing month.",
        ));
    }

    Ok(())
}

pub(crate) fn view_report(mut request: ViewReportRequest) -> Result<ViewReportRequest, DartyError> {
    request.receipt = request.receipt.trim().to_owned();
    if extract_receipt(&request.receipt).is_none() {
        return Err(DartyError::invalid(
            "receipt must be a 14-digit DART receipt number or viewer URL containing rcpNo.",
            "receipt",
            "Use receiptNumber or viewerUrl from a filing-search result.",
        ));
    }
    if !(1_000..=1_000_000).contains(&request.max_bytes) {
        return Err(DartyError::invalid(
            "maxBytes must be an integer between 1000 and 1000000.",
            "maxBytes",
            "Use a bounded rendered-content window.",
        ));
    }
    if request
        .document_id
        .as_ref()
        .is_some_and(|value| value.trim().is_empty())
    {
        return Err(DartyError::invalid(
            "documentId must be a non-empty returned document identifier.",
            "documentId",
            "Rerun view-report and use a returned documents[].id.",
        ));
    }
    if request
        .section_id
        .as_ref()
        .is_some_and(|value| value.trim().is_empty())
    {
        return Err(DartyError::invalid(
            "sectionId must be a non-empty returned section identifier.",
            "sectionId",
            "Rerun view-report and use a returned toc[].id.",
        ));
    }
    Ok(request)
}

pub(crate) fn extract_receipt(receipt: &str) -> Option<(String, Option<String>)> {
    if is_ascii_digits(receipt, 14, 14) {
        return Some((receipt.to_owned(), None));
    }
    let url = url::Url::parse(receipt).ok()?;
    if url.scheme() != "https"
        || url.host_str() != Some("dart.fss.or.kr")
        || url.path() != "/dsaf001/main.do"
        || url.port().is_some()
    {
        return None;
    }
    let mut receipt_number = None;
    let mut document_number = None;
    for (key, value) in url.query_pairs() {
        match key.as_ref() {
            "rcpNo" if receipt_number.is_none() && is_ascii_digits(&value, 14, 14) => {
                receipt_number = Some(value.into_owned());
            }
            "dcmNo"
                if document_number.is_none()
                    && !value.is_empty()
                    && value.bytes().all(|byte| byte.is_ascii_digit()) =>
            {
                document_number = Some(value.into_owned());
            }
            _ => return None,
        }
    }
    let receipt_number = receipt_number?;
    Some((receipt_number, document_number))
}

fn is_ascii_digits(value: &str, min_length: usize, max_length: usize) -> bool {
    (min_length..=max_length).contains(&value.len())
        && value.bytes().all(|byte| byte.is_ascii_digit())
}

pub(crate) fn parse_date(value: &str, parameter: &str) -> Result<NaiveDate, DartyError> {
    if value.len() != 8 || !value.bytes().all(|byte| byte.is_ascii_digit()) {
        return Err(DartyError::invalid(
            format!("{parameter} must be a real date in YYYYMMDD format."),
            parameter,
            "Use a real calendar date in YYYYMMDD format.",
        ));
    }
    NaiveDate::parse_from_str(value, "%Y%m%d").map_err(|_| {
        DartyError::invalid(
            format!("{parameter} must be a real date in YYYYMMDD format."),
            parameter,
            "Use a real calendar date in YYYYMMDD format.",
        )
    })
}

fn subtract_ten_years(end: NaiveDate) -> NaiveDate {
    end.checked_sub_months(Months::new(120)).unwrap_or_else(|| {
        NaiveDate::from_ymd_opt(end.year() - 10, 2, 28).expect("February 28 is valid")
    })
}

pub(crate) fn trim_optional(value: &mut Option<String>, parameter: &str) -> Result<(), DartyError> {
    if let Some(text) = value {
        *text = text.trim().to_owned();
        if text.is_empty() {
            return Err(DartyError::invalid(
                format!("{parameter} must not be empty when supplied."),
                parameter,
                "Omit the filter or provide non-empty text.",
            ));
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use crate::SearchCompanyReportsRequest;

    use super::{extract_receipt, search_company_reports};

    #[test]
    fn report_validation_preserves_unknown_disclosure_code_order() {
        let mut request = SearchCompanyReportsRequest::new("00126380", "20250101", "20260101");
        request.disclosure_types = vec!["A999".to_owned(), "B999".to_owned(), "A999".to_owned()];
        let error = search_company_reports(request).expect_err("unknown codes are rejected");
        assert_eq!(
            error.message,
            "Unsupported DART disclosure type code: A999, B999."
        );
    }

    #[test]
    fn receipt_accepts_only_bare_numbers_or_dart_viewer_urls() {
        assert_eq!(
            extract_receipt("20260101000001"),
            Some(("20260101000001".to_owned(), None))
        );
        assert_eq!(
            extract_receipt(
                "https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260101000001&dcmNo=10000002"
            ),
            Some(("20260101000001".to_owned(), Some("10000002".to_owned())))
        );
        assert_eq!(
            extract_receipt("https://example.invalid/?rcpNo=20260101000001"),
            None
        );
        assert_eq!(
            extract_receipt("https://dart.fss.or.kr/report/viewer.do?rcpNo=20260101000001"),
            None
        );
        assert_eq!(
            extract_receipt("https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260101000001&dcmNo="),
            None
        );
        assert_eq!(
            extract_receipt(
                "https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260101000001&offset=10"
            ),
            None
        );
    }
}
