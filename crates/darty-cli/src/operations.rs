use super::{
    CliFailure, DetailArg, SearchKind, SortDirectionArg, copy_field, detail, failure,
    present_search, quote_cli_value, write_value,
};
use clap::{Args, ValueEnum};
use darty::{
    BodySortBy, CompanyDetailRequest, CompanyRssRequest, DartyClient, DisclosureTypesRequest,
    ResponseDetail, SearchBodyRequest, SortDirection,
};
use serde_json::{Value, json};

#[derive(Debug, Args)]
pub struct CompanyDetailArgs {
    #[arg(long)]
    company_code: Option<String>,
    #[arg(long)]
    pretty: bool,
}
#[derive(Debug, Args)]
pub struct CompanyRssArgs {
    #[arg(long)]
    company_code: Option<String>,
    #[arg(long)]
    detail: Option<DetailArg>,
    #[arg(long)]
    pretty: bool,
}
#[derive(Debug, Args)]
pub struct DisclosureTypesArgs {
    #[arg(long)]
    category: Option<String>,
    #[arg(long)]
    query: Option<String>,
    #[arg(long)]
    pretty: bool,
}
#[derive(Debug, Clone, Copy, ValueEnum)]
pub enum BodySortArg {
    Date,
    #[value(name = "reportName")]
    ReportName,
}
#[derive(Debug, Args)]
pub struct SearchBodyArgs {
    #[arg(long)]
    keyword: Option<String>,
    #[arg(long)]
    start_date: Option<String>,
    #[arg(long)]
    end_date: Option<String>,
    #[arg(long, default_value_t = 1)]
    page: u32,
    #[arg(long, default_value = "date")]
    sort_by: BodySortArg,
    #[arg(long, default_value = "desc")]
    sort_direction: SortDirectionArg,
    #[arg(long)]
    company_code: Option<String>,
    #[arg(long)]
    presenter_name: Option<String>,
    #[arg(long)]
    report_name: Option<String>,
    #[arg(long)]
    detail: Option<DetailArg>,
    #[arg(long)]
    agent: bool,
    #[arg(long)]
    verbose: bool,
    #[arg(long)]
    pretty: bool,
}

fn company_code(value: Option<String>, pretty: bool) -> Result<String, CliFailure> {
    let hint = "If you only know a company name or 6-digit stock code, first use search-company to find the 8-digit companyCode, then call this operation again.";
    let value = value.ok_or_else(|| {
        CliFailure::new(
            failure(
                "Missing required option \"--company-code\". Expected 8-digit DART company code.",
                Some("companyCode"),
                hint,
            ),
            pretty,
        )
    })?;
    if value.len() != 8 || !value.bytes().all(|byte| byte.is_ascii_digit()) {
        return Err(CliFailure::new(
            failure(
                "Option \"--company-code\" must be an 8-digit DART company code. Company names and 6-digit stock codes are not accepted. Example: Samsung Electronics DART company code 00126380.",
                Some("companyCode"),
                hint,
            ),
            pretty,
        ));
    }
    Ok(value)
}

pub async fn run_detail(client: &DartyClient, args: CompanyDetailArgs) -> Result<(), CliFailure> {
    let request = CompanyDetailRequest::new(company_code(
        args.company_code.map(|value| value.trim().to_owned()),
        args.pretty,
    )?);
    let result = client
        .company_detail(request)
        .await
        .map_err(|error| CliFailure::sdk(&error, args.pretty, &[], &[]))?;
    write_value(
        &serde_json::to_value(result).expect("SDK response serializes"),
        args.pretty,
    );
    Ok(())
}
pub async fn run_rss(client: &DartyClient, args: CompanyRssArgs) -> Result<(), CliFailure> {
    let mut request = CompanyRssRequest::new(company_code(
        args.company_code.map(|value| value.trim().to_owned()),
        args.pretty,
    )?);
    request.detail = detail(args.detail, ResponseDetail::Concise);
    let result = client
        .company_rss(request)
        .await
        .map_err(|error| CliFailure::sdk(&error, args.pretty, &[], &[]))?;
    write_value(
        &serde_json::to_value(result).expect("SDK response serializes"),
        args.pretty,
    );
    Ok(())
}
pub fn run_types(client: &DartyClient, args: DisclosureTypesArgs) -> Result<(), CliFailure> {
    let request = DisclosureTypesRequest {
        category: args.category.map(|value| value.to_uppercase()),
        query: args.query,
    };
    let result = client.disclosure_types(request).map_err(|error| {
        CliFailure::sdk(
            &error,
            args.pretty,
            &[("category", "--category"), ("query", "--query")],
            &[],
        )
    })?;
    write_value(
        &serde_json::to_value(result).expect("SDK response serializes"),
        args.pretty,
    );
    Ok(())
}

fn body_required(
    value: Option<String>,
    flag: &str,
    parameter: &str,
    expected: &str,
    pretty: bool,
) -> Result<String, CliFailure> {
    value.ok_or_else(|| {
        CliFailure::new(
            failure(
                format!("Missing required option \"{flag}\". Expected {expected}."),
                Some(parameter),
                "Run darty search-body --help for options and examples.",
            ),
            pretty,
        )
    })
}

pub async fn run_body(client: &DartyClient, args: SearchBodyArgs) -> Result<(), CliFailure> {
    let keyword = body_required(
        args.keyword,
        "--keyword",
        "keyword",
        "non-empty string",
        args.pretty,
    )?;
    let start_date = body_required(
        args.start_date,
        "--start-date",
        "startDate",
        "date string in YYYYMMDD format",
        args.pretty,
    )?;
    let end_date = body_required(
        args.end_date,
        "--end-date",
        "endDate",
        "date string in YYYYMMDD format",
        args.pretty,
    )?;
    let mut request = SearchBodyRequest::new(keyword, &start_date, &end_date);
    request.page = args.page;
    request.sort_by = match args.sort_by {
        BodySortArg::Date => BodySortBy::Date,
        BodySortArg::ReportName => BodySortBy::ReportName,
    };
    request.sort_direction = match args.sort_direction {
        SortDirectionArg::Asc => SortDirection::Asc,
        SortDirectionArg::Desc => SortDirection::Desc,
    };
    request.company_code = args
        .company_code
        .map(|value| company_code(Some(value), args.pretty))
        .transpose()?;
    request.presenter_name = args.presenter_name;
    request.report_name = args.report_name;
    request.detail = detail(
        args.detail,
        if args.verbose {
            ResponseDetail::Raw
        } else {
            ResponseDetail::Concise
        },
    );
    let response = client.search_body(request).await.map_err(|mut error| {
        if matches!(
            error.parameter.as_deref(),
            Some("presenterName" | "reportName" | "keyword")
        ) {
            let flag = match error.parameter.as_deref() {
                Some("presenterName") => "presenter-name",
                Some("reportName") => "report-name",
                _ => "keyword",
            };
            error.message = format!("Option \"--{flag}\" cannot be empty.");
            error.recovery_hint =
                Some("Run darty search-body --help for options and examples.".to_owned());
        }
        CliFailure::sdk(
            &error,
            args.pretty,
            &[
                ("keyword", "--keyword"),
                ("startDate", "--start-date"),
                ("endDate", "--end-date"),
                ("page", "--page"),
                ("presenterName", "--presenter-name"),
                ("reportName", "--report-name"),
            ],
            &[("startDate", &start_date), ("endDate", &end_date)],
        )
    })?;
    write_value(
        &present_search(response, args.verbose, args.agent, SearchKind::Body),
        args.pretty,
    );
    Ok(())
}

pub fn body_agent_item(item: &Value) -> Value {
    let mut projected = serde_json::Map::new();
    for (group, key, target) in [
        ("company", "name", "companyName"),
        ("company", "companyCode", "companyCode"),
        ("filing", "receiptNumber", "receiptNumber"),
        ("filing", "reportTitle", "reportTitle"),
        ("filing", "receiptDate", "receiptDate"),
        ("match", "snippetText", "snippetText"),
        ("references", "viewerUrl", "viewerUrl"),
    ] {
        copy_field(&mut projected, &item[group], key, target);
    }
    Value::Object(projected)
}

pub fn body_help(value: &Value, first: Option<&Value>) -> Value {
    let mut help = first.map_or_else(|| vec!["No filings matched. Widen the date range, relax filters, or try DART search syntax such as OR with |.".to_owned(), "Run darty search-body --help for keyword syntax and filters.".to_owned()], |item| {
        let receipt = quote_cli_value(item["references"]["viewerUrl"].as_str().unwrap_or_default());
        vec![format!("Inspect filing TOC: darty view-report --receipt {receipt}"), format!("Read a returned section: darty view-report --receipt {receipt} --section-id <toc[].id>")]
    });
    if first.is_none()
        && value["metadata"]["droppedItemCount"]
            .as_u64()
            .is_some_and(|count| count > 0)
    {
        "No parseable filings remained on this page. Inspect the partial-parse warning and try another page or adjust the filters.".clone_into(&mut help[0]);
    }
    let pagination = &value["result"]["pagination"];
    if let (Some(current), Some(total)) = (
        pagination["currentPage"].as_u64(),
        pagination["totalPages"].as_u64(),
    ) && current < total
    {
        let request = &value["result"]["request"];
        let mut parts = vec!["darty search-body".to_owned()];
        for (key, flag, default) in [
            ("keyword", "--keyword", None),
            ("startDate", "--start-date", None),
            ("endDate", "--end-date", None),
            ("companyCode", "--company-code", None),
            ("presenterName", "--presenter-name", None),
            ("reportName", "--report-name", None),
            ("sortBy", "--sort-by", Some("date")),
            ("sortDirection", "--sort-direction", Some("desc")),
        ] {
            if let Some(value) = request[key].as_str()
                && Some(value) != default
            {
                parts.push(format!("{flag} {}", quote_cli_value(value)));
            }
        }
        parts.push(format!("--page {} --agent", current + 1));
        help.push(format!("Continue search page: {}", parts.join(" ")));
    }
    json!(help)
}
