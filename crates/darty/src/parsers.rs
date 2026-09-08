use std::{
    collections::{BTreeMap, BTreeSet},
    str::Chars,
    sync::LazyLock,
};

use regex::{Captures, Regex};
use scraper::{ElementRef, Html, Selector};
use url::Url;

use crate::{
    CompanyItemEvidence, CompanyItemReferences, DocumentKind, Filing, FilingCompany,
    FilingEvidence, FilingItemReferences, MarketKind, Pagination, Remark, ReportDocument,
    ResponseDetail, SearchCompanyItem, SearchCompanyReportsItem,
};

const MAX_TOC_EXPANSIONS: usize = 10_000;

static COMPANY_LINK: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r#"select\((?:'(?P<single_code>\d{8})'|\"(?P<double_code>\d{8})\")\)"#)
        .expect("static company-link regex")
});
static STOCK_CODE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"^\d{6}$").expect("static stock regex"));
static REPORT_COMPANY_LINK: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r#"openCorpInfoNew\((?:'(?P<single_code>\d{8})'|\"(?P<double_code>\d{8})\")"#)
        .expect("static report company-link regex")
});
static RECEIPT_NUMBER: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"^\d{14}$").expect("static receipt regex"));
static RECEIPT_DATE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"^\d{4}-\d{2}-\d{2}$").expect("static receipt-date regex"));
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
static SCRIPTS: LazyLock<Selector> =
    LazyLock::new(|| Selector::parse("script").expect("static selector"));

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
    let captures = COMPANY_LINK.captures(&href)?;
    let code = paired_capture(&captures, "single_code", "double_code")?.to_owned();
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
    let captures = REPORT_COMPANY_LINK.captures(company_href)?;
    let company_code = paired_capture(&captures, "single_code", "double_code")?.to_owned();
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
    let report_title = non_empty(collapsed_inline_text(report_link))?;
    let presenter_name = cells[3]
        .value()
        .attr("title")
        .and_then(|value| non_empty(value.split_whitespace().collect::<Vec<_>>().join(" ")))
        .or_else(|| non_empty(collapsed_text(cells[3])));

    Some(SearchCompanyReportsItem {
        company: FilingCompany {
            company_code,
            name: Some(collapsed_text(company_link)),
            market_label,
        },
        filing: Filing {
            receipt_number: receipt_number.clone(),
            report_title,
            receipt_date,
            presenter_name,
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

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum ShellParseErrorKind {
    SourceChanged,
    SourceParseFailure,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) struct ShellParseError {
    pub(crate) kind: ShellParseErrorKind,
    pub(crate) reason: &'static str,
}

impl ShellParseError {
    const fn changed(reason: &'static str) -> Self {
        Self {
            kind: ShellParseErrorKind::SourceChanged,
            reason,
        }
    }

    const fn parse_failure(reason: &'static str) -> Self {
        Self {
            kind: ShellParseErrorKind::SourceParseFailure,
            reason,
        }
    }
}

impl From<&'static str> for ShellParseError {
    fn from(reason: &'static str) -> Self {
        Self::changed(reason)
    }
}

pub(crate) fn report_shell(html: &str) -> Result<ParsedShell, ShellParseError> {
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
        return Err(ShellParseError::changed(
            "report shell has no selectable document",
        ));
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
    let (toc, initial_locator) = parse_shell_script(html, &receipt_number)?;
    if documents.iter().any(|document| {
        document_identity(&document.query)
            .is_none_or(|(document_receipt, _)| document_receipt != receipt_number)
    }) {
        return Err(ShellParseError::changed(
            "report shell document identity is inconsistent",
        ));
    }
    if !valid_locator(&initial_locator, &receipt_number, None) {
        return Err(ShellParseError::changed(
            "report shell initial viewer locator is invalid",
        ));
    }
    if selected_document_number.is_some_and(|value| value != initial_locator.document_number) {
        return Err(ShellParseError::changed(
            "report shell selected document locator is inconsistent",
        ));
    }
    if !toc_locators_are_valid(&toc, &receipt_number, &initial_locator.document_number) {
        return Err(ShellParseError::changed(
            "report shell TOC locator identity is inconsistent",
        ));
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

#[derive(Debug, Clone, PartialEq, Eq)]
enum ScriptToken {
    Identifier(String),
    String { quote: char, raw: String },
    Punctuation(char),
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct ScriptRoot {
    name: String,
    declared_at_use: bool,
}

#[allow(clippy::too_many_lines)] // Keep ordered object-state transitions visible together.
fn parse_shell_script(
    html: &str,
    receipt_number: &str,
) -> Result<(Vec<ParsedTocNode>, ViewerLocator), ShellParseError> {
    let mut nodes: BTreeMap<String, ScriptNode> = BTreeMap::new();
    let mut invalid_nodes = BTreeSet::new();
    let mut bindings = BTreeMap::new();
    let mut tree_initialized = false;
    let mut roots = Vec::new();
    let mut initial_locators = Vec::new();
    let document = Html::parse_document(html);

    for script in document
        .select(&SCRIPTS)
        .filter(|script| is_executable_script(*script))
    {
        let tokens = tokenize_script(&script.inner_html());
        let mut index = 0;
        while index < tokens.len() {
            if is_identifier(tokens.get(index), "treeData")
                && is_punctuation(tokens.get(index + 1), '=')
            {
                if tree_initialized
                    || !is_punctuation(tokens.get(index + 2), '[')
                    || !is_punctuation(tokens.get(index + 3), ']')
                {
                    return Err("report shell has ambiguous tree initialization".into());
                }
                tree_initialized = true;
            }
            if let Some((name, end)) = match_node_creation(&tokens, index) {
                // Pushes retain an object, not the variable's final binding.
                let identity = format!("object:{}", nodes.len());
                if invalid_nodes.contains(&name) {
                    invalid_nodes.insert(identity.clone());
                }
                bindings.insert(name, identity.clone());
                nodes.insert(identity, ScriptNode::default());
                index = end;
                continue;
            }
            if let Some((name, field, raw_value, end)) = match_field_assignment(&tokens, index) {
                let value = decode_script_string(raw_value)?;
                if let Some(node) = bindings.get(&name).and_then(|id| nodes.get_mut(id)) {
                    node.fields.insert(field, value);
                } else {
                    invalid_nodes.insert(name);
                }
                index = end;
                continue;
            }
            if let Some((parent, child, end)) = match_child_push(&tokens, index) {
                if let (Some(parent_id), Some(child_id)) =
                    (bindings.get(&parent), bindings.get(&child))
                {
                    nodes
                        .get_mut(parent_id)
                        .expect("bound object exists")
                        .children
                        .push(child_id.clone());
                } else {
                    invalid_nodes.insert(bindings.get(&parent).unwrap_or(&parent).clone());
                }
                index = end;
                continue;
            }
            if let Some((name, end)) = match_root_push(&tokens, index) {
                let declared_at_use = bindings.contains_key(&name);
                let name = bindings.get(&name).unwrap_or(&name).clone();
                if !declared_at_use {
                    invalid_nodes.insert(name.clone());
                }
                roots.push(ScriptRoot {
                    name,
                    declared_at_use,
                });
                index = end;
                continue;
            }
            if let Some((locator, end)) = match_view_doc(&tokens, index)? {
                initial_locators.push(locator);
                index = end;
                continue;
            }
            index += 1;
        }
    }

    if !tree_initialized && roots.is_empty() {
        return Err("report shell has no explicit empty tree initialization".into());
    }
    let mut toc = Vec::new();
    let mut visiting = BTreeSet::new();
    let mut expansions = 0;
    let mut unusable_root = false;
    for (index, root) in roots.iter().enumerate() {
        if !root.declared_at_use || invalid_nodes.contains(&root.name) {
            unusable_root = true;
            continue;
        }
        match build_toc(
            &root.name,
            &(index + 1).to_string(),
            &nodes,
            &invalid_nodes,
            &mut visiting,
            &mut expansions,
            0,
        )? {
            Some(node) => toc.push(node),
            None => unusable_root = true,
        }
    }

    if !roots.is_empty() && unusable_root {
        return Err(ShellParseError::changed(
            "report shell TOC contains declared but unusable roots",
        ));
    }
    if visiting.len() != nodes.len() {
        return Err("report shell TOC contains orphan objects".into());
    }
    let initial = initial_locators
        .into_iter()
        .find(|locator| valid_locator(locator, receipt_number, None))
        .ok_or("report shell has no valid initial viewer locator")?;
    Ok((toc, initial))
}

fn is_executable_script(script: ElementRef<'_>) -> bool {
    let Some(script_type) = script.value().attr("type") else {
        return true;
    };
    let script_type = script_type
        .split(';')
        .next()
        .map(str::trim)
        .unwrap_or_default()
        .to_ascii_lowercase();
    matches!(
        script_type.as_str(),
        "" | "text/javascript"
            | "application/javascript"
            | "text/ecmascript"
            | "application/ecmascript"
            | "application/x-javascript"
            | "module"
    )
}

#[allow(clippy::too_many_lines)] // A single cursor owns the literal/comment scanner.
fn tokenize_script(source: &str) -> Vec<ScriptToken> {
    let characters = source.chars().collect::<Vec<_>>();
    let mut tokens = Vec::new();
    let mut index = 0;
    let mut control_parentheses = Vec::new();
    let mut last_control_close = None;
    while index < characters.len() {
        let character = characters[index];
        if character.is_whitespace() {
            index += 1;
            continue;
        }
        if character == '/' && characters.get(index + 1) == Some(&'/') {
            index += 2;
            while index < characters.len() && !matches!(characters[index], '\n' | '\r') {
                index += 1;
            }
            continue;
        }
        if character == '/' && characters.get(index + 1) == Some(&'*') {
            index += 2;
            while index + 1 < characters.len()
                && !(characters[index] == '*' && characters[index + 1] == '/')
            {
                index += 1;
            }
            index = (index + 2).min(characters.len());
            continue;
        }
        if character == '<'
            && characters.get(index + 1) == Some(&'!')
            && characters.get(index + 2) == Some(&'-')
            && characters.get(index + 3) == Some(&'-')
        {
            index += 4;
            while index < characters.len() && !matches!(characters[index], '\n' | '\r') {
                index += 1;
            }
            continue;
        }
        if character == '/'
            && (can_start_regex(tokens.last())
                || last_control_close.is_some_and(|last| last + 1 == tokens.len()))
        {
            index += 1;
            let mut escaped = false;
            let mut character_class = false;
            while index < characters.len() {
                let current = characters[index];
                index += 1;
                if escaped {
                    escaped = false;
                    continue;
                }
                match current {
                    '\\' => escaped = true,
                    '[' => character_class = true,
                    ']' => character_class = false,
                    '/' if !character_class => break,
                    '\n' | '\r' => break,
                    _ => {}
                }
            }
            while characters.get(index).is_some_and(char::is_ascii_alphabetic) {
                index += 1;
            }
            // An opaque literal also prevents adjacent tokens from matching statements.
            tokens.push(ScriptToken::String {
                quote: '`',
                raw: String::new(),
            });
            continue;
        }
        if matches!(character, '\'' | '"' | '`') {
            let quote = character;
            index += 1;
            let mut raw = String::new();
            let mut escaped = false;
            let mut closed = false;
            while index < characters.len() {
                let character = characters[index];
                index += 1;
                if !escaped && character == quote {
                    closed = true;
                    break;
                }
                raw.push(character);
                if escaped {
                    escaped = false;
                } else {
                    escaped = character == '\\';
                }
            }
            if closed {
                tokens.push(ScriptToken::String { quote, raw });
            } else {
                break;
            }
            continue;
        }
        if is_script_identifier_start(character) {
            let start = index;
            index += 1;
            while index < characters.len() && is_script_identifier_continue(characters[index]) {
                index += 1;
            }
            tokens.push(ScriptToken::Identifier(
                characters[start..index].iter().collect(),
            ));
            continue;
        }
        if character == '(' {
            control_parentheses.push(matches!(tokens.last(), Some(ScriptToken::Identifier(name))
                if matches!(name.as_str(), "catch" | "for" | "if" | "switch" | "while" | "with")));
        } else if character == ')' && control_parentheses.pop() == Some(true) {
            last_control_close = Some(tokens.len());
        }
        tokens.push(ScriptToken::Punctuation(character));
        index += 1;
    }
    tokens
}

fn can_start_regex(token: Option<&ScriptToken>) -> bool {
    match token {
        None => true,
        Some(ScriptToken::Identifier(name)) => matches!(
            name.as_str(),
            "case"
                | "delete"
                | "do"
                | "else"
                | "in"
                | "instanceof"
                | "new"
                | "of"
                | "return"
                | "throw"
                | "typeof"
                | "void"
                | "yield"
        ),
        Some(ScriptToken::Punctuation(value)) => "([{=,:;!?~+-*%&|^<>".contains(*value),
        Some(ScriptToken::String { .. }) => false,
    }
}

fn is_script_identifier_start(character: char) -> bool {
    character == '_' || character == '$' || character.is_ascii_alphabetic()
}

fn is_script_identifier_continue(character: char) -> bool {
    is_script_identifier_start(character) || character.is_ascii_digit()
}

fn match_node_creation(tokens: &[ScriptToken], index: usize) -> Option<(String, usize)> {
    let mut cursor = index;
    if matches!(
        tokens.get(cursor),
        Some(ScriptToken::Identifier(keyword)) if matches!(keyword.as_str(), "var" | "let" | "const")
    ) {
        cursor += 1;
    }
    let ScriptToken::Identifier(name) = tokens.get(cursor)? else {
        return None;
    };
    if !is_node_name(name) {
        return None;
    }
    if !is_punctuation(tokens.get(cursor + 1), '=')
        || !is_punctuation(tokens.get(cursor + 2), '{')
        || !is_punctuation(tokens.get(cursor + 3), '}')
    {
        return None;
    }
    Some((name.clone(), cursor + 4))
}

fn match_field_assignment(
    tokens: &[ScriptToken],
    index: usize,
) -> Option<(String, String, &str, usize)> {
    let ScriptToken::Identifier(name) = tokens.get(index)? else {
        return None;
    };
    if !is_node_name(name)
        || !is_punctuation(tokens.get(index + 1), '[')
        || !is_punctuation(tokens.get(index + 3), ']')
        || !is_punctuation(tokens.get(index + 4), '=')
    {
        return None;
    }
    let ScriptToken::String {
        quote: field_quote,
        raw: field_raw,
    } = tokens.get(index + 2)?
    else {
        return None;
    };
    if !matches!(field_quote, '\'' | '"') {
        return None;
    }
    let field = decode_js_string(field_raw)?;
    let ScriptToken::String {
        quote: value_quote,
        raw: value_raw,
    } = tokens.get(index + 5)?
    else {
        return None;
    };
    if !matches!(value_quote, '\'' | '"') {
        return None;
    }
    Some((name.clone(), field, value_raw, index + 6))
}

fn match_child_push(tokens: &[ScriptToken], index: usize) -> Option<(String, String, usize)> {
    let ScriptToken::Identifier(parent) = tokens.get(index)? else {
        return None;
    };
    if !is_node_name(parent)
        || !is_punctuation(tokens.get(index + 1), '[')
        || !is_punctuation(tokens.get(index + 3), ']')
        || !is_punctuation(tokens.get(index + 4), '.')
        || !is_identifier(tokens.get(index + 5), "push")
        || !is_punctuation(tokens.get(index + 6), '(')
        || !is_punctuation(tokens.get(index + 8), ')')
    {
        return None;
    }
    let ScriptToken::String { quote, raw } = tokens.get(index + 2)? else {
        return None;
    };
    if !matches!(quote, '\'' | '"') || decode_js_string(raw)? != "children" {
        return None;
    }
    let ScriptToken::Identifier(child) = tokens.get(index + 7)? else {
        return None;
    };
    is_node_name(child).then(|| (parent.clone(), child.clone(), index + 9))
}

fn match_root_push(tokens: &[ScriptToken], index: usize) -> Option<(String, usize)> {
    if !is_identifier(tokens.get(index), "treeData")
        || !is_punctuation(tokens.get(index + 1), '.')
        || !is_identifier(tokens.get(index + 2), "push")
        || !is_punctuation(tokens.get(index + 3), '(')
        || !is_punctuation(tokens.get(index + 5), ')')
    {
        return None;
    }
    let ScriptToken::Identifier(name) = tokens.get(index + 4)? else {
        return None;
    };
    is_node_name(name).then(|| (name.clone(), index + 6))
}

fn match_view_doc(
    tokens: &[ScriptToken],
    index: usize,
) -> Result<Option<(ViewerLocator, usize)>, ShellParseError> {
    if !is_identifier(tokens.get(index), "viewDoc") || !is_punctuation(tokens.get(index + 1), '(') {
        return Ok(None);
    }
    let mut values = Vec::new();
    let mut cursor = index + 2;
    loop {
        let Some(ScriptToken::String { quote, raw }) = tokens.get(cursor) else {
            return Ok(None);
        };
        if !matches!(quote, '\'' | '"') {
            return Ok(None);
        }
        values.push(decode_script_string(raw)?);
        cursor += 1;
        if is_punctuation(tokens.get(cursor), ')') {
            break;
        }
        if !is_punctuation(tokens.get(cursor), ',') || values.len() >= 7 {
            return Ok(None);
        }
        cursor += 1;
    }
    if !(6..=7).contains(&values.len()) {
        return Ok(None);
    }
    let mut values = values.into_iter();
    let locator = ViewerLocator {
        receipt_number: values.next().expect("six viewDoc values were checked"),
        document_number: values.next().expect("six viewDoc values were checked"),
        element_id: values.next().expect("six viewDoc values were checked"),
        offset: values.next().expect("six viewDoc values were checked"),
        length: values.next().expect("six viewDoc values were checked"),
        dtd: values.next().expect("six viewDoc values were checked"),
        toc_number: values.next(),
    };
    Ok(Some((locator, cursor + 1)))
}

fn decode_script_string(raw: &str) -> Result<String, ShellParseError> {
    decode_js_string(raw)
        .ok_or_else(|| ShellParseError::parse_failure("report shell has an invalid string escape"))
}

fn is_node_name(value: &str) -> bool {
    value.strip_prefix("node").is_some_and(|suffix| {
        !suffix.is_empty() && suffix.bytes().all(|byte| byte.is_ascii_digit())
    })
}

fn is_identifier(token: Option<&ScriptToken>, expected: &str) -> bool {
    matches!(token, Some(ScriptToken::Identifier(value)) if value == expected)
}

fn is_punctuation(token: Option<&ScriptToken>, expected: char) -> bool {
    matches!(token, Some(ScriptToken::Punctuation(value)) if *value == expected)
}

fn paired_capture<'input>(
    captures: &Captures<'input>,
    single: &str,
    double: &str,
) -> Option<&'input str> {
    captures
        .name(single)
        .or_else(|| captures.name(double))
        .map(|value| value.as_str())
}

fn build_toc(
    name: &str,
    position: &str,
    nodes: &BTreeMap<String, ScriptNode>,
    invalid_nodes: &BTreeSet<String>,
    visiting: &mut BTreeSet<String>,
    expansions: &mut usize,
    depth: u8,
) -> Result<Option<ParsedTocNode>, &'static str> {
    if depth >= 64 {
        return Err("report shell TOC exceeds the supported depth");
    }
    if !visiting.insert(name.to_owned()) {
        return Err("report shell TOC contains a cycle or reused object");
    }
    *expansions += 1;
    if *expansions > MAX_TOC_EXPANSIONS {
        return Err("report shell TOC exceeds the supported size");
    }
    if invalid_nodes.contains(name) {
        return Ok(None);
    }
    let Some(node) = nodes.get(name) else {
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
        let Some(child) = build_toc(
            child,
            &format!("{position}.{}", index + 1),
            nodes,
            invalid_nodes,
            visiting,
            expansions,
            depth + 1,
        )?
        else {
            return Err("report shell TOC contains an unusable child");
        };
        children.push(child);
    }
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

fn collapsed_inline_text(element: ElementRef<'_>) -> String {
    element
        .text()
        .collect::<String>()
        .split_whitespace()
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
        assert_eq!(page.items[0].filing.report_title, "[기재정정]사업보고서");
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
    fn prefers_presenter_title_attribute_and_drops_empty_report_titles() {
        let fixture =
            include_str!("../../../fixtures/dart/vertical-v1/bodies/reports-populated.utf8.html");
        let titled_presenter = fixture.replace(
            r#"<td class="tL ellipsis" title="가람전자">가람전자</td>"#,
            r#"<td class="tL ellipsis" title="  표시   이름  ">셀 텍스트</td>"#,
        );
        let page = reports_page(&titled_presenter, "00000001", ResponseDetail::Concise).unwrap();
        assert_eq!(
            page.items[0].filing.presenter_name.as_deref(),
            Some("표시 이름")
        );

        let empty_title = titled_presenter.replace(
            r#"<a href="/dsaf001/main.do?rcpNo=20260101000001"><span class="txtCB" title="앞서 제출한 내용을 바로잡은 보고서">[기재정정]</span>사업보고서</a>"#,
            r#"<a href="/dsaf001/main.do?rcpNo=20260101000001"><span class="txtCB" title="앞서 제출한 내용을 바로잡은 보고서"></span></a>"#,
        );
        let page = reports_page(&empty_title, "00000001", ResponseDetail::Concise).unwrap();
        assert!(page.items.is_empty());
        assert_eq!(page.dropped, 1);
    }

    #[test]
    fn parses_shell_tree_and_opaque_ids() {
        let shell = report_shell(SHELL).unwrap();
        assert_eq!(shell.documents[0].public.id, "document:body:1");
        assert_eq!(shell.documents[1].public.kind, DocumentKind::Attachment);
        assert_eq!(shell.toc[0].children[0].id, "section:1.1");
    }

    #[test]
    fn fresh_objects_survive_variable_rebinding() {
        let html = include_str!(
            "../../../fixtures/dart/vertical-v1/bodies/report-shell-rebound.utf8.html"
        );
        let shell = report_shell(html).unwrap();
        let manifest: serde_json::Value = serde_json::from_str(include_str!(
            "../../../fixtures/dart/vertical-v1/manifest.json"
        ))
        .unwrap();
        let case = manifest["cases"]
            .as_array()
            .unwrap()
            .iter()
            .find(|case| case["id"] == "report-shell-rebound")
            .unwrap();
        assert_eq!(
            serde_json::to_value(shell.toc.len()).unwrap(),
            case["expected"]["tocRoots"]
        );
        assert_eq!(
            serde_json::to_value(shell.toc.iter().map(|node| &node.title).collect::<Vec<_>>())
                .unwrap(),
            case["expected"]["titles"]
        );
        for (index, node) in shell.toc.iter().enumerate() {
            let ordinal = index + 1;
            assert_eq!(node.id, format!("section:{ordinal}"));
            assert_eq!(node.title, format!("Fictional section {ordinal}"));
            assert_eq!(node.locator.element_id, ordinal.to_string());
            assert_eq!(node.locator.offset, (ordinal * 100).to_string());
        }
    }

    #[test]
    fn pushed_children_keep_identity_and_later_mutations() {
        let html = SHELL.replace(
            "treeData.push(node1);",
            r#"
node2['text'] = "Updated child";
var node2 = {};
node2['text'] = "Separate root";
node2['rcpNo'] = "20260101000001";
node2['dcmNo'] = "10000001";
node2['eleId'] = "3";
node2['offset'] = "500";
node2['length'] = "100";
node2['dtd'] = "dart4.xsd";
treeData.push(node1);
treeData.push(node2);
"#,
        );
        let shell = report_shell(&html).unwrap();
        assert_eq!(shell.toc[0].children[0].title, "Updated child");
        assert_eq!(shell.toc[0].children[0].locator.element_id, "2");
        assert_eq!(shell.toc[1].title, "Separate root");
    }

    #[test]
    fn rejects_duplicate_root_objects_and_abandoned_creations() {
        for replacement in [
            "treeData.push(node1); treeData.push(node1);",
            "treeData.push(node1); var node1 = {};",
            "var node1 = {}; treeData.push(node1);",
        ] {
            assert!(report_shell(&SHELL.replace("treeData.push(node1);", replacement)).is_err());
        }
    }

    #[test]
    fn excludes_regex_decoys_in_expression_and_control_contexts() {
        for prefix in ["const fake =", "if (true)", "return"] {
            let replacement = format!(
                "var treeData = []; {prefix} /treeData.push(node99); viewDoc('bad','bad','bad','bad','bad','bad')/;"
            );
            let shell = report_shell(&SHELL.replace("var treeData = [];", &replacement)).unwrap();
            assert_eq!(shell.toc.len(), 1);
        }
    }

    #[test]
    fn no_toc_requires_explicit_executable_empty_initialization() {
        let html =
            include_str!("../../../fixtures/dart/vertical-v1/bodies/report-shell-no-toc.utf8.html");
        assert!(report_shell(html).is_ok());
        assert!(report_shell(&html.replace("var treeData = [];", "")).is_err());
        assert!(report_shell(&html.replace("var treeData = [];", "var treeData = {};")).is_err());
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
    fn classifies_invalid_shell_string_decoding_as_parse_failure() {
        let malformed = SHELL.replace(
            r#"node1['text'] = "I. 회사의 개요";"#,
            r#"node1['text'] = "Invalid \uZZZZ title";"#,
        );
        let failure = report_shell(&malformed).unwrap_err();
        assert_eq!(failure.kind, super::ShellParseErrorKind::SourceParseFailure);
        assert_eq!(failure.reason, "report shell has an invalid string escape");
    }

    #[test]
    fn parser_patterns_reject_mismatched_javascript_quotes() {
        assert!(super::COMPANY_LINK.is_match("select('00000001')"));
        assert!(super::COMPANY_LINK.is_match(r#"select("00000001")"#));
        assert!(!super::COMPANY_LINK.is_match(r#"select('00000001")"#));
        assert!(super::REPORT_COMPANY_LINK.is_match(r#"openCorpInfoNew("00000001", 'window')"#));
        assert!(!super::REPORT_COMPANY_LINK.is_match(r#"openCorpInfoNew('00000001", 'window')"#));
    }

    #[test]
    fn shell_parser_ignores_comments_and_string_contained_fake_statements() {
        let fake = SHELL.replace(
            "var treeData = [];",
            r#"var treeData = [];
// treeData.push(node99);
/* node99['text'] = "fake"; viewDoc("bad", "bad", "bad", "bad", "bad", "bad"); */
var fake = "treeData.push(node98); node98['text'] = \\"fake\\";";"#,
        );
        let shell = report_shell(&fake).unwrap();
        assert_eq!(shell.toc.len(), 1);
        assert_eq!(shell.toc[0].title, "I. 회사의 개요");
        assert_eq!(shell.initial_locator.receipt_number, "20260101000001");
    }

    #[test]
    fn shell_parser_requires_node_creation_before_field_use() {
        let malformed = SHELL.replace(
            "var node1 = {};",
            "node1['text'] = \"used before creation\";\nvar node1 = {};",
        );
        let failure = report_shell(&malformed).unwrap_err();
        assert_eq!(failure.kind, super::ShellParseErrorKind::SourceChanged);
        assert!(failure.reason.contains("unusable roots"));
    }

    #[test]
    fn shell_parser_propagates_invalid_descendants_through_valid_parents() {
        let malformed_child = SHELL.replace(
            "treeData.push(node1);",
            r#"var node3 = {};
node3['text'] = "Invalid descendant";
node3['rcpNo'] = "20260101000001";
node3['dcmNo'] = "10000001";
node3['eleId'] = "3";
node3['offset'] = "0";
node3['length'] = "1";
node3['dtd'] = "dart4.xsd";
node3['children'] = [];
node3['children'].push(node4);
var node4 = {};
node1['children'].push(node3);
treeData.push(node1);"#,
        );
        let failure = report_shell(&malformed_child).unwrap_err();
        assert_eq!(failure.kind, super::ShellParseErrorKind::SourceChanged);
        assert_eq!(
            failure.reason,
            "report shell TOC contains an unusable child"
        );
    }

    #[test]
    fn shell_parser_distinguishes_zero_roots_from_unusable_and_mixed_roots() {
        let zero_roots = SHELL.replace("treeData.push(node1);", "// treeData.push(node1);");
        assert_eq!(
            report_shell(&zero_roots).unwrap_err().reason,
            "report shell TOC contains orphan objects"
        );

        let unusable_root = SHELL.replace("treeData.push(node1);", "treeData.push(node99);");
        let failure = report_shell(&unusable_root).unwrap_err();
        assert_eq!(failure.kind, super::ShellParseErrorKind::SourceChanged);
        assert!(failure.reason.contains("unusable roots"));

        let mixed_roots = SHELL.replace(
            "treeData.push(node1);",
            "treeData.push(node1);\ntreeData.push(node99);",
        );
        let failure = report_shell(&mixed_roots).unwrap_err();
        assert_eq!(failure.kind, super::ShellParseErrorKind::SourceChanged);
        assert!(failure.reason.contains("unusable roots"));
    }

    #[test]
    fn rejects_cyclic_toc_graphs() {
        let cyclic = SHELL.replace(
            "node1['children'].push(node2);",
            "node1['children'].push(node2);\nnode2['children'].push(node1);",
        );
        assert_eq!(
            report_shell(&cyclic).unwrap_err().reason,
            "report shell TOC contains a cycle or reused object"
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
            report_shell(&drifted).unwrap_err().reason,
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
    fn skips_a_foreign_initial_call_before_the_requested_receipt() {
        let foreign_then_genuine = SHELL.replace(
            "viewDoc(\"20260101000001\"",
            "viewDoc(\"20260101000009\", \"90000001\", \"9\", \"0\", \"1\", \"dart4.xsd\");\nviewDoc(\"20260101000001\"",
        );
        let shell = report_shell(&foreign_then_genuine).unwrap();
        assert_eq!(shell.initial_locator.receipt_number, "20260101000001");
        assert_eq!(shell.initial_locator.document_number, "10000001");
    }

    #[test]
    fn toc_depth_accepts_64_levels_and_rejects_65() {
        for depth in [64, 65] {
            let mut script = String::new();
            for index in 1..=depth {
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
            if depth == 64 {
                assert!(report_shell(&shell).is_ok());
            } else {
                assert_eq!(
                    report_shell(&shell).unwrap_err().reason,
                    "report shell TOC exceeds the supported depth"
                );
            }
        }
    }

    #[test]
    fn toc_forest_accepts_ten_thousand_objects_and_rejects_one_more() {
        use std::fmt::Write as _;
        for count in [10_000, 10_001] {
            let mut script = String::new();
            for index in 1..=count {
                writeln!(script, "var node1 = {{}}; node1['text'] = 'Section {index}'; node1['rcpNo'] = '20260101000001'; node1['dcmNo'] = '10000001'; node1['eleId'] = '{index}'; node1['offset'] = '0'; node1['length'] = '1'; node1['dtd'] = 'dart4.xsd'; treeData.push(node1);").unwrap();
            }
            let html = format!(
                "<script>{script}viewDoc('20260101000001','10000001','1','0','1','dart4.xsd');</script><select id='family'><option value='rcpNo=20260101000001' selected>body</option></select><select id='att'></select>"
            );
            if count == 10_000 {
                assert_eq!(report_shell(&html).unwrap().toc.len(), count);
            } else {
                assert!(report_shell(&html).is_err());
            }
        }
    }

    #[test]
    fn rejects_shared_objects_before_expanding_a_dag() {
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
            report_shell(&shell).unwrap_err().reason,
            "report shell TOC contains a cycle or reused object"
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
