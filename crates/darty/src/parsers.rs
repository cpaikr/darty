use std::{
    collections::{BTreeMap, BTreeSet},
    str::Chars,
    sync::LazyLock,
};

use regex::Regex;
use scraper::{ElementRef, Html, Selector};
use url::Url;

use crate::{
    CompanyItemEvidence, CompanyItemReferences, DocumentKind, Filing, FilingCompany,
    FilingEvidence, FilingItemReferences, MarketKind, Pagination, Remark, ReportDocument,
    ResponseDetail, SearchCompanyItem, SearchCompanyReportsItem,
};

const MAX_TOC_EXPANSIONS: usize = 10_000;

static COMPANY_LINK: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r#"select\(['\"](?P<code>\d{8})['\"]\)"#).expect("static company-link regex")
});
static STOCK_CODE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"^\d{6}$").expect("static stock regex"));
static REPORT_COMPANY_LINK: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r#"openCorpInfoNew\(['\"](?P<code>\d{8})['\"]"#)
        .expect("static report company-link regex")
});
static RECEIPT_NUMBER: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"^\d{14}$").expect("static receipt regex"));
static RECEIPT_DATE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"^\d{4}-\d{2}-\d{2}$").expect("static receipt-date regex"));
static SHELL_ASSIGNMENT: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(
        r#"(?ms)(node\d+)\[['\"](?P<field>[A-Za-z]+)['\"]\]\s*=\s*(?:\"(?P<double>(?:\\.|[^\"\\])*)\"|'(?P<single>(?:\\.|[^'\\])*)')\s*;"#,
    )
    .expect("static shell assignment regex")
});
static SHELL_CHILD: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r#"(?m)(node\d+)\[['\"]children['\"]\]\.push\((node\d+)\)\s*;"#)
        .expect("static shell child regex")
});
static SHELL_ROOT: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?m)treeData\.push\((node\d+)\)\s*;").expect("static shell root regex")
});
static VIEW_DOC: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(
        r#"viewDoc\(\s*['\"]([^'\"]+)['\"]\s*,\s*['\"]([^'\"]+)['\"]\s*,\s*['\"]([^'\"]+)['\"]\s*,\s*['\"]([^'\"]+)['\"]\s*,\s*['\"]([^'\"]+)['\"]\s*,\s*['\"]([^'\"]+)['\"](?:\s*,\s*['\"]([^'\"]*)['\"])?\s*\)"#,
    )
    .expect("static viewDoc regex")
});
static PAGINATION: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"\[(\d+)/(\d+)\]\s*\[총\s*([\d,]+)건\]").expect("static pagination regex")
});
static COMPANY_TABLE: LazyLock<Selector> =
    LazyLock::new(|| Selector::parse("#corpTable tbody").expect("static selector"));
static COMPANY_ROWS: LazyLock<Selector> =
    LazyLock::new(|| Selector::parse("#corpTable tbody > tr").expect("static selector"));
static COMPANY_NO_DATA: LazyLock<Selector> =
    LazyLock::new(|| Selector::parse("tr.noData").expect("static selector"));
static REPORTS_TABLE: LazyLock<Selector> =
    LazyLock::new(|| Selector::parse("table.tbList tbody").expect("static selector"));
static REPORTS_ROWS: LazyLock<Selector> =
    LazyLock::new(|| Selector::parse("table.tbList tbody > tr").expect("static selector"));
static REPORTS_NO_DATA: LazyLock<Selector> =
    LazyLock::new(|| Selector::parse("td.no_data, td[colspan]").expect("static selector"));
static LINK: LazyLock<Selector> =
    LazyLock::new(|| Selector::parse("a[href]").expect("static selector"));
static CELLS: LazyLock<Selector> =
    LazyLock::new(|| Selector::parse("td").expect("static selector"));
static TITLED: LazyLock<Selector> =
    LazyLock::new(|| Selector::parse("[title]").expect("static selector"));
static SPANS: LazyLock<Selector> =
    LazyLock::new(|| Selector::parse("span").expect("static selector"));
static FAMILY_OPTIONS: LazyLock<Selector> =
    LazyLock::new(|| Selector::parse("#family > option").expect("static selector"));
static ATTACHMENT_OPTIONS: LazyLock<Selector> =
    LazyLock::new(|| Selector::parse("#att > option").expect("static selector"));
static PAGE_INFO: LazyLock<Selector> =
    LazyLock::new(|| Selector::parse(".pageInfo").expect("static selector"));

#[derive(Debug)]
pub(crate) struct ParsedCompanyPage {
    pub items: Vec<SearchCompanyItem>,
    pub pagination: Pagination,
    pub dropped: u32,
}

#[derive(Debug)]
pub(crate) struct ParsedReportsPage {
    pub items: Vec<SearchCompanyReportsItem>,
    pub pagination: Pagination,
    pub dropped: u32,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub(crate) struct ViewerLocator {
    pub receipt_number: String,
    pub document_number: String,
    pub element_id: String,
    pub offset: String,
    pub length: String,
    pub dtd: String,
    pub toc_number: Option<String>,
}

#[derive(Debug, Clone)]
pub(crate) struct ParsedDocument {
    pub public: ReportDocument,
    pub query: String,
}

#[derive(Debug, Clone)]
pub(crate) struct ParsedTocNode {
    pub id: String,
    pub title: String,
    pub locator: ViewerLocator,
    pub children: Vec<Self>,
}

#[derive(Debug, Clone)]
pub(crate) struct ParsedShell {
    pub receipt_number: String,
    pub documents: Vec<ParsedDocument>,
    pub selected_document_index: usize,
    pub toc: Vec<ParsedTocNode>,
    pub initial_locator: ViewerLocator,
}

pub(crate) fn company_page(
    html: &str,
    requested_page: u32,
) -> Result<ParsedCompanyPage, &'static str> {
    let document = Html::parse_fragment(html);
    if document.select(&COMPANY_TABLE).next().is_none() {
        return Err("company table is missing");
    }
    let rows = document.select(&COMPANY_ROWS).collect::<Vec<_>>();
    let recognized_empty =
        rows.iter()
            .any(|entry| entry.select(&COMPANY_NO_DATA).next().is_some())
            || rows.iter().any(|entry| {
                entry.value().attr("class").is_some_and(|classes| {
                    classes.split_whitespace().any(|class| class == "noData")
                })
            });

    if recognized_empty {
        return Ok(ParsedCompanyPage {
            items: Vec::new(),
            pagination: Pagination {
                current_page: requested_page,
                total_pages: 0,
                total_count: 0,
                returned_count: 0,
            },
            dropped: 0,
        });
    }

    let mut items = Vec::new();
    let mut dropped = 0;
    for entry in rows {
        if let Some(item) = company_row(entry) {
            items.push(item);
        } else {
            dropped += 1;
        }
    }
    let mut pagination = parse_pagination(&document).ok_or("company pagination is missing")?;
    pagination.returned_count = u32::try_from(items.len()).unwrap_or(u32::MAX);
    Ok(ParsedCompanyPage {
        items,
        pagination,
        dropped,
    })
}

fn company_row(row: ElementRef<'_>) -> Option<SearchCompanyItem> {
    let link = row.select(&LINK).find(|link| {
        link.value()
            .attr("href")
            .is_some_and(|href| href.contains("select("))
    })?;
    let href = link.value().attr("href")?.to_owned();
    let code = COMPANY_LINK.captures(&href)?["code"].to_owned();
    let name = collapsed_text(link);
    if name.is_empty() {
        return None;
    }

    let cells = row.select(&CELLS).collect::<Vec<_>>();
    let stock_text = cells
        .get(1)
        .map_or_else(String::new, |cell| collapsed_text(*cell));
    let stock_code = if stock_text.is_empty() {
        None
    } else if STOCK_CODE.is_match(&stock_text) {
        Some(stock_text)
    } else {
        return None;
    };

    let badge = row
        .select(&TITLED)
        .find(|element| element.value().name() != "a");
    let market_label = badge
        .and_then(|element| element.value().attr("title"))
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_owned);
    let badge_text = badge.map(collapsed_text).filter(|value| !value.is_empty());
    let market_kind = market_kind(badge, market_label.as_deref());

    Some(SearchCompanyItem {
        company_code: code.clone(),
        company_name: name,
        stock_code,
        market_kind,
        market_label,
        references: CompanyItemReferences {
            detail_endpoint: format!("https://dart.fss.or.kr/dsae001/select.ax?selectKey={code}"),
        },
        evidence: CompanyItemEvidence {
            raw_company_link_href: href,
            raw_market_badge_text: badge_text,
        },
    })
}

pub(crate) fn reports_page(
    html: &str,
    requested_company_code: &str,
    detail: ResponseDetail,
) -> Result<ParsedReportsPage, &'static str> {
    let document = Html::parse_fragment(html);
    if document.select(&REPORTS_TABLE).next().is_none() {
        return Err("reports table is missing");
    }
    let rows = document.select(&REPORTS_ROWS).collect::<Vec<_>>();
    let recognized_empty = rows.iter().any(|entry| {
        entry.select(&REPORTS_NO_DATA).any(|cell| {
            cell.value()
                .attr("class")
                .is_some_and(|classes| classes.split_whitespace().any(|class| class == "no_data"))
                || collapsed_text(cell) == "조회 결과가 없습니다."
        })
    });
    if recognized_empty {
        return Ok(ParsedReportsPage {
            items: Vec::new(),
            pagination: Pagination {
                current_page: 1,
                total_pages: 0,
                total_count: 0,
                returned_count: 0,
            },
            dropped: 0,
        });
    }

    let mut items = Vec::new();
    let mut dropped = 0;
    for entry in rows {
        if let Some(item) = reports_row(entry, requested_company_code, detail) {
            items.push(item);
        } else {
            dropped += 1;
        }
    }
    let mut pagination = parse_pagination(&document).ok_or("reports pagination is missing")?;
    pagination.returned_count = u32::try_from(items.len()).unwrap_or(u32::MAX);
    Ok(ParsedReportsPage {
        items,
        pagination,
        dropped,
    })
}

fn reports_row(
    row: ElementRef<'_>,
    requested_company_code: &str,
    detail: ResponseDetail,
) -> Option<SearchCompanyReportsItem> {
    let cells = row.select(&CELLS).collect::<Vec<_>>();
    if cells.len() != 6 {
        return None;
    }
    let company_link = cells[1].select(&LINK).next()?;
    let company_href = company_link.value().attr("href")?;
    let company_code = REPORT_COMPANY_LINK.captures(company_href)?["code"].to_owned();
    if company_code != requested_company_code {
        return None;
    }
    let report_link = cells[2].select(&LINK).find(|link| {
        link.value()
            .attr("href")
            .is_some_and(|href| href.starts_with("/dsaf001/main.do"))
    })?;
    let report_href = report_link.value().attr("href")?;
    let report_url = Url::parse("https://dart.fss.or.kr")
        .expect("static DART origin")
        .join(report_href)
        .ok()?;
    let receipt_number = report_url
        .query_pairs()
        .find_map(|(key, value)| (key == "rcpNo").then(|| value.into_owned()))?;
    if !RECEIPT_NUMBER.is_match(&receipt_number) {
        return None;
    }
    let receipt_date = collapsed_text(cells[4]).replace('.', "-");
    if !RECEIPT_DATE.is_match(&receipt_date) {
        return None;
    }

    let market_label = cells[1]
        .select(&TITLED)
        .next()
        .and_then(|element| element.value().attr("title"))
        .map(str::to_owned);
    let mut remarks = cells[5]
        .select(&SPANS)
        .filter_map(|span| {
            let text = collapsed_text(span);
            let title = span
                .value()
                .attr("title")
                .map(str::split_whitespace)
                .map(|parts| parts.collect::<Vec<_>>().join(" "))
                .filter(|value| !value.is_empty());
            (!text.is_empty() || title.is_some()).then_some(Remark { text, title })
        })
        .collect::<Vec<_>>();
    if remarks.is_empty() {
        let text = collapsed_text(cells[5]);
        if !text.is_empty() {
            remarks.push(Remark { text, title: None });
        }
    }
    let raw_row_text = collapsed_text(row);

    Some(SearchCompanyReportsItem {
        company: FilingCompany {
            company_code,
            name: Some(collapsed_text(company_link)),
            market_label,
        },
        filing: Filing {
            receipt_number: receipt_number.clone(),
            report_title: collapsed_text(report_link),
            receipt_date,
            presenter_name: non_empty(collapsed_text(cells[3])),
        },
        matched_disclosure_type: None,
        references: FilingItemReferences {
            viewer_url: format!("https://dart.fss.or.kr/dsaf001/main.do?rcpNo={receipt_number}"),
        },
        remarks,
        evidence: (!matches!(detail, ResponseDetail::Concise))
            .then_some(FilingEvidence { raw_row_text }),
    })
}

pub(crate) fn report_shell(html: &str) -> Result<ParsedShell, &'static str> {
    let document = Html::parse_document(html);
    let mut documents = Vec::new();
    parse_document_options(
        &document,
        &FAMILY_OPTIONS,
        DocumentKind::Body,
        &mut documents,
    );
    parse_document_options(
        &document,
        &ATTACHMENT_OPTIONS,
        DocumentKind::Attachment,
        &mut documents,
    );
    if documents.is_empty() {
        return Err("report shell has no selectable document");
    }
    let selected_document_index = documents
        .iter()
        .position(|document| document.public.selected)
        .unwrap_or(0);
    if !documents.iter().any(|document| document.public.selected) {
        documents[selected_document_index].public.selected = true;
    }

    let selected_query = &documents[selected_document_index].query;
    let (receipt_number, selected_document_number) = document_identity(selected_query)
        .ok_or("report shell selected document has no receipt number")?;
    let (toc, initial_locator) = parse_shell_script(html)?;
    if documents.iter().any(|document| {
        document_identity(&document.query)
            .is_none_or(|(document_receipt, _)| document_receipt != receipt_number)
    }) {
        return Err("report shell document identity is inconsistent");
    }
    if !valid_locator(&initial_locator, &receipt_number, None) {
        return Err("report shell initial viewer locator is invalid");
    }
    if selected_document_number.is_some_and(|value| value != initial_locator.document_number) {
        return Err("report shell selected document locator is inconsistent");
    }
    if !toc_locators_are_valid(&toc, &receipt_number, &initial_locator.document_number) {
        return Err("report shell TOC locator identity is inconsistent");
    }
    Ok(ParsedShell {
        receipt_number,
        documents,
        selected_document_index,
        toc,
        initial_locator,
    })
}

fn parse_document_options(
    document: &Html,
    selector: &Selector,
    kind: DocumentKind,
    documents: &mut Vec<ParsedDocument>,
) {
    let mut kind_index = 0_u32;
    for option in document.select(selector) {
        let Some(query) = option.value().attr("value") else {
            continue;
        };
        if query == "null" || document_identity(query).is_none() {
            continue;
        }
        kind_index += 1;
        let title = option
            .value()
            .attr("title")
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .map_or_else(|| collapsed_text(option), str::to_owned);
        let id_kind = match kind {
            DocumentKind::Body => "body",
            DocumentKind::Attachment => "attachment",
        };
        documents.push(ParsedDocument {
            public: ReportDocument {
                id: format!("document:{id_kind}:{kind_index}"),
                title,
                kind,
                selected: option.value().attr("selected").is_some(),
            },
            query: query.to_owned(),
        });
    }
}

#[derive(Debug, Default)]
struct ScriptNode {
    fields: BTreeMap<String, String>,
    children: Vec<String>,
}

fn parse_shell_script(html: &str) -> Result<(Vec<ParsedTocNode>, ViewerLocator), &'static str> {
    let mut nodes: BTreeMap<String, ScriptNode> = BTreeMap::new();
    for captures in SHELL_ASSIGNMENT.captures_iter(html) {
        let encoded = captures
            .name("double")
            .or_else(|| captures.name("single"))
            .expect("one shell string branch matched")
            .as_str();
        let value = decode_js_string(encoded).ok_or("report shell has an invalid string escape")?;
        nodes
            .entry(captures[1].to_owned())
            .or_default()
            .fields
            .insert(captures["field"].to_owned(), value);
    }
    for captures in SHELL_CHILD.captures_iter(html) {
        nodes
            .entry(captures[1].to_owned())
            .or_default()
            .children
            .push(captures[2].to_owned());
    }
    let roots = SHELL_ROOT
        .captures_iter(html)
        .map(|captures| captures[1].to_owned())
        .collect::<Vec<_>>();
    let mut toc = Vec::new();
    let mut visiting = BTreeSet::new();
    let mut expansions = 0;
    for (index, name) in roots.iter().enumerate() {
        if let Some(node) = build_toc(
            name,
            &(index + 1).to_string(),
            &nodes,
            &mut visiting,
            &mut expansions,
            0,
        )? {
            toc.push(node);
        }
    }
    let initial = VIEW_DOC
        .captures_iter(html)
        .map(|captures| ViewerLocator {
            receipt_number: captures[1].to_owned(),
            document_number: captures[2].to_owned(),
            element_id: captures[3].to_owned(),
            offset: captures[4].to_owned(),
            length: captures[5].to_owned(),
            dtd: captures[6].to_owned(),
            toc_number: captures.get(7).map(|value| value.as_str().to_owned()),
        })
        .find(|locator| valid_locator(locator, &locator.receipt_number, None))
        .ok_or("report shell has no valid initial viewer locator")?;
    Ok((toc, initial))
}

fn build_toc(
    name: &str,
    position: &str,
    nodes: &BTreeMap<String, ScriptNode>,
    visiting: &mut BTreeSet<String>,
    expansions: &mut usize,
    depth: u8,
) -> Result<Option<ParsedTocNode>, &'static str> {
    if depth >= 64 {
        return Err("report shell TOC exceeds the supported depth");
    }
    if !visiting.insert(name.to_owned()) {
        return Err("report shell TOC contains a cycle");
    }
    *expansions += 1;
    if *expansions > MAX_TOC_EXPANSIONS {
        return Err("report shell TOC exceeds the supported size");
    }
    let Some(node) = nodes.get(name) else {
        visiting.remove(name);
        return Ok(None);
    };
    let field = |key: &str| node.fields.get(key).cloned();
    let required = (
        field("rcpNo"),
        field("dcmNo"),
        field("eleId"),
        field("offset"),
        field("length"),
        field("dtd"),
        field("text"),
    );
    let (
        Some(receipt_number),
        Some(document_number),
        Some(element_id),
        Some(offset),
        Some(length),
        Some(dtd),
        Some(title),
    ) = required
    else {
        visiting.remove(name);
        return Ok(None);
    };
    let locator = ViewerLocator {
        receipt_number,
        document_number,
        element_id,
        offset,
        length,
        dtd,
        toc_number: field("tocNo"),
    };
    let mut children = Vec::new();
    for (index, child) in node.children.iter().enumerate() {
        if let Some(child) = build_toc(
            child,
            &format!("{position}.{}", index + 1),
            nodes,
            visiting,
            expansions,
            depth + 1,
        )? {
            children.push(child);
        }
    }
    visiting.remove(name);
    Ok(Some(ParsedTocNode {
        id: format!("section:{position}"),
        title,
        locator,
        children,
    }))
}

fn valid_locator(locator: &ViewerLocator, receipt: &str, document: Option<&str>) -> bool {
    locator.receipt_number == receipt
        && locator.receipt_number.len() == 14
        && is_digits(&locator.receipt_number)
        && document.is_none_or(|document| locator.document_number == document)
        && is_digits(&locator.document_number)
        && is_digits(&locator.element_id)
        && is_digits(&locator.offset)
        && is_digits(&locator.length)
        && !locator.dtd.is_empty()
        && locator
            .dtd
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'.' | b'_' | b'-'))
}

fn toc_locators_are_valid(nodes: &[ParsedTocNode], receipt: &str, document: &str) -> bool {
    nodes.iter().all(|node| {
        valid_locator(&node.locator, receipt, Some(document))
            && toc_locators_are_valid(&node.children, receipt, document)
    })
}

fn is_digits(value: &str) -> bool {
    !value.is_empty() && value.bytes().all(|byte| byte.is_ascii_digit())
}

fn decode_js_string(value: &str) -> Option<String> {
    let mut chars = value.chars();
    let mut decoded = String::with_capacity(value.len());
    while let Some(character) = chars.next() {
        if character != '\\' {
            decoded.push(character);
            continue;
        }
        match chars.next()? {
            '\'' => decoded.push('\''),
            '"' => decoded.push('"'),
            '\\' => decoded.push('\\'),
            '/' => decoded.push('/'),
            'b' => decoded.push('\u{0008}'),
            'f' => decoded.push('\u{000c}'),
            'n' => decoded.push('\n'),
            'r' => decoded.push('\r'),
            't' => decoded.push('\t'),
            'v' => decoded.push('\u{000b}'),
            '0' => decoded.push('\0'),
            'x' => decoded.push(char::from_u32(take_hex(&mut chars, 2)?)?),
            'u' => {
                let first = take_hex(&mut chars, 4)?;
                let scalar = if (0xD800..=0xDBFF).contains(&first) {
                    if chars.next()? != '\\' || chars.next()? != 'u' {
                        return None;
                    }
                    let second = take_hex(&mut chars, 4)?;
                    if !(0xDC00..=0xDFFF).contains(&second) {
                        return None;
                    }
                    0x1_0000 + ((first - 0xD800) << 10) + (second - 0xDC00)
                } else {
                    first
                };
                decoded.push(char::from_u32(scalar)?);
            }
            '\n' => {}
            '\r' => {
                if chars.clone().next() == Some('\n') {
                    chars.next();
                }
            }
            escaped => decoded.push(escaped),
        }
    }
    Some(decoded)
}

fn take_hex(chars: &mut Chars<'_>, digits: usize) -> Option<u32> {
    let mut value = 0;
    for _ in 0..digits {
        value = value * 16 + chars.next()?.to_digit(16)?;
    }
    Some(value)
}

fn parse_pagination(document: &Html) -> Option<Pagination> {
    let text = document
        .select(&PAGE_INFO)
        .map(collapsed_text)
        .collect::<Vec<_>>()
        .join(" ");
    let captures = PAGINATION.captures(&text)?;
    Some(Pagination {
        current_page: captures[1].parse().ok()?,
        total_pages: captures[2].parse().ok()?,
        total_count: captures[3].replace(',', "").parse().ok()?,
        returned_count: 0,
    })
}

fn market_kind(badge: Option<ElementRef<'_>>, label: Option<&str>) -> MarketKind {
    let class = badge.and_then(|element| element.value().attr("class"));
    if class.is_some_and(|value| value.contains("kospi"))
        || label.is_some_and(|value| value.contains("유가증권"))
    {
        MarketKind::Kospi
    } else if class.is_some_and(|value| value.contains("kosdaq"))
        || label.is_some_and(|value| value.contains("코스닥"))
    {
        MarketKind::Kosdaq
    } else if class.is_some_and(|value| value.contains("konex"))
        || label.is_some_and(|value| value.contains("코넥스"))
    {
        MarketKind::Konex
    } else if class.is_some_and(|value| value.contains("etc"))
        || label.is_some_and(|value| value.contains("기타"))
    {
        MarketKind::Etc
    } else {
        MarketKind::Unknown
    }
}

fn collapsed_text(element: ElementRef<'_>) -> String {
    element
        .text()
        .flat_map(str::split_whitespace)
        .collect::<Vec<_>>()
        .join(" ")
}

fn non_empty(value: String) -> Option<String> {
    (!value.is_empty()).then_some(value)
}

fn document_identity(query: &str) -> Option<(String, Option<String>)> {
    let mut receipt = None;
    let mut document = None;
    for (name, value) in url::form_urlencoded::parse(query.as_bytes()) {
        match name.as_ref() {
            "rcpNo"
                if receipt.is_none()
                    && value.len() == 14
                    && value.bytes().all(|byte| byte.is_ascii_digit()) =>
            {
                receipt = Some(value.into_owned());
            }
            "dcmNo"
                if document.is_none()
                    && !value.is_empty()
                    && value.bytes().all(|byte| byte.is_ascii_digit()) =>
            {
                document = Some(value.into_owned());
            }
            _ => return None,
        }
    }
    Some((receipt?, document))
}

pub(crate) fn public_toc(nodes: &[ParsedTocNode]) -> Vec<crate::TocNode> {
    nodes
        .iter()
        .map(|node| crate::TocNode {
            id: node.id.clone(),
            title: node.title.clone(),
            children: public_toc(&node.children),
        })
        .collect()
}

pub(crate) fn find_toc<'a>(nodes: &'a [ParsedTocNode], id: &str) -> Option<&'a ParsedTocNode> {
    for node in nodes {
        if node.id == id {
            return Some(node);
        }
        if let Some(found) = find_toc(&node.children, id) {
            return Some(found);
        }
    }
    None
}

#[cfg(test)]
mod tests {
    use super::{company_page, report_shell, reports_page};
    use crate::{DocumentKind, MarketKind, ResponseDetail};

    const SHELL: &str =
        include_str!("../../../fixtures/dart/vertical-v1/bodies/report-shell-toc.utf8.html");

    #[test]
    fn parses_company_fixture() {
        let page = company_page(
            include_str!("../../../fixtures/dart/vertical-v1/bodies/company-populated.utf8.html"),
            1,
        )
        .unwrap();
        assert_eq!(page.items.len(), 2);
        assert_eq!(page.items[0].market_kind, MarketKind::Kospi);
        assert_eq!(page.pagination.total_count, 2);
    }

    #[test]
    fn drops_company_rows_with_malformed_nonempty_stock_codes() {
        let malformed =
            include_str!("../../../fixtures/dart/vertical-v1/bodies/company-populated.utf8.html")
                .replacen("<td>123456</td>", "<td>12A456</td>", 1);
        let page = company_page(&malformed, 1).unwrap();
        assert_eq!(page.items.len(), 1);
        assert_eq!(page.dropped, 1);
        assert_eq!(page.items[0].company_code, "00000002");
    }

    #[test]
    fn parses_reports_fixture() {
        let page = reports_page(
            include_str!("../../../fixtures/dart/vertical-v1/bodies/reports-populated.utf8.html"),
            "00000001",
            ResponseDetail::Raw,
        )
        .unwrap();
        assert_eq!(page.items[0].filing.receipt_number, "20260101000001");
        assert!(page.items[0].evidence.is_some());
    }

    #[test]
    fn preserves_title_only_and_plain_text_report_remarks() {
        let fixture =
            include_str!("../../../fixtures/dart/vertical-v1/bodies/reports-populated.utf8.html");
        let title_only = fixture.replace(
            r#"<span class="tagCom_kospi_other" title="가상 시장 비고">유</span>"#,
            r#"<span title="  제목만   있는 비고  "></span>"#,
        );
        let page = reports_page(&title_only, "00000001", ResponseDetail::Concise).unwrap();
        assert_eq!(page.items[0].remarks[0].text, "");
        assert_eq!(
            page.items[0].remarks[0].title.as_deref(),
            Some("제목만 있는 비고")
        );

        let plain = fixture.replace(
            r#"<span class="tagCom_kospi_other" title="가상 시장 비고">유</span>"#,
            "일반 텍스트 비고",
        );
        let page = reports_page(&plain, "00000001", ResponseDetail::Concise).unwrap();
        assert_eq!(page.items[0].remarks[0].text, "일반 텍스트 비고");
        assert!(page.items[0].remarks[0].title.is_none());
    }

    #[test]
    fn parses_shell_tree_and_opaque_ids() {
        let shell = report_shell(SHELL).unwrap();
        assert_eq!(shell.documents[0].public.id, "document:body:1");
        assert_eq!(shell.documents[1].public.kind, DocumentKind::Attachment);
        assert_eq!(shell.toc[0].children[0].id, "section:1.1");
    }

    #[test]
    fn decodes_escaped_shell_titles() {
        let escaped = SHELL.replace(
            r#"node1['text'] = "I. 회사의 개요";"#,
            r"node1['text'] = 'Director\'s \uBCF4\uACE0';",
        );
        assert_eq!(
            report_shell(&escaped).unwrap().toc[0].title,
            "Director's 보고"
        );
    }

    #[test]
    fn decodes_shell_title_line_continuations() {
        let continued = SHELL.replace(
            r#"node1['text'] = "I. 회사의 개요";"#,
            "node1['text'] = \"Director\\\nReport\";",
        );
        assert_eq!(
            report_shell(&continued).unwrap().toc[0].title,
            "DirectorReport"
        );
    }

    #[test]
    fn rejects_cyclic_toc_graphs() {
        let cyclic = SHELL.replace(
            "node1['children'].push(node2);",
            "node1['children'].push(node2);\nnode2['children'].push(node1);",
        );
        assert_eq!(
            report_shell(&cyclic).unwrap_err(),
            "report shell TOC contains a cycle"
        );
    }

    #[test]
    fn rejects_toc_locator_identity_drift() {
        let drifted = SHELL.replacen(
            "node2['rcpNo'] = \"20260101000001\";",
            "node2['rcpNo'] = \"20260101000009\";",
            1,
        );
        assert_eq!(
            report_shell(&drifted).unwrap_err(),
            "report shell TOC locator identity is inconsistent"
        );
    }

    #[test]
    fn ignores_invalid_initial_calls_and_uses_the_first_valid_locator() {
        let invalid_then_valid = SHELL.replace(
            "viewDoc(\"20260101000001\"",
            "viewDoc(\"bad\", \"not-a-document\", \"x\", \"y\", \"z\", \"../bad\");\nviewDoc(\"20260101000001\"",
        );
        assert_eq!(
            report_shell(&invalid_then_valid)
                .unwrap()
                .initial_locator
                .document_number,
            "10000001"
        );
    }

    #[test]
    fn rejects_toc_graphs_beyond_the_depth_bound() {
        let mut script = String::new();
        for index in 1..=65 {
            use std::fmt::Write as _;
            write!(
                script,
                "var node{index} = {{}};\nnode{index}['text'] = \"Section {index}\";\nnode{index}['rcpNo'] = \"20260101000001\";\nnode{index}['dcmNo'] = \"10000001\";\nnode{index}['eleId'] = \"{index}\";\nnode{index}['offset'] = \"0\";\nnode{index}['length'] = \"1\";\nnode{index}['dtd'] = \"dart4.xsd\";\nnode{index}['children'] = [];\n"
            )
            .unwrap();
            if index > 1 {
                writeln!(script, "node{}['children'].push(node{index});", index - 1).unwrap();
            }
        }
        script.push_str("treeData.push(node1);\n");
        let shell = format!(
            "<script>{script}viewDoc(\"20260101000001\", \"10000001\", \"1\", \"0\", \"1\", \"dart4.xsd\");</script><select id=\"family\"><option value=\"rcpNo=20260101000001\" selected>body</option></select><select id=\"att\"></select>"
        );
        assert_eq!(
            report_shell(&shell).unwrap_err(),
            "report shell TOC exceeds the supported depth"
        );
    }

    #[test]
    fn rejects_toc_dag_expansion_beyond_the_size_bound() {
        let mut script = String::new();
        for index in 1..=15 {
            use std::fmt::Write as _;
            write!(
                script,
                "var node{index} = {{}};\nnode{index}['text'] = \"Section {index}\";\nnode{index}['rcpNo'] = \"20260101000001\";\nnode{index}['dcmNo'] = \"10000001\";\nnode{index}['eleId'] = \"{index}\";\nnode{index}['offset'] = \"0\";\nnode{index}['length'] = \"1\";\nnode{index}['dtd'] = \"dart4.xsd\";\nnode{index}['children'] = [];\n"
            )
            .unwrap();
            if index > 1 {
                writeln!(script, "node{}['children'].push(node{index});", index - 1).unwrap();
                writeln!(script, "node{}['children'].push(node{index});", index - 1).unwrap();
            }
        }
        script.push_str("treeData.push(node1);\n");
        let shell = format!(
            "<script>{script}viewDoc(\"20260101000001\", \"10000001\", \"1\", \"0\", \"1\", \"dart4.xsd\");</script><select id=\"family\"><option value=\"rcpNo=20260101000001\" selected>body</option></select><select id=\"att\"></select>"
        );
        assert_eq!(
            report_shell(&shell).unwrap_err(),
            "report shell TOC exceeds the supported size"
        );
    }

    #[test]
    fn rejects_document_queries_that_embed_raw_viewer_locators() {
        let raw = SHELL.replace(
            "value=\"rcpNo=20260101000001\" selected",
            "value=\"rcpNo=20260101000001&amp;offset=100\" selected",
        );
        assert!(report_shell(&raw).is_err());
    }
}
