mod help;

use std::process::ExitCode;

use chrono::{Months, NaiveDate};
use clap::{Args, Parser, Subcommand, ValueEnum, error::ErrorKind};
use darty::{
    DartyClient, DartyError, OutputFormat, ResponseDetail, SearchCompanyReportsRequest,
    SearchCompanyRequest, SortDirection, ViewReportRequest,
};
use serde::Serialize;
use serde_json::{Value, json};

#[derive(Debug, Parser)]
#[command(
    name = "darty",
    disable_version_flag = true,
    disable_help_subcommand = true
)]
struct Cli {
    #[command(subcommand)]
    command: Option<Command>,
}

#[derive(Debug, Subcommand)]
enum Command {
    #[command(
        name = "search-company",
        long_about = help::COMPANY_ABOUT,
        after_help = help::COMPANY_AFTER,
        override_usage = "darty search-company [options]",
        next_line_help = false,
        term_width = 240,
        verbatim_doc_comment
    )]
    SearchCompany(SearchCompanyArgs),
    #[command(
        name = "search-company-reports",
        long_about = help::REPORTS_ABOUT,
        after_help = help::REPORTS_AFTER,
        override_usage = "darty search-company-reports [options]",
        next_line_help = false,
        term_width = 240,
        verbatim_doc_comment
    )]
    SearchCompanyReports(SearchCompanyReportsArgs),
    #[command(
        name = "view-report",
        long_about = help::VIEW_ABOUT,
        after_help = help::VIEW_AFTER,
        override_usage = "darty view-report [options]",
        next_line_help = false,
        term_width = 240,
        verbatim_doc_comment
    )]
    ViewReport(ViewReportArgs),
}

#[derive(Debug, Args)]
struct SearchCompanyArgs {
    /// [required] Company-name search term for DART 기업개황 회사별 search. Use at least 2 characters.
    #[arg(long, value_name = "text")]
    company_name: Option<String>,
    /// [default: 1] DART 기업개황 company-search result page, starting at 1.
    #[arg(
        long,
        value_name = "number",
        default_value_t = 1,
        hide_default_value = true
    )]
    page: u32,
    /// [default: 15] Number of companies to request per page (maximum 45).
    #[arg(
        long,
        value_name = "number",
        default_value_t = 15,
        hide_default_value = true
    )]
    page_size: u32,
    /// Print compact agent-focused JSON with contextual next-step help.
    #[arg(long)]
    agent: bool,
    /// Include diagnostic/source fields omitted from the default output.
    #[arg(long)]
    verbose: bool,
    /// Print human-readable indented JSON.
    #[arg(long)]
    pretty: bool,
}

#[derive(Debug, Args)]
#[allow(clippy::struct_excessive_bools)]
struct SearchCompanyReportsArgs {
    /// [required] 8-digit DART company code. Use search-company first if you only know a company name or stock code.
    #[arg(long, value_name = "text")]
    company_code: Option<String>,
    /// [required] DART search period start date (YYYYMMDD). The search period is limited to 10 years.
    #[arg(long, value_name = "YYYYMMDD")]
    start_date: Option<String>,
    /// [required] DART search period end date (YYYYMMDD). The search period is limited to 10 years.
    #[arg(long, value_name = "YYYYMMDD")]
    end_date: Option<String>,
    /// [default: 1] DART search result page, starting at 1.
    #[arg(
        long,
        value_name = "number",
        default_value_t = 1,
        hide_default_value = true
    )]
    page: u32,
    /// [default: 15] Number of filings to request per page (15, 30, 50, 100; 5/10 normalize to 15).
    #[arg(
        long,
        value_name = "number",
        default_value_t = 15,
        hide_default_value = true
    )]
    page_size: u32,
    /// [default: desc] Receipt-date sort direction (asc or desc).
    #[arg(
        long,
        value_name = "asc|desc",
        default_value = "desc",
        hide_default_value = true
    )]
    sort_direction: SortDirectionArg,
    /// Narrow results by 제출인명 (presenter name).
    #[arg(long, value_name = "text")]
    presenter_name: Option<String>,
    /// Narrow results by 보고서명 (report title), for example 사업보고서. Use --disclosure-type for disclosure type codes.
    #[arg(long, value_name = "text")]
    report_name: Option<String>,
    /// Add a 공시상세유형 detailed code. Repeat for multiple codes. Examples: A001(사업보고서), A002(반기보고서), A003(분기보고서), I001(수시공시).
    #[arg(long = "disclosure-type", value_name = "code")]
    disclosure_types: Vec<String>,
    /// Narrow results by DART industry code. Default is all. Example: 612(전기 통신업). Use all if unknown.
    #[arg(
        long,
        value_name = "code",
        default_value = "all",
        hide_default_value = true
    )]
    industry_code: String,
    /// Narrow results by corporation type (all=전체, P=유가증권시장, A=코스닥시장, N=코넥스시장, E=기타법인).
    #[arg(
        long,
        value_name = "all|P|A|N|E",
        default_value = "all",
        hide_default_value = true
    )]
    corporation_type: String,
    /// Narrow results by fiscal closing month (all, 1-12, or 01-12). Values 1-9 normalize to 01-09.
    #[arg(
        long,
        value_name = "all|1-12|01-12",
        default_value = "all",
        hide_default_value = true
    )]
    closing_accounts_month: String,
    /// Include pre-correction filings. Default behavior applies DART's final-report filter.
    #[arg(long)]
    include_all_reports: bool,
    /// [default: concise] Source evidence detail level. evidence contains parser-check fields such as raw DART row text or snippet HTML. concise omits it; detailed/raw include it. raw still does not return full DART source HTML. Use --verbose with the CLI to see evidence.
    #[arg(long, value_name = "concise|detailed|raw")]
    detail: Option<DetailArg>,
    /// Print compact agent-focused JSON with contextual next-step help.
    #[arg(long)]
    agent: bool,
    /// Include source evidence and diagnostic fields omitted from the default CLI output. If --detail is omitted, request detail=raw.
    #[arg(long)]
    verbose: bool,
    /// Print human-readable indented JSON.
    #[arg(long)]
    pretty: bool,
}

#[derive(Debug, Args)]
struct ViewReportArgs {
    /// [required] DART receipt number or viewer URL
    #[arg(long, value_name = "receipt-or-url")]
    receipt: Option<String>,
    /// Darty document ID to fetch (documents[].id, not DART dcmNo)
    #[arg(long, value_name = "id")]
    document_id: Option<String>,
    /// TOC section ID to fetch (toc[].id). It is report-specific; do not reuse it across reports.
    #[arg(long, value_name = "id")]
    section_id: Option<String>,
    /// [default: markdown] Body format in the JSON result (html or markdown)
    #[arg(
        long,
        value_name = "html|markdown",
        default_value = "markdown",
        hide_default_value = true
    )]
    output_format: OutputFormatArg,
    /// [default: 50000, range: 1000~1000000] Maximum body bytes to return. Larger values can increase output/context size.
    #[arg(
        long,
        value_name = "number",
        default_value_t = 50_000,
        hide_default_value = true
    )]
    max_bytes: u32,
    /// [default: 0] UTF-8 start byte in the rendered body. Continue with the same outputFormat.
    #[arg(
        long,
        value_name = "number",
        default_value_t = 0,
        hide_default_value = true
    )]
    content_start_byte: u32,
    /// [default: concise] Supplemental locator detail level. Locators are documents/toc identifier lists used for follow-up retrieval. This does not change content.body rendering or windows. For sectionId requests, concise omits documents/toc; detailed/raw include them.
    #[arg(long, value_name = "concise|detailed|raw")]
    detail: Option<DetailArg>,
    /// Include TOC entries to the specified depth. For section body output, this also enables TOC inclusion.
    #[arg(long, value_name = "number")]
    toc_depth: Option<u32>,
    /// Include locator fields (documents/toc) and diagnostics omitted from the default CLI output. If --detail is omitted, request detail=raw.
    #[arg(long)]
    verbose: bool,
    /// Print human-readable indented JSON.
    #[arg(long)]
    pretty: bool,
}

#[derive(Debug, Clone, Copy, ValueEnum)]
enum SortDirectionArg {
    Asc,
    Desc,
}

#[derive(Debug, Clone, Copy, ValueEnum)]
enum DetailArg {
    Concise,
    Detailed,
    Raw,
}

#[derive(Debug, Clone, Copy, ValueEnum)]
enum OutputFormatArg {
    Html,
    Markdown,
}

#[tokio::main]
async fn main() -> ExitCode {
    let argv = std::env::args().collect::<Vec<_>>();
    if let Some(command_help) = help::command_help(&argv) {
        print!("{command_help}");
        return ExitCode::SUCCESS;
    }
    if let Some(problem) = preparse_failure(&argv) {
        write_value(&problem.value, problem.pretty);
        return ExitCode::FAILURE;
    }
    let cli = match Cli::try_parse_from(&argv) {
        Ok(cli) => cli,
        Err(error)
            if matches!(
                error.kind(),
                ErrorKind::DisplayHelp | ErrorKind::DisplayVersion
            ) =>
        {
            print!("{error}");
            return ExitCode::SUCCESS;
        }
        Err(error) => {
            let pretty = argv.iter().any(|value| value == "--pretty");
            let rendered_error = error.to_string();
            let message = rendered_error
                .lines()
                .next()
                .unwrap_or("Invalid command options.");
            write_value(
                &failure(message, None, "Run darty --help for options and examples."),
                pretty,
            );
            return ExitCode::FAILURE;
        }
    };
    match run(cli).await {
        Ok(()) => ExitCode::SUCCESS,
        Err(problem) => {
            write_value(&problem.value, problem.pretty);
            ExitCode::FAILURE
        }
    }
}

async fn run(cli: Cli) -> Result<(), CliFailure> {
    let Some(command) = cli.command else {
        write_value(
            &json!({
                "result": {"name": "darty", "operations": ["search-company", "search-company-reports", "view-report"]},
                "metadata": {"cliTransportVersion": "1", "output": "home"},
                "references": {}, "warnings": [], "help": ["Run darty --help for command help."]
            }),
            false,
        );
        return Ok(());
    };
    let client = client().map_err(|error| CliFailure::sdk(&error, false))?;
    match command {
        Command::SearchCompany(args) => run_company(&client, args).await,
        Command::SearchCompanyReports(args) => run_reports(&client, args).await,
        Command::ViewReport(args) => run_view(&client, args).await,
    }
}

async fn run_company(client: &DartyClient, args: SearchCompanyArgs) -> Result<(), CliFailure> {
    let Some(company_name) = args.company_name else {
        return Err(CliFailure::new(
            failure(
                "Missing required option \"--company-name\". Expected string with at least 2 characters.",
                Some("companyName"),
                "Run darty search-company --help for options and examples.",
            ),
            args.pretty,
        ));
    };
    if company_name.trim().chars().count() < 2 {
        return Err(CliFailure::new(
            failure(
                "Option \"--company-name\" must be at least 2 characters long.",
                Some("companyName"),
                "Run darty search-company --help for options and examples.",
            ),
            args.pretty,
        ));
    }
    if !(1..=45).contains(&args.page_size) {
        return Err(CliFailure::new(
            failure(
                "Option \"--page-size\" must be between 1 and 45.",
                Some("pageSize"),
                "pageSize must be integer between 1 and 45.",
            ),
            args.pretty,
        ));
    }
    let mut request = SearchCompanyRequest::new(company_name);
    request.page = args.page;
    request.page_size = args.page_size;
    let response = client
        .search_company(request)
        .await
        .map_err(|error| CliFailure::sdk(&error, args.pretty))?;
    let value = present_search(response, args.verbose, args.agent, SearchKind::Company);
    write_value(&value, args.pretty);
    Ok(())
}

async fn run_reports(
    client: &DartyClient,
    args: SearchCompanyReportsArgs,
) -> Result<(), CliFailure> {
    let Some(company_code) = args.company_code else {
        return Err(CliFailure::new(
            failure(
                "Missing required option \"--company-code\". Expected [required] 8-digit DART company code. Company names and 6-digit stock codes are not accepted.",
                Some("companyCode"),
                "If you only know a company name or 6-digit stock code, first use search-company to find the 8-digit companyCode, then call this operation again.",
            ),
            args.pretty,
        ));
    };
    if company_code.len() != 8 || !company_code.bytes().all(|byte| byte.is_ascii_digit()) {
        return Err(CliFailure::new(
            failure(
                "Option \"--company-code\" must be an 8-digit DART company code. Company names and 6-digit stock codes are not accepted. Example: Samsung Electronics DART company code 00126380.",
                Some("companyCode"),
                "If you only know a company name or 6-digit stock code, first use search-company to find the 8-digit companyCode, then call this operation again.",
            ),
            args.pretty,
        ));
    }
    let start_date = required(args.start_date, "--start-date", "startDate", args.pretty)?;
    let end_date = required(args.end_date, "--end-date", "endDate", args.pretty)?;
    if let (Ok(start), Ok(end)) = (
        NaiveDate::parse_from_str(&start_date, "%Y%m%d"),
        NaiveDate::parse_from_str(&end_date, "%Y%m%d"),
    ) {
        let earliest = end.checked_sub_months(Months::new(120)).unwrap_or(end);
        if start < earliest {
            return Err(CliFailure::new(
                failure(
                    format!(
                        "search-company-reports search period is limited to 10 years. startDate={start_date}, endDate={end_date}; the earliest allowed startDate for this endDate is {}. Split longer periods into windows of 10 years or less.",
                        earliest.format("%Y%m%d")
                    ),
                    Some("startDate"),
                    "Because of DART behavior, call search-company-reports with date windows of 10 years or less.",
                ),
                args.pretty,
            ));
        }
    }
    let mut request = SearchCompanyReportsRequest::new(company_code, start_date, end_date);
    request.page = args.page;
    request.page_size = args.page_size;
    request.sort_direction = match args.sort_direction {
        SortDirectionArg::Asc => SortDirection::Asc,
        SortDirectionArg::Desc => SortDirection::Desc,
    };
    request.presenter_name = args.presenter_name;
    request.report_name = args.report_name;
    request.disclosure_types = args.disclosure_types;
    request.industry_code = args.industry_code;
    request.corporation_type = args.corporation_type;
    request.closing_accounts_month = args.closing_accounts_month;
    request.include_all_reports = args.include_all_reports;
    request.detail = detail(args.detail, args.verbose);
    let response = client
        .search_company_reports(request)
        .await
        .map_err(|error| CliFailure::sdk(&error, args.pretty))?;
    let value = present_search(response, args.verbose, args.agent, SearchKind::Reports);
    write_value(&value, args.pretty);
    Ok(())
}

async fn run_view(client: &DartyClient, args: ViewReportArgs) -> Result<(), CliFailure> {
    let Some(receipt) = args.receipt else {
        return Err(CliFailure::new(
            failure(
                "Missing required option \"--receipt\". Expected 14-digit DART receipt number or /dsaf001/main.do viewer URL containing rcpNo.",
                Some("receipt"),
                "Pass receiptNumber or viewerUrl from search-body/search-company-reports results as receipt.",
            ),
            args.pretty,
        ));
    };
    let mut request = ViewReportRequest::new(receipt);
    request.document_id = args.document_id;
    request.section_id = args.section_id;
    request.output_format = match args.output_format {
        OutputFormatArg::Html => OutputFormat::Html,
        OutputFormatArg::Markdown => OutputFormat::Markdown,
    };
    request.max_bytes = args.max_bytes;
    request.content_start_byte = args.content_start_byte;
    request.detail = detail(args.detail, args.verbose || args.toc_depth.is_some());
    let response = client
        .view_report(request)
        .await
        .map_err(|error| CliFailure::sdk(&error, args.pretty))?;
    let mut value = serde_json::to_value(response).expect("SDK response serializes");
    if let Some(depth) = args.toc_depth
        && let Some(toc) = value["result"]["toc"].as_array_mut()
    {
        limit_toc(toc, depth);
    }
    value["help"] = json!(["Use returned document and section IDs only with this report."]);
    write_value(&value, args.pretty);
    Ok(())
}

fn required(
    value: Option<String>,
    flag: &str,
    parameter: &str,
    pretty: bool,
) -> Result<String, CliFailure> {
    value.ok_or_else(|| {
        CliFailure::new(
            failure(
                format!("Missing required option \"{flag}\". Expected date in YYYYMMDD format."),
                Some(parameter),
                "Run darty search-company-reports --help for options and examples.",
            ),
            pretty,
        )
    })
}

fn detail(value: Option<DetailArg>, expanded_default: bool) -> ResponseDetail {
    match value {
        Some(DetailArg::Detailed) => ResponseDetail::Detailed,
        Some(DetailArg::Raw) => ResponseDetail::Raw,
        None if expanded_default => ResponseDetail::Raw,
        Some(DetailArg::Concise) | None => ResponseDetail::Concise,
    }
}

#[derive(Clone, Copy)]
enum SearchKind {
    Company,
    Reports,
}

fn present_search<T: Serialize>(
    response: T,
    verbose: bool,
    agent: bool,
    kind: SearchKind,
) -> Value {
    let mut value = serde_json::to_value(response).expect("SDK response serializes");
    let first = value["result"]["items"].get(0).cloned();
    if (!verbose || agent)
        && let Some(items) = value["result"]["items"].as_array_mut()
    {
        for item in items {
            if let Some(item) = item.as_object_mut() {
                item.remove("evidence");
            }
        }
    }
    if agent {
        if let Some(items) = value["result"]["items"].as_array_mut() {
            for item in items {
                *item = match kind {
                    SearchKind::Company => company_agent_item(item),
                    SearchKind::Reports => reports_agent_item(item),
                };
            }
        }
        value["metadata"] = json!({"output": "agent", "source": value["metadata"]["source"].clone(), "completeness": value["metadata"]["completeness"].clone()});
    }
    value["help"] = match (kind, first.as_ref()) {
        (SearchKind::Company, Some(item)) => json!([format!(
            "Search filings: darty search-company-reports --company-code {} --start-date YYYYMMDD --end-date YYYYMMDD --agent",
            item["companyCode"].as_str().unwrap_or_default()
        )]),
        (SearchKind::Reports, Some(item)) => {
            let receipt = item["filing"]["receiptNumber"].as_str().unwrap_or_default();
            json!([
                format!("Inspect filing TOC: darty view-report --receipt {receipt}"),
                format!(
                    "Read a returned section: darty view-report --receipt {receipt} --section-id <toc[].id>"
                )
            ])
        }
        (SearchKind::Company, None) => json!([
            "No companies matched. Try a shorter company-name fragment or verify Korean spacing."
        ]),
        (SearchKind::Reports, None) => {
            json!(["No filings matched. Widen the date range or relax filters."])
        }
    };
    value
}

fn company_agent_item(item: &Value) -> Value {
    let mut projected = serde_json::Map::new();
    copy_field(&mut projected, item, "companyCode", "companyCode");
    copy_field(&mut projected, item, "companyName", "companyName");
    copy_field(&mut projected, item, "stockCode", "stockCode");
    copy_field(&mut projected, item, "marketKind", "marketKind");
    copy_field(&mut projected, item, "marketLabel", "marketLabel");
    copy_field(
        &mut projected,
        &item["references"],
        "detailEndpoint",
        "detailEndpoint",
    );
    Value::Object(projected)
}

fn reports_agent_item(item: &Value) -> Value {
    let mut projected = serde_json::Map::new();
    copy_field(
        &mut projected,
        &item["company"],
        "companyCode",
        "companyCode",
    );
    copy_field(&mut projected, &item["company"], "name", "companyName");
    copy_field(
        &mut projected,
        &item["filing"],
        "receiptNumber",
        "receiptNumber",
    );
    copy_field(
        &mut projected,
        &item["filing"],
        "reportTitle",
        "reportTitle",
    );
    copy_field(
        &mut projected,
        &item["filing"],
        "receiptDate",
        "receiptDate",
    );
    copy_field(
        &mut projected,
        &item["filing"],
        "presenterName",
        "presenterName",
    );
    copy_field(
        &mut projected,
        &item["references"],
        "viewerUrl",
        "viewerUrl",
    );
    copy_field(
        &mut projected,
        &item["matchedDisclosureType"],
        "code",
        "disclosureTypeCode",
    );
    copy_field(
        &mut projected,
        &item["matchedDisclosureType"],
        "label",
        "disclosureTypeLabel",
    );
    Value::Object(projected)
}

fn copy_field(
    target: &mut serde_json::Map<String, Value>,
    source: &Value,
    source_key: &str,
    target_key: &str,
) {
    if let Some(value) = source.get(source_key)
        && !value.is_null()
    {
        target.insert(target_key.to_owned(), value.clone());
    }
}

fn limit_toc(nodes: &mut Vec<Value>, depth: u32) {
    if depth == 0 {
        nodes.clear();
        return;
    }
    for node in nodes {
        if let Some(children) = node["children"].as_array_mut() {
            limit_toc(children, depth - 1);
        }
    }
}

fn preparse_failure(argv: &[String]) -> Option<CliFailure> {
    let pretty = argv.iter().any(|value| value == "--pretty");
    if argv.iter().any(|value| value == "--dcm-no") {
        return Some(CliFailure::new(
            failure(
                "error: unknown option '--dcm-no'",
                Some("--dcm-no"),
                "Run darty view-report --help for options and examples.",
            ),
            pretty,
        ));
    }
    if let Some(rejected) = argv.windows(2).find_map(|pair| {
        (pair[0] == "--content-start-byte" && pair[1].starts_with('-')).then_some(&pair[1])
    }) {
        return Some(CliFailure::new(
            failure(
                format!(
                    "error: option '--content-start-byte <number>' argument '{rejected}' is invalid. Expected an integer greater than or equal to 0."
                ),
                Some("--content-start-byte"),
                "Run darty view-report --help for options and examples.",
            ),
            pretty,
        ));
    }
    None
}

fn failure(message: impl Into<String>, parameter: Option<&str>, hint: &str) -> Value {
    let mut error = json!({"code": "invalid_request", "message": message.into(), "retryable": false, "recoveryHint": hint});
    if let Some(parameter) = parameter {
        error["parameter"] = json!(parameter);
    }
    json!({"result": null, "metadata": {"cliTransportVersion": "1"}, "references": {}, "warnings": [], "error": error})
}

struct CliFailure {
    value: Value,
    pretty: bool,
}

impl CliFailure {
    const fn new(value: Value, pretty: bool) -> Self {
        Self { value, pretty }
    }
    fn sdk(error: &DartyError, pretty: bool) -> Self {
        Self::new(
            json!({"result": null, "metadata": {"cliTransportVersion": "1"}, "references": {}, "warnings": [], "error": error}),
            pretty,
        )
    }
}

fn write_value(value: &Value, pretty: bool) {
    let rendered = if pretty {
        serde_json::to_string_pretty(value)
    } else {
        serde_json::to_string(value)
    }
    .expect("CLI envelopes serialize");
    println!("{rendered}");
}

fn client() -> Result<DartyClient, DartyError> {
    #[cfg(feature = "fixture-origin")]
    if let Ok(origin) = std::env::var("DARTY_FIXTURE_ORIGIN") {
        let fetched_at = std::env::var("DARTY_FIXTURE_FETCHED_AT")
            .unwrap_or_else(|_| "2026-08-22T00:00:00.000Z".to_owned());
        let origin = url::Url::parse(&origin).map_err(|_| DartyError {
            code: darty::ErrorCode::InternalError,
            message: "Invalid fixture origin.".to_owned(),
            retryable: false,
            parameter: None,
            source_url: None,
            recovery_hint: None,
        })?;
        return DartyClient::for_fixture_origin(origin, fetched_at);
    }
    DartyClient::new()
}

#[cfg(test)]
mod tests {
    use super::preparse_failure;

    #[test]
    fn negative_window_error_reports_the_rejected_argument() {
        let argv = [
            "view-report".to_owned(),
            "--content-start-byte".to_owned(),
            "-27".to_owned(),
        ];
        let failure = preparse_failure(&argv).expect("negative argument is rejected");
        assert!(
            failure.value["error"]["message"]
                .as_str()
                .unwrap()
                .contains("'-27'")
        );
        assert_eq!(failure.value["error"]["parameter"], "--content-start-byte");
    }
}
