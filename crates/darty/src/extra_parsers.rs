use std::collections::BTreeMap;

use crate::{CompanyDetailInfo, CompanyRssChannel, CompanyRssItem, ErrorCode, ResponseDetail};
use scraper::{ElementRef, Html, Selector};

fn selector(value: &str) -> Selector {
    Selector::parse(value).expect("static selector")
}
fn collapse(value: &str) -> String {
    value.split_whitespace().collect::<Vec<_>>().join(" ")
}
fn optional(value: &str) -> Option<String> {
    let value = collapse(value);
    (!value.is_empty()).then_some(value)
}
fn text(element: ElementRef<'_>) -> String {
    collapse(&element.text().collect::<String>())
}

pub(crate) fn company_detail(html: &str, code: &str) -> Result<CompanyDetailInfo, ErrorCode> {
    let document = Html::parse_document(html);
    if document
        .select(&selector("#corpDetailTable"))
        .next()
        .is_none()
    {
        return Err(ErrorCode::SourceChanged);
    }
    let mut fields = BTreeMap::new();
    let mut homepage = None;
    for row in document.select(&selector("#corpDetailTable tbody tr")) {
        let Some(label) = row.select(&selector("th")).next().map(text) else {
            continue;
        };
        let Some(cell) = row.select(&selector("td")).next() else {
            fields.insert(label, String::new());
            continue;
        };
        let clean = cell
            .descendants()
            .filter_map(|node| {
                let value = node.value().as_text()?;
                let excluded = node
                    .ancestors()
                    .filter_map(ElementRef::wrap)
                    .any(|element| matches!(element.value().name(), "button" | "script" | "style"));
                (!excluded).then_some(value.text.as_ref())
            })
            .collect::<String>();
        if label == "홈페이지" && homepage.is_none() {
            homepage = row
                .select(&selector("a[href]"))
                .next()
                .and_then(|link| link.value().attr("href"))
                .and_then(optional);
        }
        fields.insert(label, collapse(&clean));
    }
    let name = fields.get("회사이름").ok_or(ErrorCode::SourceChanged)?;
    let company_name = optional(name).ok_or(ErrorCode::NotFound)?;
    let get = |key: &str| fields.get(key).and_then(|value| optional(value));
    let stock_code = get("종목코드");
    if stock_code
        .as_ref()
        .is_some_and(|value| value.len() != 6 || !value.bytes().all(|byte| byte.is_ascii_digit()))
    {
        return Err(ErrorCode::SourceParseFailure);
    }
    Ok(CompanyDetailInfo {
        company_code: code.to_owned(),
        company_name,
        stock_code,
        english_name: get("영문명"),
        disclosure_company_name: get("공시회사명"),
        representative_name: get("대표자명"),
        corporation_kind: get("법인구분"),
        corporate_registration_number: get("법인등록번호"),
        business_registration_number: get("사업자등록번호"),
        address: get("주소"),
        homepage: homepage.or_else(|| get("홈페이지")),
        phone_number: get("전화번호"),
        fax_number: get("팩스번호"),
        industry_name: get("업종명"),
        established_date: get("설립일"),
        fiscal_month: get("결산월"),
    })
}

fn xml_text(node: roxmltree::Node<'_, '_>, name: &str, dc: bool) -> Option<String> {
    node.children()
        .find(|child| {
            child.is_element()
                && child.tag_name().name() == name
                && (child.tag_name().namespace().is_none()
                    || (dc
                        && child.tag_name().namespace()
                            == Some("http://purl.org/dc/elements/1.1/")))
        })
        .and_then(|child| {
            optional(
                &child
                    .descendants()
                    .filter(roxmltree::Node::is_text)
                    .filter_map(|part| part.text())
                    .collect::<String>(),
            )
        })
}
fn published(node: roxmltree::Node<'_, '_>) -> Option<String> {
    xml_text(node, "date", true).or_else(|| xml_text(node, "pubDate", false))
}

pub(crate) fn company_rss(
    xml: &str,
    detail: ResponseDetail,
) -> Result<(CompanyRssChannel, Vec<CompanyRssItem>), ErrorCode> {
    let document = roxmltree::Document::parse_with_options(
        xml,
        roxmltree::ParsingOptions {
            allow_dtd: false,
            nodes_limit: 100_000,
            ..Default::default()
        },
    )
    .map_err(|_| ErrorCode::SourceParseFailure)?;
    let channel = document
        .descendants()
        .find(|node| node.has_tag_name("channel"))
        .ok_or(ErrorCode::SourceChanged)?;
    let expanded = detail != ResponseDetail::Concise;
    let result_channel = CompanyRssChannel {
        title: xml_text(channel, "title", false).ok_or(ErrorCode::SourceChanged)?,
        link: xml_text(channel, "link", false).ok_or(ErrorCode::SourceChanged)?,
        description: expanded
            .then(|| xml_text(channel, "description", false))
            .flatten(),
        language: expanded
            .then(|| xml_text(channel, "language", false))
            .flatten(),
        published_at: expanded.then(|| published(channel)).flatten(),
    };
    let mut items = Vec::new();
    for node in channel.children().filter(|node| node.has_tag_name("item")) {
        let title = xml_text(node, "title", false).ok_or(ErrorCode::SourceChanged)?;
        let link = xml_text(node, "link", false).ok_or(ErrorCode::SourceChanged)?;
        let receipt_number = url::Url::parse(&link)
            .ok()
            .and_then(|url| {
                url.query_pairs()
                    .find(|(key, _)| key == "rcpNo")
                    .map(|(_, value)| value.into_owned())
            })
            .filter(|value| value.len() == 14 && value.bytes().all(|byte| byte.is_ascii_digit()));
        items.push(CompanyRssItem {
            title,
            link,
            receipt_number,
            published_at: published(node),
            creator: xml_text(node, "creator", true),
            guid: expanded.then(|| xml_text(node, "guid", false)).flatten(),
        });
    }
    Ok((result_channel, items))
}

use crate::{
    Pagination, SearchBodyCompany, SearchBodyEvidence, SearchBodyFiling, SearchBodyItem,
    SearchBodyItemReferences, SearchBodyMatch, SearchBodyRequest,
};
use regex::Regex;
use std::sync::LazyLock;

static BODY_PAGER: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"\[(\d+)/(\d+)\]\s*\[총\s*([0-9,]+)건\]").unwrap());
static BODY_COMPANY: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"openCorpInfoNew\('(\d{8})'").unwrap());
static BODY_MODIFIER: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"^\[([^\]]+)\]\s*").unwrap());
static BODY_PERIOD: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"\(([^()]+)\)").unwrap());
static BODY_LABEL: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"\[([^\]]+)\]").unwrap());
static BODY_PRESENTER: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"제출인\s*:\s*(.+)$").unwrap());
static BODY_DATE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"^(\d{4})\.(\d{2})\.(\d{2})$").unwrap());

fn first_text(element: ElementRef<'_>, query: &str) -> String {
    element
        .select(&selector(query))
        .next()
        .map(text)
        .unwrap_or_default()
}
fn digits(value: &str) -> Option<u32> {
    value
        .chars()
        .filter(char::is_ascii_digit)
        .collect::<String>()
        .parse()
        .ok()
}

pub(crate) fn body_page(
    html: &str,
    request: &SearchBodyRequest,
) -> Result<(Pagination, Vec<SearchBodyItem>, u32), &'static str> {
    let document = Html::parse_document(html);
    let table = document
        .select(&selector("table.tbWideList"))
        .next()
        .ok_or("DART body search has no result table")?;
    let tbody = table
        .children()
        .filter_map(ElementRef::wrap)
        .find(|node| node.value().name() == "tbody")
        .ok_or("DART body search has no result body")?;
    let rows = tbody
        .children()
        .filter_map(ElementRef::wrap)
        .filter(|node| node.value().name() == "tr")
        .collect::<Vec<_>>();
    if rows.is_empty() {
        return Err("DART body search has no result rows");
    }
    let sentinel_count = rows
        .iter()
        .filter(|row| {
            row.select(&selector("td[colspan]"))
                .any(|cell| text(cell) == "조회 결과가 없습니다.")
        })
        .count();
    let empty = sentinel_count > 0;
    if empty
        && (rows.len() != 1
            || rows[0]
                .children()
                .filter_map(ElementRef::wrap)
                .filter(|node| node.value().name() == "td")
                .count()
                != 1)
    {
        return Err("DART body search mixes empty and data rows");
    }
    let count = document
        .select(&selector("#totalCnt"))
        .next()
        .and_then(|node| node.value().attr("value"))
        .map_or_else(
            || {
                document
                    .select(&selector("#searchCnt"))
                    .next()
                    .map(text)
                    .unwrap_or_default()
            },
            str::to_owned,
        );
    let total_count = digits(&count).ok_or("DART body search has no total count")?;
    let page_text = document
        .select(&selector(".pageInfo"))
        .next()
        .map(text)
        .unwrap_or_default();
    let page = BODY_PAGER.captures(&page_text);
    let (current_page, total_pages) = if let Some(page) = page {
        (
            digits(&page[1]).ok_or("invalid body page")?,
            digits(&page[2]).ok_or("invalid total pages")?,
        )
    } else if empty {
        (1, 0)
    } else {
        return Err("DART body search has no pagination");
    };
    if current_page == 0
        || (empty && (total_count != 0 || total_pages != 0))
        || (!empty && total_count == 0)
    {
        return Err("DART body search pagination contradicts rows");
    }
    let mut items = Vec::new();
    let mut dropped = 0;
    if !empty {
        for row in rows {
            match body_row(row, request) {
                Some(item) => items.push(item),
                None => dropped += 1,
            }
        }
    }
    let returned_count = u32::try_from(items.len()).map_err(|_| "too many body rows")?;
    Ok((
        Pagination {
            current_page,
            total_pages,
            total_count,
            returned_count,
        },
        items,
        dropped,
    ))
}

fn body_viewer(href: &str) -> Option<(url::Url, String)> {
    let viewer = url::Url::parse("https://dart.fss.or.kr")
        .ok()?
        .join(href)
        .ok()?;
    if viewer.origin().ascii_serialization() != "https://dart.fss.or.kr"
        || viewer.path() != "/dsaf001/main.do"
        || !viewer.username().is_empty()
        || viewer.password().is_some()
    {
        return None;
    }
    let receipts = viewer
        .query_pairs()
        .filter(|(key, _)| key == "rcpNo")
        .map(|(_, value)| value.into_owned())
        .collect::<Vec<_>>();
    if receipts.len() != 1
        || receipts[0].len() != 14
        || !receipts[0].bytes().all(|byte| byte.is_ascii_digit())
    {
        return None;
    }
    Some((viewer, receipts.into_iter().next()?))
}

fn body_row(row: ElementRef<'_>, request: &SearchBodyRequest) -> Option<SearchBodyItem> {
    let report = row.select(&selector("a.second")).next()?;
    let href = report.value().attr("href")?;
    let (viewer, receipt_number) = body_viewer(href)?;
    let company = row.select(&selector("a.company")).next();
    let company_code = company
        .and_then(|node| node.value().attr("href"))
        .and_then(|href| BODY_COMPANY.captures(href))
        .map(|captures| captures[1].to_owned());
    if request.company_code.is_some() && request.company_code != company_code {
        return None;
    }
    let raw_title = text(report);
    let modifier = BODY_MODIFIER.captures(&raw_title);
    let report_modifier = modifier.as_ref().map(|captures| captures[1].to_owned());
    let title = modifier.as_ref().map_or(raw_title.as_str(), |captures| {
        &raw_title[captures.get(0).unwrap().end()..]
    });
    let period = BODY_PERIOD.captures(title);
    let report_period = period.as_ref().map(|captures| captures[1].to_owned());
    let report_title = collapse(
        period
            .as_ref()
            .map_or(title, |captures| &title[..captures.get(0).unwrap().start()]),
    );
    let report_name_suffix = period
        .as_ref()
        .and_then(|captures| optional(&title[captures.get(0).unwrap().end()..]));
    let snippet = row.select(&selector("td")).next();
    let info = first_text(row, "td.info");
    let labels = BODY_LABEL
        .captures_iter(&info)
        .map(|captures| collapse(&captures[1]))
        .collect::<Vec<_>>();
    let raw_date = first_text(row, "td.date");
    let receipt_date = BODY_DATE.replace(&raw_date, "$1-$2-$3").into_owned();
    let expanded = request.detail != ResponseDetail::Concise;
    Some(SearchBodyItem {
        company: SearchBodyCompany {
            name: company.map(text).unwrap_or_default(),
            company_code,
            market_label: row
                .select(&selector(".companyName > span[title]"))
                .next()
                .and_then(|node| node.value().attr("title"))
                .and_then(optional),
        },
        filing: SearchBodyFiling {
            receipt_number,
            document_number: expanded
                .then(|| {
                    viewer
                        .query_pairs()
                        .find(|(key, _)| key == "dcmNo")
                        .map(|(_, value)| value.into_owned())
                })
                .flatten(),
            report_title,
            report_modifier,
            report_period,
            report_name_suffix,
            receipt_date,
        },
        r#match: SearchBodyMatch {
            snippet_text: snippet.map(text).unwrap_or_default(),
            disclosure_type_label: labels.first().and_then(|label| optional(label)),
            content_type_label: labels.get(1).and_then(|label| optional(label)),
            presenter_name: BODY_PRESENTER
                .captures(&info)
                .and_then(|captures| optional(&captures[1])),
        },
        references: SearchBodyItemReferences {
            viewer_url: viewer.into(),
        },
        evidence: expanded.then(|| SearchBodyEvidence {
            report_name_raw: raw_title,
            raw_info_text: info,
            snippet_html: snippet
                .map(|node| node.inner_html().trim().to_owned())
                .unwrap_or_default(),
        }),
    })
}
