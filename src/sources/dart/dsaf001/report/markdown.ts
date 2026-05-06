import * as cheerio from "cheerio";
import { isTag, type AnyNode, type Element } from "domhandler";

import { sanitizeReportHtml } from "./sanitize-html.ts";

const blockTags = new Set([
  "address",
  "article",
  "aside",
  "blockquote",
  "caption",
  "center",
  "dd",
  "details",
  "dialog",
  "div",
  "dl",
  "dt",
  "fieldset",
  "figcaption",
  "figure",
  "footer",
  "form",
  "header",
  "hr",
  "main",
  "nav",
  "p",
  "section",
]);

const textData = (node: AnyNode): string =>
  "data" in node && typeof node.data === "string" ? node.data : "";

const isElement = (node: AnyNode): node is Element => isTag(node);

const hasChildren = (
  node: AnyNode,
): node is AnyNode & { readonly children: readonly AnyNode[] } =>
  "children" in node && Array.isArray(node.children);

const normalizeInline = (value: string): string =>
  value.replace(/[\t\n\r ]+/g, " ").trim();

const escapeMarkdownText = (value: string): string =>
  value.replace(/</g, "&lt;").replace(/>/g, "&gt;");

const normalizeMarkdown = (value: string): string =>
  value
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const asBlock = (value: string): string => {
  const normalized = normalizeMarkdown(value);

  return normalized.length === 0 ? "" : `\n\n${normalized}\n\n`;
};

const wrapInline = (marker: string, value: string): string => {
  const normalized = normalizeInline(value);

  return normalized.length === 0 ? "" : `${marker}${normalized}${marker}`;
};

type RenderContext = {
  readonly listDepth: number;
};

type CheerioApi = ReturnType<typeof cheerio.load>;

const renderNodes = (
  $: CheerioApi,
  nodes: readonly AnyNode[],
  context: RenderContext,
): string => nodes.map((node) => renderNode($, node, context)).join("");

const renderInlineNodes = (
  $: CheerioApi,
  nodes: readonly AnyNode[],
  context: RenderContext,
): string => normalizeInline(renderNodes($, nodes, context));

const renderList = (
  $: CheerioApi,
  element: Element,
  ordered: boolean,
  context: RenderContext,
): string => {
  let index = 1;
  const items = element.children.filter(
    (child): child is Element => isElement(child) && child.name.toLowerCase() === "li",
  );

  return items
    .map((item) => {
      const marker = ordered ? `${index++}.` : "-";
      return renderListItem($, item, marker, context);
    })
    .join("\n");
};

const renderOneCellTable = (
  $: CheerioApi,
  element: Element,
  context: RenderContext,
): string | undefined => {
  const table = $(element);

  if (table.find("table").length > 0) {
    return undefined;
  }

  const rows = table.find("tr").toArray();

  if (rows.length !== 1) {
    return undefined;
  }

  const row = rows[0];

  if (row === undefined) {
    return undefined;
  }

  const cells = $(row).children("td, th").toArray();
  const cell = cells[0];

  if (cells.length !== 1 || cell === undefined) {
    return undefined;
  }

  return asBlock(renderNodes($, cell.children, context));
};

const renderListItem = (
  $: CheerioApi,
  element: Element,
  marker: string,
  context: RenderContext,
): string => {
  const nestedLists: Element[] = [];
  const contentNodes = element.children.filter((child) => {
    if (
      isElement(child) &&
      (child.name.toLowerCase() === "ul" || child.name.toLowerCase() === "ol")
    ) {
      nestedLists.push(child);
      return false;
    }

    return true;
  });
  const indent = "  ".repeat(context.listDepth);
  const text = renderInlineNodes($, contentNodes, context);
  const head = text.length === 0 ? `${indent}${marker}` : `${indent}${marker} ${text}`;
  const nested = nestedLists
    .map((list) =>
      renderList($, list, list.name.toLowerCase() === "ol", {
        listDepth: context.listDepth + 1,
      }),
    )
    .filter((value) => value.length > 0);

  return nested.length === 0 ? head : `${head}\n${nested.join("\n")}`;
};

const renderNode = (
  $: CheerioApi,
  node: AnyNode,
  context: RenderContext,
): string => {
  if (node.type === "text") {
    return escapeMarkdownText(textData(node).replace(/[\t\n\r ]+/g, " "));
  }

  if (!isElement(node)) {
    return hasChildren(node) ? renderNodes($, node.children, context) : "";
  }

  const tagName = node.name.toLowerCase();
  const children = node.children;

  if (/^h[1-6]$/.test(tagName)) {
    const level = Number.parseInt(tagName.slice(1), 10);
    return asBlock(`${"#".repeat(level)} ${renderInlineNodes($, children, context)}`);
  }

  switch (tagName) {
    case "br":
      return "\n";
    case "table": {
      const oneCellTable = renderOneCellTable($, node, context);

      if (oneCellTable !== undefined) {
        return oneCellTable;
      }

      const tableHtml = $.html(node).trim();
      return tableHtml.length === 0 ? "" : `\n\n${tableHtml}\n\n`;
    }
    case "pre": {
      const code = $(node).text().replace(/\n+$/g, "");
      return code.length === 0 ? "" : `\n\n\`\`\`\n${code}\n\`\`\`\n\n`;
    }
    case "code": {
      const code = $(node).text().replace(/`/g, "\\`");
      return code.length === 0 ? "" : `\`${code}\``;
    }
    case "strong":
    case "b":
      return wrapInline("**", renderNodes($, children, context));
    case "em":
    case "i":
      return wrapInline("*", renderNodes($, children, context));
    case "a": {
      const text = renderInlineNodes($, children, context);
      const href = $(node).attr("href")?.trim();

      if (text.length === 0) {
        return "";
      }

      return href === undefined || href.length === 0 || href === text
        ? text
        : `[${text}](${href})`;
    }
    case "img":
      return $(node).attr("alt")?.trim() ?? "";
    case "ul":
    case "ol":
      return asBlock(renderList($, node, tagName === "ol", context));
    case "li":
      return renderListItem($, node, "-", context);
    case "script":
    case "style":
    case "link":
    case "meta":
    case "object":
    case "embed":
    case "iframe":
      return "";
    default: {
      const rendered = renderNodes($, children, context);
      return blockTags.has(tagName) ? asBlock(rendered) : rendered;
    }
  }
};

export const convertReportHtmlToMarkdown = (html: string): string => {
  const $ = cheerio.load(sanitizeReportHtml(html), null, false);
  const rendered = renderNodes($, $.root().contents().toArray(), { listDepth: 0 });

  return normalizeMarkdown(rendered);
};
