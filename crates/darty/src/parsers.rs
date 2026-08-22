use std::collections::{BTreeMap, BTreeSet};

use regex::Regex;
use scraper::{ElementRef, Html, Selector};
use url::Url;

use crate::{
    CompanyItemEvidence, CompanyItemReferences, DocumentKind, Filing, FilingCompany,
    FilingEvidence, FilingItemReferences, MarketKind, Pagination, Remark, ReportDocument,
    ResponseDetail, SearchCompanyItem, SearchCompanyReportsItem,
};

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
    let table = Selector::parse("#corpTable tbody").expect("static selector");
    let row = Selector::parse("#corpTable tbody > tr").expect("static selector");
    if document.select(&table).next().is_none() {
        return Err("company table is missing");
    }
    let no_data = Selector::parse("tr.noData").expect("static selector");
    let rows = document.select(&row).collect::<Vec<_>>();
    let recognized_empty =
        rows.iter()
            .any(|entry| entry.select(&no_data).next().is_some())
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
    let link_selector = Selector::parse("a[href]").expect("static selector");
    let link = row.select(&link_selector).find(|link| {
        link.value()
            .attr("href")
            .is_some_and(|href| href.contains("select("))
    })?;
    let href = link.value().attr("href")?.to_owned();
    let code = Regex::new(r#"select\(['\"](?P<code>\d{8})['\"]\)"#)
        .expect("static company-link regex")
        .captures(&href)?["code"]
        .to_owned();
    let name = collapsed_text(link);
    if name.is_empty() {
        return None;
    }

    let cell_selector = Selector::parse("td").expect("static selector");
    let cells = row.select(&cell_selector).collect::<Vec<_>>();
    let stock_text = cells
        .get(1)
        .map_or_else(String::new, |cell| collapsed_text(*cell));
    let stock_code = Regex::new(r"^\d{6}$")
        .expect("static stock regex")
        .is_match(&stock_text)
        .then_some(stock_text);

    let badge_selector = Selector::parse("[title]").expect("static selector");
    let badge = row
        .select(&badge_selector)
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
    let table = Selector::parse("table.tbList tbody").expect("static selector");
    let row = Selector::parse("table.tbList tbody > tr").expect("static selector");
    if document.select(&table).next().is_none() {
        return Err("reports table is missing");
    }
    let rows = document.select(&row).collect::<Vec<_>>();
    let empty_selector = Selector::parse("td.no_data, td[colspan]").expect("static selector");
    let recognized_empty = rows.iter().any(|entry| {
        entry.select(&empty_selector).any(|cell| {
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
    let cell_selector = Selector::parse("td").expect("static selector");
    let cells = row.select(&cell_selector).collect::<Vec<_>>();
    if cells.len() != 6 {
        return None;
    }
    let link_selector = Selector::parse("a[href]").expect("static selector");
    let company_link = cells[1].select(&link_selector).next()?;
    let company_href = company_link.value().attr("href")?;
    let company_code = Regex::new(r#"openCorpInfoNew\(['\"](?P<code>\d{8})['\"]"#)
        .expect("static company-link regex")
        .captures(company_href)?["code"]
        .to_owned();
    if company_code != requested_company_code {
        return None;
    }
    let report_link = cells[2].select(&link_selector).find(|link| {
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
    if !Regex::new(r"^\d{14}$")
        .expect("static receipt regex")
        .is_match(&receipt_number)
    {
        return None;
    }
    let receipt_date = collapsed_text(cells[4]).replace('.', "-");
    if !Regex::new(r"^\d{4}-\d{2}-\d{2}$")
        .expect("static receipt-date regex")
        .is_match(&receipt_date)
    {
        return None;
    }

    let badge_selector = Selector::parse("[title]").expect("static selector");
    let market_label = cells[1]
        .select(&badge_selector)
        .next()
        .and_then(|element| element.value().attr("title"))
        .map(str::to_owned);
    let remark_selector = Selector::parse("span").expect("static selector");
    let remarks = cells[5]
        .select(&remark_selector)
        .filter_map(|span| {
            let text = collapsed_text(span);
            (!text.is_empty()).then(|| Remark {
                text,
                title: span.value().attr("title").map(str::to_owned),
            })
        })
        .collect();
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
        "#family > option",
        DocumentKind::Body,
        &mut documents,
    );
    parse_document_options(
        &document,
        "#att > option",
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
    selector: &str,
    kind: DocumentKind,
    documents: &mut Vec<ParsedDocument>,
) {
    let selector = Selector::parse(selector).expect("static selector");
    let mut kind_index = 0_u32;
    for option in document.select(&selector) {
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
    let assignment = Regex::new(
        r#"(?m)(node\d+)\[['\"](?P<field>[A-Za-z]+)['\"]\]\s*=\s*['\"](?P<value>[^'\"]*)['\"]\s*;"#,
    )
    .expect("static shell assignment regex");
    let child = Regex::new(r#"(?m)(node\d+)\[['\"]children['\"]\]\.push\((node\d+)\)\s*;"#)
        .expect("static shell child regex");
    let root = Regex::new(r"(?m)treeData\.push\((node\d+)\)\s*;").expect("static shell root regex");
    let view_doc = Regex::new(
        r#"viewDoc\(\s*['\"]([^'\"]+)['\"]\s*,\s*['\"]([^'\"]+)['\"]\s*,\s*['\"]([^'\"]+)['\"]\s*,\s*['\"]([^'\"]+)['\"]\s*,\s*['\"]([^'\"]+)['\"]\s*,\s*['\"]([^'\"]+)['\"](?:\s*,\s*['\"]([^'\"]*)['\"])?\s*\)"#,
    )
    .expect("static viewDoc regex");

    let mut nodes: BTreeMap<String, ScriptNode> = BTreeMap::new();
    for captures in assignment.captures_iter(html) {
        nodes
            .entry(captures[1].to_owned())
            .or_default()
            .fields
            .insert(captures["field"].to_owned(), captures["value"].to_owned());
    }
    for captures in child.captures_iter(html) {
        nodes
            .entry(captures[1].to_owned())
            .or_default()
            .children
            .push(captures[2].to_owned());
    }
    let roots = root
        .captures_iter(html)
        .map(|captures| captures[1].to_owned())
        .collect::<Vec<_>>();
    let mut toc = Vec::new();
    let mut visiting = BTreeSet::new();
    for (index, name) in roots.iter().enumerate() {
        if let Some(node) = build_toc(name, &(index + 1).to_string(), &nodes, &mut visiting, 0)? {
            toc.push(node);
        }
    }
    let initial = view_doc
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
    depth: u8,
) -> Result<Option<ParsedTocNode>, &'static str> {
    if depth >= 64 {
        return Err("report shell TOC exceeds the supported depth");
    }
    if !visiting.insert(name.to_owned()) {
        return Err("report shell TOC contains a cycle");
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

fn parse_pagination(document: &Html) -> Option<Pagination> {
    let selector = Selector::parse(".pageInfo").expect("static selector");
    let text = document
        .select(&selector)
        .map(collapsed_text)
        .collect::<Vec<_>>()
        .join(" ");
    let captures = Regex::new(r"\[(\d+)/(\d+)\]\s*\[총\s*([\d,]+)건\]")
        .expect("static pagination regex")
        .captures(&text)?;
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
    fn parses_shell_tree_and_opaque_ids() {
        let shell = report_shell(SHELL).unwrap();
        assert_eq!(shell.documents[0].public.id, "document:body:1");
        assert_eq!(shell.documents[1].public.kind, DocumentKind::Attachment);
        assert_eq!(shell.toc[0].children[0].id, "section:1.1");
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
    fn rejects_document_queries_that_embed_raw_viewer_locators() {
        let raw = SHELL.replace(
            "value=\"rcpNo=20260101000001\" selected",
            "value=\"rcpNo=20260101000001&amp;offset=100\" selected",
        );
        assert!(report_shell(&raw).is_err());
    }
}
