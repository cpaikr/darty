pub const COMPANY_ABOUT: &str = "Search companies through DART 기업개황 `회사별` mode and return DART 8-digit company codes plus 6-digit stock codes when present.";

pub const COMPANY_AFTER: &str = "Examples:\n  # Find an 8-digit DART company code by company name.\n  darty search-company --company-name 삼성전자\n\n  # Fetch the next page for a broad company-name search.\n  darty search-company --company-name 삼성 --page 2 --page-size 20\n\nNotes:\n  - companyCode is DART's 8-digit company identifier embedded in company links such as select('00126380').\n  - stockCode is a 6-digit listed-company stock code shown only for listed companies; it is not the DART company code.";

pub const REPORTS_ABOUT: &str = "Return company-specific DART filings for an 8-digit DART company code. This operation does not resolve company names; use search-company first when you need companyCode lookup.";

pub const REPORTS_AFTER: &str = "Notes:\n  - If you know the company name but not the company code, first run `darty search-company --company-name <company name>` to find the 8-digit companyCode.\n  - The search period is limited to 10 years. Split longer ranges into windows of 10 years or less because DART can respond as if there are no results.\n  - By default, DART's final-report filter is applied. `--include-all-reports` includes pre-correction filings and may increase the total count.\n  - Pass a result filing.receiptNumber or references.viewerUrl to `view-report` for follow-up retrieval.";

pub const VIEW_ABOUT: &str = "Fetch a DART report document list and table of contents by receipt number or viewer URL, then return the selected body as HTML or Markdown.";

pub const VIEW_AFTER: &str = "Notes:\n  - toc[].id/section ID values are valid only inside one report. Do not reuse them across years, corrections, or other receipt numbers; fetch the TOC for each report first.\n  - If content.window.hasMore is true, continue with the same `--receipt`, `--document-id`, `--section-id`, and `--output-format`, passing content.window.nextStartByte as `--content-start-byte`. This value is based on the rendered body, not DART viewer offsets.\n  - Darty does not process PDFs internally. Download PDF links directly or open them with a separate PDF processing/reading tool.";

pub fn command_help(argv: &[String]) -> Option<&'static str> {
    let mut arguments = argv
        .iter()
        .skip(1)
        .filter(|arg| arg.as_str() != "--debug")
        .map(String::as_str)
        .collect::<Vec<_>>();
    match arguments.as_slice() {
        ["help"] => arguments = vec!["--help"],
        ["help", command] => arguments = vec![command, "--help"],
        _ => {}
    }
    match arguments.as_slice() {
        ["--help" | "-h"] => Some(include_str!("../resources/root-help.txt")),
        ["search-company", "--help" | "-h"] => {
            Some(include_str!("../resources/search-company-help.txt"))
        }
        ["search-company-reports", "--help" | "-h"] => {
            Some(include_str!("../resources/search-company-reports-help.txt"))
        }
        ["search-body", "--help" | "-h"] => Some(include_str!("../resources/search-body-help.txt")),
        ["view-report", "--help" | "-h"] => Some(include_str!("../resources/view-report-help.txt")),
        ["disclosure-types", "--help" | "-h"] => {
            Some(include_str!("../resources/disclosure-types-help.txt"))
        }
        ["company-detail", "--help" | "-h"] => {
            Some(include_str!("../resources/company-detail-help.txt"))
        }
        ["company-rss", "--help" | "-h"] => Some(include_str!("../resources/company-rss-help.txt")),
        ["report-guide", "--help" | "-h"] => {
            Some(include_str!("../resources/report-guide-help.txt"))
        }
        _ => None,
    }
}
