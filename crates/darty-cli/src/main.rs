mod help;
mod operations;

use std::process::ExitCode;

use chrono::{Months, NaiveDate};
use clap::{Args, Parser, Subcommand, ValueEnum, error::ErrorKind};
use darty::{
    DartyClient, DartyError, ErrorCode, OutputFormat, ResponseDetail, SearchCompanyReportsRequest,
    SearchCompanyRequest, SortDirection, ViewReportRequest, ViewReportResponse,
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
    /// Write bounded error classification diagnostics to stderr on failure.
    #[arg(long, global = true)]
    debug: bool,
    #[command(subcommand)]
    command: Option<Command>,
}

#[derive(Debug, Subcommand)]
enum Command {
    SearchBody(operations::SearchBodyArgs),
    CompanyDetail(operations::CompanyDetailArgs),
    CompanyRss(operations::CompanyRssArgs),
    DisclosureTypes(operations::DisclosureTypesArgs),
    ReportGuide,
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
    #[arg(
        long,
        value_name = "number",
        value_parser = clap::value_parser!(u32).range(1..)
    )]
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
    let debug = argv.iter().any(|arg| arg == "--debug");
    if let Some(command_help) = help::command_help(&argv) {
        print!("{command_help}");
        return ExitCode::SUCCESS;
    }
    if let Some(problem) = preparse_failure(&argv) {
        write_failure(&problem.value, problem.pretty, debug);
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
            if error.kind() == ErrorKind::InvalidSubcommand {
                let command = argv
                    .iter()
                    .skip(1)
                    .find(|arg| !arg.starts_with('-'))
                    .map_or("", String::as_str);
                write_failure(
                    &failure(
                        format!("error: unknown command '{command}'"),
                        None,
                        "Run darty --help to list commands.",
                    ),
                    pretty,
                    debug,
                );
                return ExitCode::FAILURE;
            }
            let rendered_error = error.to_string();
            let message = rendered_error
                .lines()
                .next()
                .unwrap_or("Invalid command options.");
            write_failure(
                &failure(message, None, "Run darty --help for options and examples."),
                pretty,
                debug,
            );
            return ExitCode::FAILURE;
        }
    };
    match run(cli).await {
        Ok(()) => ExitCode::SUCCESS,
        Err(problem) => {
            write_failure(&problem.value, problem.pretty, debug);
            ExitCode::FAILURE
        }
    }
}

fn write_failure(value: &Value, pretty: bool, debug: bool) {
    write_value(value, pretty);
    if debug {
        // Do not log request values, provider bodies, or unsanitized cause text.
        eprintln!(
            "{}",
            json!({"diagnostics": {
                "code": value["error"]["code"],
                "retryable": value["error"]["retryable"]
            }})
        );
    }
}

async fn run(cli: Cli) -> Result<(), CliFailure> {
    // Failure diagnostics are emitted at the process boundary in main.
    let Cli { command, debug: _ } = cli;
    let Some(command) = command else {
        print!("{}", include_str!("../resources/home.json"));
        return Ok(());
    };
    let client = client().map_err(|error| CliFailure::sdk(&error, false, &[], &[]))?;
    match command {
        Command::SearchBody(args) => operations::run_body(&client, args).await,
        Command::CompanyDetail(args) => operations::run_detail(&client, args).await,
        Command::CompanyRss(args) => operations::run_rss(&client, args).await,
        Command::DisclosureTypes(args) => operations::run_types(&client, args),
        Command::ReportGuide => {
            println!(
                "{}",
                client
                    .report_guide(darty::ReportGuideRequest {})
                    .result
                    .content_markdown
            );
            Ok(())
        }
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
        .map_err(|error| CliFailure::sdk(&error, args.pretty, COMPANY_CLI_PARAMETERS, &[]))?;
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
    let validation_values = [
        ("startDate", start_date.as_str()),
        ("endDate", end_date.as_str()),
    ];
    let mut request =
        SearchCompanyReportsRequest::new(company_code, start_date.clone(), end_date.clone());
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
    request.detail = detail(
        args.detail,
        if args.verbose {
            ResponseDetail::Raw
        } else {
            ResponseDetail::Concise
        },
    );
    let response = client
        .search_company_reports(request)
        .await
        .map_err(|error| {
            CliFailure::sdk(
                &error,
                args.pretty,
                REPORTS_CLI_PARAMETERS,
                &validation_values,
            )
        })?;
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
    if !(1_000..=1_000_000).contains(&args.max_bytes) {
        return Err(CliFailure::new(
            failure(
                "Option \"--max-bytes\" is invalid. Expected integer between 1,000 and 1,000,000.",
                Some("maxBytes"),
                "maxBytes must be integer between 1,000 and 1,000,000. Start low and increase only when needed.",
            ),
            args.pretty,
        ));
    }
    let mut request = ViewReportRequest::new(receipt);
    request.document_id = args.document_id;
    request.section_id = args.section_id;
    request.output_format = match args.output_format {
        OutputFormatArg::Html => OutputFormat::Html,
        OutputFormatArg::Markdown => OutputFormat::Markdown,
    };
    request.max_bytes = args.max_bytes;
    request.content_start_byte = args.content_start_byte;
    request.detail = detail(
        args.detail,
        if args.verbose {
            ResponseDetail::Raw
        } else if args.toc_depth.is_some() {
            ResponseDetail::Detailed
        } else {
            ResponseDetail::Concise
        },
    );
    let response = client
        .view_report(request)
        .await
        .map_err(|error| CliFailure::sdk(&error, args.pretty, VIEW_CLI_PARAMETERS, &[]))?;
    let help = view_help(&response);
    let mut value = serde_json::to_value(response).expect("SDK response serializes");
    if let Some(depth) = args.toc_depth
        && let Some(toc) = value["result"]["toc"].as_array_mut()
    {
        limit_toc(toc, depth);
    }
    value["help"] = json!(help);
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

fn detail(value: Option<DetailArg>, default: ResponseDetail) -> ResponseDetail {
    match value {
        Some(DetailArg::Detailed) => ResponseDetail::Detailed,
        Some(DetailArg::Raw) => ResponseDetail::Raw,
        Some(DetailArg::Concise) => ResponseDetail::Concise,
        None => default,
    }
}

fn view_help(response: &ViewReportResponse) -> Vec<String> {
    let request = &response.result.request;
    let document_argument = request.document_id.as_ref().map_or_else(String::new, |id| {
        format!(" --document-id {}", quote_cli_value(id))
    });
    if let Some(content) = response
        .result
        .content
        .as_ref()
        .filter(|content| content.window.has_more)
        && let Some(next_start_byte) = content.window.next_start_byte
    {
        let format = match request.output_format {
            OutputFormat::Html => "html",
            OutputFormat::Markdown => "markdown",
        };
        let mut command = format!(
            "Continue content: darty view-report --receipt {} --content-start-byte {next_start_byte} --max-bytes {} --output-format {format}",
            quote_cli_value(&request.receipt),
            request.max_bytes
        );
        if let Some(document_id) = &request.document_id {
            command.push_str(" --document-id ");
            command.push_str(&quote_cli_value(document_id));
        }
        if let Some(section_id) = &request.section_id {
            command.push_str(" --section-id ");
            command.push_str(&quote_cli_value(section_id));
        }
        return vec![command];
    }

    if request.section_id.is_some() {
        let mut help = Vec::new();
        if let Some(next) = response
            .result
            .navigation
            .as_ref()
            .and_then(|navigation| navigation.next.as_ref())
        {
            help.push(format!(
                "Read next section: darty view-report --receipt {}{} --section-id {}",
                quote_cli_value(&request.receipt),
                document_argument,
                quote_cli_value(&next.id)
            ));
        }
        if let Some(previous) = response
            .result
            .navigation
            .as_ref()
            .and_then(|navigation| navigation.previous.as_ref())
        {
            help.push(format!(
                "Read previous section: darty view-report --receipt {}{} --section-id {}",
                quote_cli_value(&request.receipt),
                document_argument,
                quote_cli_value(&previous.id)
            ));
        }
        help.push("Rerun with --toc-depth <number> when you need nearby TOC context.".to_owned());
        return help;
    }

    if let Some(first) = response.result.toc.as_ref().and_then(|toc| toc.first()) {
        return vec![
            format!(
                "Read first section: darty view-report --receipt {}{} --section-id {}",
                quote_cli_value(&request.receipt),
                document_argument,
                quote_cli_value(&first.id)
            ),
            "Choose a different returned toc[].id to read another section.".to_owned(),
            "Use --toc-depth <number> to limit TOC output depth in the CLI.".to_owned(),
        ];
    }

    vec![
        "This document has no returned TOC. Use the returned content.window fields to continue if content is truncated."
            .to_owned(),
    ]
}

fn quote_cli_value(value: &str) -> String {
    if !value.is_empty()
        && value.bytes().all(|byte| {
            byte.is_ascii_alphanumeric()
                || matches!(
                    byte,
                    b'_' | b'.' | b'/' | b':' | b'@' | b'%' | b'+' | b'=' | b',' | b'-'
                )
        })
    {
        value.to_owned()
    } else {
        format!("'{}'", value.replace('\'', "'\\''"))
    }
}

#[derive(Clone, Copy)]
enum SearchKind {
    Company,
    Reports,
    Body,
}

const COMPANY_CLI_PARAMETERS: &[(&str, &str)] = &[
    ("companyName", "--company-name"),
    ("page", "--page"),
    ("pageSize", "--page-size"),
];

const REPORTS_CLI_PARAMETERS: &[(&str, &str)] = &[
    ("companyCode", "--company-code"),
    ("startDate", "--start-date"),
    ("endDate", "--end-date"),
    ("page", "--page"),
    ("pageSize", "--page-size"),
    ("presenterName", "--presenter-name"),
    ("reportName", "--report-name"),
    ("disclosureTypes", "--disclosure-type"),
    ("industryCode", "--industry-code"),
    ("corporationType", "--corporation-type"),
    ("closingAccountsMonth", "--closing-accounts-month"),
    ("includeAllReports", "--include-all-reports"),
    ("detail", "--detail"),
];

const VIEW_CLI_PARAMETERS: &[(&str, &str)] = &[
    ("receipt", "--receipt"),
    ("documentId", "--document-id"),
    ("sectionId", "--section-id"),
    ("outputFormat", "--output-format"),
    ("maxBytes", "--max-bytes"),
    ("contentStartByte", "--content-start-byte"),
    ("detail", "--detail"),
];

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
                    SearchKind::Body => operations::body_agent_item(item),
                };
            }
        }
        value["metadata"] = json!({"output": "agent", "source": value["metadata"]["source"].clone(), "completeness": value["metadata"]["completeness"].clone()});
    }
    value["help"] = match (kind, first.as_ref()) {
        (SearchKind::Body, _) => operations::body_help(&value, first.as_ref()),
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
    let command = argv
        .iter()
        .skip(1)
        .map(String::as_str)
        .find(|value| *value != "--debug")
        .filter(|value| {
            matches!(
                *value,
                "search-company"
                    | "search-company-reports"
                    | "view-report"
                    | "search-body"
                    | "company-detail"
                    | "company-rss"
                    | "disclosure-types"
                    | "report-guide"
            )
        });
    if command == Some("view-report") && argv.iter().any(|value| value == "--dcm-no") {
        return Some(CliFailure::new(
            failure(
                "error: unknown option '--dcm-no'",
                Some("--dcm-no"),
                "Run darty view-report --help for options and examples.",
            ),
            pretty,
        ));
    }
    if let Some((option, rejected)) = argv.iter().enumerate().find_map(|(index, value)| {
        if value == "--toc-depth" {
            return Some((value.as_str(), argv.get(index + 1).map(String::as_str)));
        }
        value
            .strip_prefix("--toc-depth=")
            .map(|argument| (value.as_str(), Some(argument)))
    }) {
        if command != Some("view-report") {
            let hint = command.map_or_else(
                || "Run darty --help for options and commands.".to_owned(),
                |command| format!("Run darty {command} --help for options and examples."),
            );
            return Some(CliFailure::new(
                failure(
                    format!("error: unknown option '{option}'"),
                    Some(option),
                    &hint,
                ),
                pretty,
            ));
        }
        if let Some(rejected) = rejected {
            let is_unsigned_integer =
                !rejected.is_empty() && rejected.bytes().all(|byte| byte.is_ascii_digit());
            if !is_unsigned_integer {
                return Some(CliFailure::new(
                    failure(
                        format!(
                            "error: option '--toc-depth <number>' argument '{rejected}' is invalid. Expected an integer but received \"{rejected}\"."
                        ),
                        Some("--toc-depth"),
                        "Run darty view-report --help for options and examples.",
                    ),
                    pretty,
                ));
            }
            if rejected.bytes().all(|byte| byte == b'0') {
                return Some(CliFailure::new(
                    failure(
                        format!(
                            "error: option '--toc-depth <number>' argument '{rejected}' is invalid. Expected an integer greater than or equal to 1."
                        ),
                        Some("--toc-depth"),
                        "Run darty view-report --help for options and examples.",
                    ),
                    pretty,
                ));
            }
        }
    }
    if command == Some("view-report")
        && let Some(rejected) = argv.windows(2).find_map(|pair| {
            (pair[0] == "--content-start-byte" && pair[1].starts_with('-')).then_some(&pair[1])
        })
    {
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
    fn sdk(
        error: &DartyError,
        pretty: bool,
        parameters: &[(&str, &str)],
        actuals: &[(&str, &str)],
    ) -> Self {
        let mut error = error.clone();
        if error.code == ErrorCode::InvalidRequest
            && let Some(parameter) = error.parameter.clone()
            && let Some(flag) = parameters
                .iter()
                .find_map(|(semantic, flag)| (*semantic == parameter).then_some(*flag))
        {
            apply_cli_validation_copy(&mut error, &parameter, flag, actuals);
        }
        Self::new(
            json!({"result": null, "metadata": {"cliTransportVersion": "1"}, "references": {}, "warnings": [], "error": error}),
            pretty,
        )
    }
}

fn apply_cli_validation_copy(
    error: &mut DartyError,
    parameter: &str,
    flag: &str,
    actuals: &[(&str, &str)],
) {
    if apply_paging_and_date_copy(error, parameter, flag, actuals)
        || apply_report_filter_copy(error, parameter, flag)
        || apply_view_validation_copy(error, parameter, flag)
    {
        return;
    }
    error.message = error.message.replace(parameter, flag);
}

fn apply_paging_and_date_copy(
    error: &mut DartyError,
    parameter: &str,
    flag: &str,
    actuals: &[(&str, &str)],
) -> bool {
    let actual = |name: &str| {
        actuals
            .iter()
            .find_map(|(parameter, value)| (*parameter == name).then_some(*value))
            .unwrap_or("")
    };
    match parameter {
        "page" => {
            error.message = format!("Option \"{flag}\" must be between 1 and 100.");
            error.recovery_hint = Some(
                "page must be integer between 1 and 100. If the page is out of range, retry with a smaller page number."
                    .to_owned(),
            );
            true
        }
        "pageSize" if error.message.contains("one of") => {
            error.message = format!("Option \"{flag}\" must be one of: 5, 10, 15, 30, 50, 100.");
            error.recovery_hint = Some("pageSize must be 5, 10, 15, 30, 50, 100.".to_owned());
            true
        }
        "startDate" | "endDate" if error.message.contains("real date") => {
            let value = actual(parameter);
            error.message = if value.len() == 8 && value.bytes().all(|byte| byte.is_ascii_digit()) {
                format!(
                    "Option \"{flag}\" must be a real date in YYYYMMDD format. \"{value}\" is not a valid date."
                )
            } else {
                format!("Option \"{flag}\" must use YYYYMMDD format.")
            };
            error.recovery_hint = Some(
                "Dates must be real YYYYMMDD dates, and startDate cannot be after endDate."
                    .to_owned(),
            );
            true
        }
        "startDate" if error.message.contains("on or before") => {
            error.message = format!(
                "startDate cannot be after endDate. startDate={}, endDate={}.",
                actual("startDate"),
                actual("endDate")
            );
            error.recovery_hint = Some(
                "Dates must be real YYYYMMDD dates, and startDate cannot be after endDate."
                    .to_owned(),
            );
            true
        }
        _ => false,
    }
}

fn apply_report_filter_copy(error: &mut DartyError, parameter: &str, flag: &str) -> bool {
    match parameter {
        "presenterName" | "reportName" => {
            error.message = format!("Option \"{flag}\" cannot be empty.");
            if error.recovery_hint.as_deref()
                != Some("Run darty search-body --help for options and examples.")
            {
                error.recovery_hint = Some(
                    "Run darty search-company-reports --help for options and examples.".to_owned(),
                );
            }
            true
        }
        "disclosureTypes" => {
            let unknown_codes = error
                .message
                .strip_prefix("Unsupported DART disclosure type code: ")
                .and_then(|value| value.strip_suffix('.'))
                .map(|value| value.split(", ").collect::<Vec<_>>())
                .filter(|values| {
                    !values.is_empty()
                        && values.iter().all(|value| {
                            value.len() == 4
                                && (b'A'..=b'J').contains(&value.as_bytes()[0])
                                && value.as_bytes()[1..].iter().all(u8::is_ascii_digit)
                        })
                });
            error.message = unknown_codes.map_or_else(
                || format!(
                    "Option \"{flag}\" must be an array of DART 공시상세유형 detailed codes, for example [\"A001\"](사업보고서), [\"A002\"](반기보고서), [\"A003\"](분기보고서), or [\"I001\"](수시공시). Use reportName for report-title text such as \"사업보고서\"."
                ),
                |codes| format!(
                    "Option \"{flag}\" contains unknown DART 공시상세유형 detailed code(s): {}. Common codes include A001=사업보고서, A002=반기보고서, A003=분기보고서, F001=감사보고서, and I001=수시공시. If you do not know the code, use the disclosure-types operation or darty disclosure-types --query, and put report-title text in reportName.",
                    codes.join(", ")
                ),
            );
            error.recovery_hint = Some(
                "Pass known DART 공시상세유형 detailed codes (A001=사업보고서, A002=반기보고서, A003=분기보고서, I001=수시공시, etc.) as an array. If you do not know the code, use the disclosure-types operation or darty disclosure-types --query <term>, and put report-title text in reportName."
                    .to_owned(),
            );
            true
        }
        "industryCode" => {
            error.message = format!(
                "Option \"{flag}\" must be \"all\", a DART industry code such as 612=전기 통신업, or a ROOTdddd DART industry tree root. Use \"all\" if the industry is unknown."
            );
            error.recovery_hint = Some(
                "Pass \"all\", a DART industry code such as 612=전기 통신업, or a ROOTdddd DART industry tree root. Use \"all\" if the industry is unknown."
                    .to_owned(),
            );
            true
        }
        "corporationType" => {
            error.message = format!(
                "Option \"{flag}\" must be one of all(전체), P(유가증권시장), A(코스닥시장), N(코넥스시장), or E(기타법인)."
            );
            error.recovery_hint = Some(
                "Use one of all(전체), P(유가증권시장), A(코스닥시장), N(코넥스시장), or E(기타법인)."
                    .to_owned(),
            );
            true
        }
        "closingAccountsMonth" => {
            error.message = format!(
                "Option \"{flag}\" must be all or a two-digit fiscal closing month code from 01 through 12. Example: January is \"01\", December is \"12\"."
            );
            error.recovery_hint = Some(
                "Use all or a two-digit fiscal closing month code from 01 through 12. Example: January is 01."
                    .to_owned(),
            );
            true
        }
        _ => false,
    }
}

fn apply_view_validation_copy(error: &mut DartyError, parameter: &str, flag: &str) -> bool {
    match parameter {
        "receipt" => {
            error.message = format!(
                "Option \"{flag}\" is invalid. Expected 14-digit DART receipt number or /dsaf001/main.do viewer URL containing rcpNo."
            );
            error.recovery_hint = Some(
                "Pass receiptNumber or viewerUrl from search-body/search-company-reports results as receipt."
                    .to_owned(),
            );
            true
        }
        "documentId" => {
            error.message = format!(
                "Option \"{flag}\" is invalid. Expected documents[].id from a previous view-report response."
            );
            error.recovery_hint = Some(
                "Call view-report again with the same receipt to get current documents[].id/toc[].id values, then use the returned value."
                    .to_owned(),
            );
            true
        }
        "sectionId" => {
            error.message = format!(
                "Option \"{flag}\" is invalid. Expected toc[].id from a previous view-report response for the same receipt/documentId."
            );
            error.recovery_hint = Some(
                "Call view-report again with the same receipt to get current documents[].id/toc[].id values, then use the returned value."
                    .to_owned(),
            );
            true
        }
        _ => false,
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
    use darty::{DartyError, ErrorCode, ResponseDetail};

    use clap::{CommandFactory, Parser};

    use super::{Cli, CliFailure, DetailArg, VIEW_CLI_PARAMETERS, detail, preparse_failure};

    #[test]
    fn debug_is_a_preserved_global_option() {
        let before = Cli::try_parse_from([
            "darty",
            "--debug",
            "search-company",
            "--company-name",
            "삼성전자",
        ])
        .expect("root debug parses");
        assert!(before.debug);

        let after = Cli::try_parse_from([
            "darty",
            "search-company",
            "--company-name",
            "삼성전자",
            "--debug",
        ])
        .expect("global debug parses after a subcommand");
        assert!(after.debug);
    }

    #[test]
    fn debug_help_describes_bounded_failure_diagnostics() {
        let help = Cli::command().render_help().to_string();
        assert!(help.contains("--debug"));
        assert!(help.contains("bounded error classification diagnostics"));
    }

    #[test]
    fn negative_window_error_reports_the_rejected_argument() {
        let argv = [
            "darty".to_owned(),
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

    #[test]
    fn zero_toc_depth_uses_the_frozen_cli_failure() {
        let argv = [
            "darty".to_owned(),
            "view-report".to_owned(),
            "--toc-depth".to_owned(),
            "0".to_owned(),
        ];
        let failure = preparse_failure(&argv).expect("zero depth is rejected");
        assert_eq!(failure.value["error"]["parameter"], "--toc-depth");
        assert_eq!(
            failure.value["error"]["message"],
            "error: option '--toc-depth <number>' argument '0' is invalid. Expected an integer greater than or equal to 1."
        );
    }

    #[test]
    fn global_debug_before_view_report_preserves_toc_depth_validation() {
        let argv = [
            "darty".to_owned(),
            "--debug".to_owned(),
            "view-report".to_owned(),
            "--toc-depth".to_owned(),
            "0".to_owned(),
        ];
        let failure = preparse_failure(&argv).expect("zero depth is rejected");
        assert_eq!(failure.value["error"]["parameter"], "--toc-depth");
        assert_eq!(
            failure.value["error"]["message"],
            "error: option '--toc-depth <number>' argument '0' is invalid. Expected an integer greater than or equal to 1."
        );
    }

    #[test]
    fn attached_zero_toc_depth_uses_the_frozen_cli_failure() {
        let argv = [
            "darty".to_owned(),
            "view-report".to_owned(),
            "--toc-depth=0".to_owned(),
        ];
        let failure = preparse_failure(&argv).expect("zero depth is rejected");
        assert_eq!(failure.value["error"]["parameter"], "--toc-depth");
        assert_eq!(
            failure.value["error"]["message"],
            "error: option '--toc-depth <number>' argument '0' is invalid. Expected an integer greater than or equal to 1."
        );
    }

    #[test]
    fn toc_depth_is_unknown_outside_view_report() {
        let root = ["darty".to_owned(), "--toc-depth".to_owned(), "0".to_owned()];
        let failure = preparse_failure(&root).expect("root option is rejected");
        assert_eq!(
            failure.value["error"]["message"],
            "error: unknown option '--toc-depth'"
        );
        assert_eq!(
            failure.value["error"]["recoveryHint"],
            "Run darty --help for options and commands."
        );

        let company = [
            "darty".to_owned(),
            "search-company".to_owned(),
            "--toc-depth=0".to_owned(),
        ];
        let failure = preparse_failure(&company).expect("command option is rejected");
        assert_eq!(
            failure.value["error"]["message"],
            "error: unknown option '--toc-depth=0'"
        );
        assert_eq!(failure.value["error"]["parameter"], "--toc-depth=0");
    }

    #[test]
    fn detail_defaults_follow_cli_presentation_precedence() {
        assert_eq!(
            detail(None, ResponseDetail::Concise),
            ResponseDetail::Concise
        );
        assert_eq!(
            detail(None, ResponseDetail::Detailed),
            ResponseDetail::Detailed
        );
        assert_eq!(detail(None, ResponseDetail::Raw), ResponseDetail::Raw);
        assert_eq!(
            detail(Some(DetailArg::Concise), ResponseDetail::Raw),
            ResponseDetail::Concise
        );
        assert_eq!(
            detail(Some(DetailArg::Detailed), ResponseDetail::Raw),
            ResponseDetail::Detailed
        );
        assert_eq!(
            detail(Some(DetailArg::Raw), ResponseDetail::Concise),
            ResponseDetail::Raw
        );
    }

    #[test]
    fn sdk_validation_messages_use_flags_but_parameters_remain_semantic() {
        let error = DartyError {
            code: ErrorCode::InvalidRequest,
            message: "maxBytes must be an integer between 1000 and 1000000.".to_owned(),
            retryable: false,
            parameter: Some("maxBytes".to_owned()),
            source_url: None,
            recovery_hint: Some("Use a bounded rendered-content window.".to_owned()),
        };
        let failure = CliFailure::sdk(&error, false, VIEW_CLI_PARAMETERS, &[]);
        assert_eq!(
            failure.value["error"]["message"],
            "--max-bytes must be an integer between 1000 and 1000000."
        );
        assert_eq!(failure.value["error"]["parameter"], "maxBytes");
    }
}
