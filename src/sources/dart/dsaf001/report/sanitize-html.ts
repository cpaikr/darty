import * as cheerio from "cheerio";
import { isTag, type AnyNode } from "domhandler";

const emptyAllowedAttributes = new Set<string>();

const allowedAttributesByTag = new Map<string, ReadonlySet<string>>([
  ["a", new Set(["href"])],
  ["img", new Set(["alt", "src"])],
  ["td", new Set(["colspan", "rowspan"])],
  ["th", new Set(["colspan", "rowspan", "scope"])],
  ["ol", new Set(["start"])],
]);

const allowedAttributesFor = (tagName: string): ReadonlySet<string> =>
  allowedAttributesByTag.get(tagName) ?? emptyAllowedAttributes;

const textData = (node: AnyNode): string =>
  "data" in node && typeof node.data === "string" ? node.data : "";

const hasChildren = (
  node: AnyNode,
): node is AnyNode & { readonly children: readonly AnyNode[] } =>
  "children" in node && Array.isArray(node.children);

const normalizeNonBreakingSpaces = (nodes: readonly AnyNode[]): void => {
  for (const node of nodes) {
    if (node.type === "text" && "data" in node && typeof node.data === "string") {
      node.data = node.data.replace(/[ \t]*\u00a0+[ \t]*/g, " ");
    }

    if (hasChildren(node)) {
      normalizeNonBreakingSpaces(node.children);
    }
  }
};

const stripPresentationAttributes = ($: cheerio.CheerioAPI): void => {
  $("*").each((_, element) => {
    if (!isTag(element)) {
      return;
    }

    const allowedAttributes = allowedAttributesFor(element.name.toLowerCase());

    for (const attributeName of Object.keys(element.attribs)) {
      if (!allowedAttributes.has(attributeName.toLowerCase())) {
        $(element).removeAttr(attributeName);
      }
    }
  });
};

const unwrapElement = ($: cheerio.CheerioAPI, element: AnyNode): void => {
  $(element).replaceWith($(element).contents().toArray());
};

const unwrapPresentationOnlyInlineElements = ($: cheerio.CheerioAPI): void => {
  $("span, font").each((_, element) => {
    if (isTag(element) && Object.keys(element.attribs).length === 0) {
      unwrapElement($, element);
    }
  });

  $("a").each((_, element) => {
    const href = $(element).attr("href")?.trim();

    if (href === undefined || href.length === 0) {
      unwrapElement($, element);
    }
  });
};

const removeTrailingBreaksInTableCells = ($: cheerio.CheerioAPI): void => {
  $("td, th").each((_, cell) => {
    for (let index = cell.children.length - 1; index >= 0; index--) {
      const child = cell.children[index];

      if (child === undefined) {
        continue;
      }

      if (child.type === "text" && textData(child).trim().length === 0) {
        $(child).remove();
        continue;
      }

      if (isTag(child) && child.name.toLowerCase() === "br") {
        $(child).remove();
        continue;
      }

      break;
    }
  });
};

export const sanitizeReportHtml = (html: string): string => {
  const $ = cheerio.load(html, null, false);

  $("colgroup, col").remove();
  normalizeNonBreakingSpaces($.root().contents().toArray());
  stripPresentationAttributes($);
  removeTrailingBreaksInTableCells($);
  unwrapPresentationOnlyInlineElements($);

  return $.root().html() ?? "";
};
