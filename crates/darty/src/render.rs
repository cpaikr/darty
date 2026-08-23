use std::{
    borrow::Cow,
    collections::{HashMap, HashSet},
    fmt::Write as _,
    sync::LazyLock,
};

use ego_tree::NodeRef;
use scraper::{Html, node::Node};
use url::Url;

use crate::{ContentWindow, OutputFormat, ReportContent};

pub(crate) fn render_content(
    source_html: &str,
    format: OutputFormat,
    start_byte: u32,
    max_bytes: u32,
    scope: &str,
    section: Option<crate::ContentSection>,
) -> ReportContent {
    let sanitized = sanitize(source_html);
    let rendered = match format {
        OutputFormat::Html => sanitized,
        OutputFormat::Markdown => markdown(&sanitized),
    };
    window(&rendered, format, start_byte, max_bytes, scope, section)
}

fn sanitize(source_html: &str) -> String {
    let mut tag_attributes = HashMap::new();
    tag_attributes.insert("a", HashSet::from(["href"]));
    tag_attributes.insert("img", HashSet::from(["alt", "src"]));
    tag_attributes.insert("td", HashSet::from(["colspan", "rowspan"]));
    tag_attributes.insert("th", HashSet::from(["colspan", "rowspan", "scope"]));
    tag_attributes.insert("ol", HashSet::from(["start"]));

    let mut builder = ammonia::Builder::default();
    builder
        .tags(HashSet::from([
            "address",
            "article",
            "aside",
            "footer",
            "header",
            "h1",
            "h2",
            "h3",
            "h4",
            "h5",
            "h6",
            "hgroup",
            "main",
            "nav",
            "section",
            "blockquote",
            "dd",
            "div",
            "dl",
            "dt",
            "figcaption",
            "figure",
            "hr",
            "li",
            "menu",
            "ol",
            "p",
            "pre",
            "ul",
            "a",
            "abbr",
            "b",
            "bdi",
            "bdo",
            "br",
            "cite",
            "code",
            "data",
            "dfn",
            "em",
            "i",
            "kbd",
            "mark",
            "q",
            "rb",
            "rp",
            "rt",
            "rtc",
            "ruby",
            "s",
            "samp",
            "small",
            "span",
            "strong",
            "sub",
            "sup",
            "time",
            "u",
            "var",
            "wbr",
            "caption",
            "table",
            "tbody",
            "td",
            "tfoot",
            "th",
            "thead",
            "tr",
            "img",
        ]))
        .tag_attributes(tag_attributes)
        .generic_attributes(HashSet::new())
        .url_schemes(HashSet::from(["http", "https", "ftp", "mailto", "tel"]))
        .link_rel(None)
        .attribute_filter(|element, attribute, value| {
            if element == "img" && attribute == "src" {
                match Url::parse(value) {
                    Ok(url) if !matches!(url.scheme(), "http" | "https") => None,
                    _ => Some(Cow::Borrowed(value)),
                }
            } else {
                Some(Cow::Borrowed(value))
            }
        })
        .url_relative(ammonia::UrlRelative::Custom(Box::new(
            rewrite_dart_relative_url,
        )));
    builder.clean(source_html).to_string()
}

fn rewrite_dart_relative_url(value: &str) -> Option<Cow<'_, str>> {
    static DART_ORIGIN: LazyLock<Url> = LazyLock::new(|| {
        Url::parse("https://dart.fss.or.kr/").expect("static DART origin is valid")
    });
    if value.starts_with("//") {
        return None;
    }
    DART_ORIGIN.join(value).ok().and_then(|url| {
        (url.scheme() == "https"
            && url.host_str() == Some("dart.fss.or.kr")
            && url.port().is_none())
        .then(|| Cow::Owned(url.into()))
    })
}

fn markdown(sanitized_html: &str) -> String {
    let fragment = Html::parse_fragment(sanitized_html);
    let mut output = String::new();
    for child in fragment.tree.root().children() {
        render_node(child, &mut output, 0);
    }
    normalize_markdown(&output)
}

fn render_node(node: NodeRef<'_, Node>, output: &mut String, list_depth: usize) {
    match node.value() {
        Node::Text(text) => output.push_str(&text.text),
        Node::Element(element) => {
            let name = element.name();
            if name == "table" {
                if let Some(element_ref) = scraper::ElementRef::wrap(node) {
                    ensure_blank_line(output);
                    output.push_str(&element_ref.html());
                    ensure_blank_line(output);
                }
                return;
            }
            match name {
                "h1" | "h2" | "h3" | "h4" | "h5" | "h6" => {
                    ensure_blank_line(output);
                    let level = name[1..].parse::<usize>().unwrap_or(1);
                    output.push_str(&"#".repeat(level));
                    output.push(' ');
                    render_children(node, output, list_depth);
                    ensure_blank_line(output);
                }
                "p" | "div" | "section" | "article" => {
                    ensure_blank_line(output);
                    render_children(node, output, list_depth);
                    ensure_blank_line(output);
                }
                "strong" | "b" => {
                    output.push_str("**");
                    render_children(node, output, list_depth);
                    output.push_str("**");
                }
                "em" | "i" => {
                    output.push('*');
                    render_children(node, output, list_depth);
                    output.push('*');
                }
                "code" if node.parent().is_some_and(|parent| {
                    matches!(parent.value(), Node::Element(parent) if parent.name() == "pre")
                }) => render_children(node, output, list_depth),
                "code" => {
                    output.push('`');
                    render_children(node, output, list_depth);
                    output.push('`');
                }
                "pre" => {
                    ensure_blank_line(output);
                    output.push_str("```\n");
                    render_children(node, output, list_depth);
                    output.push_str("\n```");
                    ensure_blank_line(output);
                }
                "a" => {
                    output.push('[');
                    render_children(node, output, list_depth);
                    output.push_str("](");
                    output.push_str(element.attr("href").unwrap_or_default());
                    output.push(')');
                }
                "br" => output.push_str("  \n"),
                "ul" | "ol" => {
                    ensure_blank_line(output);
                    let ordered = name == "ol";
                    let mut index = 0_usize;
                    for child in node.children() {
                        if matches!(child.value(), Node::Element(element) if element.name() == "li") {
                            index += 1;
                            output.push_str(&"  ".repeat(list_depth));
                            if ordered {
                                write!(output, "{index}. ").expect("writing to a string cannot fail");
                            } else {
                                output.push_str("- ");
                            }
                            render_children(child, output, list_depth + 1);
                            output.push('\n');
                        }
                    }
                    ensure_blank_line(output);
                }
                "blockquote" => {
                    ensure_blank_line(output);
                    let mut rendered = String::new();
                    render_children(node, &mut rendered, list_depth);
                    for line in rendered.trim_matches('\n').lines() {
                        output.push_str("> ");
                        output.push_str(line);
                        output.push('\n');
                    }
                    ensure_blank_line(output);
                }
                _ => render_children(node, output, list_depth),
            }
        }
        _ => render_children(node, output, list_depth),
    }
}

fn render_children(node: NodeRef<'_, Node>, output: &mut String, list_depth: usize) {
    for child in node.children() {
        render_node(child, output, list_depth);
    }
}

fn ensure_blank_line(output: &mut String) {
    if output.is_empty() {
        return;
    }
    if !output.ends_with('\n') {
        output.push('\n');
    }
    if !output.ends_with("\n\n") {
        output.push('\n');
    }
}

fn normalize_markdown(value: &str) -> String {
    let lines = value.lines().map(str::trim_end).collect::<Vec<_>>();
    let mut normalized = String::new();
    let mut previous_blank = true;
    for line in lines {
        let blank = line.trim().is_empty();
        if blank && previous_blank {
            continue;
        }
        if !normalized.is_empty() {
            normalized.push('\n');
        }
        normalized.push_str(line);
        previous_blank = blank;
    }
    normalized.trim_matches('\n').to_owned()
}

fn window(
    rendered: &str,
    format: OutputFormat,
    requested_start: u32,
    max_bytes: u32,
    scope: &str,
    section: Option<crate::ContentSection>,
) -> ReportContent {
    let total = rendered.len();
    let mut start = usize::try_from(requested_start)
        .unwrap_or(usize::MAX)
        .min(total);
    while start < total && !rendered.is_char_boundary(start) {
        start += 1;
    }
    let mut end = start
        .saturating_add(usize::try_from(max_bytes).unwrap_or(usize::MAX))
        .min(total);
    while end > start && !rendered.is_char_boundary(end) {
        end -= 1;
    }
    let body = rendered[start..end].to_owned();
    let has_more = end < total;
    ReportContent {
        scope: scope.to_owned(),
        size_bytes: u32::try_from(total).unwrap_or(u32::MAX),
        returned_bytes: u32::try_from(body.len()).unwrap_or(u32::MAX),
        is_full_content: start == 0 && !has_more,
        window: ContentWindow {
            unit: "utf8-bytes".to_owned(),
            start_byte: u32::try_from(start).unwrap_or(u32::MAX),
            end_byte: u32::try_from(end).unwrap_or(u32::MAX),
            has_more,
            next_start_byte: has_more.then(|| u32::try_from(end).unwrap_or(u32::MAX)),
        },
        section,
        format,
        body,
    }
}

#[cfg(test)]
mod tests {
    use super::render_content;
    use crate::OutputFormat;

    #[test]
    fn markdown_preserves_tables_as_sanitized_html() {
        let content = render_content(
            "<h2>Title</h2><p><strong>Hello</strong></p><table style='x'><tr><td colspan='2'>v</td></tr></table>",
            OutputFormat::Markdown,
            0,
            10_000,
            "document",
            None,
        );
        assert!(content.body.contains("## Title"));
        assert!(content.body.contains("**Hello**"));
        assert!(content.body.contains("<table>"));
        assert!(content.body.contains("colspan=\"2\""));
        assert!(!content.body.contains("style"));
    }

    #[test]
    fn sanitizer_rewrites_dart_relative_urls_and_rejects_protocol_relative_urls() {
        let content = render_content(
            r#"<p><a href="/report">report</a><img src="images/logo.png"><a href="//evil.example/report">evil</a><img src="//evil.example/logo.png"><a href="\\evil.example/backslash">backslash</a></p>"#,
            OutputFormat::Html,
            0,
            10_000,
            "document",
            None,
        );
        assert!(
            content
                .body
                .contains("href=\"https://dart.fss.or.kr/report\"")
        );
        assert!(
            content
                .body
                .contains("src=\"https://dart.fss.or.kr/images/logo.png\"")
        );
        assert!(!content.body.contains("evil.example"));
    }

    #[test]
    fn sanitizer_uses_tag_specific_attributes_and_url_schemes() {
        let content = render_content(
            r#"<p lang="ko" title="ignored"><a href="mailto:ir@example.com" title="ignored">mail</a><a href="ftp://dart.fss.or.kr/file">ftp</a><img src="mailto:ir@example.com" alt="mail" width="10"><img src="ftp://dart.fss.or.kr/logo.png" alt="ftp"><img src="https://dart.fss.or.kr/logo.png" alt="ok"></p><table><tr><th scope="col" headers="ignored">head</th><td colspan="2" rowspan="3" style="ignored">cell</td></tr></table><ol start="3"><li>item</li></ol>"#,
            OutputFormat::Html,
            0,
            10_000,
            "document",
            None,
        );
        assert!(
            content
                .body
                .contains("<a href=\"mailto:ir@example.com\">mail</a>")
        );
        assert!(
            content
                .body
                .contains("<a href=\"ftp://dart.fss.or.kr/file\">ftp</a>")
        );
        assert!(content.body.contains("<img alt=\"mail\">"));
        assert!(content.body.contains("<img alt=\"ftp\">"));
        assert!(
            content
                .body
                .contains("<img src=\"https://dart.fss.or.kr/logo.png\" alt=\"ok\">")
        );
        assert!(content.body.contains("<th scope=\"col\">head</th>"));
        assert!(
            content
                .body
                .contains("<td colspan=\"2\" rowspan=\"3\">cell</td>")
        );
        assert!(content.body.contains("<ol start=\"3\">"));
        assert!(!content.body.contains("title="));
        assert!(!content.body.contains("lang="));
        assert!(!content.body.contains("headers="));
        assert!(!content.body.contains("style="));
        assert!(!content.body.contains("width="));
    }

    #[test]
    fn markdown_preserves_nested_list_and_preformatted_indentation() {
        let content = render_content(
            "<ul><li>outer<ul><li>inner</li></ul></li></ul><pre><code>  indented\n    deeper</code></pre>",
            OutputFormat::Markdown,
            0,
            10_000,
            "document",
            None,
        );
        assert!(content.body.contains("  - inner"));
        assert!(content.body.contains("  indented\n    deeper"));
    }

    #[test]
    fn markdown_prefixes_every_blockquote_line() {
        let content = render_content(
            "<blockquote><p>first paragraph</p><p>second<br>line</p></blockquote>",
            OutputFormat::Markdown,
            0,
            10_000,
            "document",
            None,
        );
        assert_eq!(content.body, "> first paragraph\n>\n> second\n> line");
    }

    #[test]
    fn window_advances_multibyte_start_and_never_splits_text() {
        let content = render_content(
            "<p>가나다</p>",
            OutputFormat::Markdown,
            1,
            4,
            "document",
            None,
        );
        assert_eq!(content.window.start_byte, 3);
        assert_eq!(content.body, "나");
        assert!(content.window.has_more);
    }
}
