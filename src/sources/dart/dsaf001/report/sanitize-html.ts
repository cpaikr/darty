import * as cheerio from "cheerio";
import { isTag, type AnyNode } from "domhandler";
import sanitizeHtml from "sanitize-html";

const disallowedNonTextTags = [
  "script",
  "style",
  "textarea",
  "option",
  "iframe",
  "object",
  "embed",
  "noscript",
];

// Keep this policy project-owned instead of inheriting sanitize-html defaults at runtime.
// This is intentionally a broad safe-tag snapshot, not a DART-minimal corpus-derived list:
// preserving unusual filing markup is preferable to stripping content just because we have
// not seen a tag yet. When upgrading sanitize-html, compare its default allowedTags for
// newly added safe tags or changed parser behavior, then consciously update this list if
// DART reports need it.
const allowedTags = [
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
];

const allowedAttributes = {
  a: ["href"],
  img: ["alt", "src"],
  td: ["colspan", "rowspan"],
  th: ["colspan", "rowspan", "scope"],
  ol: ["start"],
} satisfies import("sanitize-html").IOptions["allowedAttributes"];

const allowedLinkSchemes = ["http", "https", "ftp", "mailto", "tel"];
const allowedImageSchemes = ["http", "https"];

export type ReportHtmlSanitizationOptions = {
  readonly baseUrl?: string;
};

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

const toAbsoluteUrl = (url: string, baseUrl: string | undefined): string => {
  if (baseUrl === undefined || url.startsWith("//")) {
    return url;
  }

  try {
    return new URL(url, baseUrl).toString();
  } catch {
    return url;
  }
};

const absolutizeAttribute = (
  attributes: import("sanitize-html").Attributes,
  attributeName: "href" | "src",
  baseUrl: string | undefined,
): import("sanitize-html").Attributes => {
  const value = attributes[attributeName]?.trim();

  if (value === undefined || value.length === 0) {
    return attributes;
  }

  return {
    ...attributes,
    [attributeName]: toAbsoluteUrl(value, baseUrl),
  };
};

const extractDocumentBodyHtml = (html: string): string => {
  const $ = cheerio.load(html);
  const body = $("body").first();

  return body.length > 0 ? body.html() ?? "" : html;
};

const sanitizeDangerousHtml = (
  html: string,
  options: ReportHtmlSanitizationOptions,
): string =>
  sanitizeHtml(html, {
    allowedTags,
    allowedAttributes,
    allowedSchemes: allowedLinkSchemes,
    allowedSchemesByTag: {
      img: allowedImageSchemes,
    },
    allowedSchemesAppliedToAttributes: ["href", "src"],
    allowProtocolRelative: false,
    disallowedTagsMode: "discard",
    nonTextTags: disallowedNonTextTags,
    transformTags: {
      a: (tagName, attributes) => ({
        tagName,
        attribs: absolutizeAttribute(attributes, "href", options.baseUrl),
      }),
      img: (tagName, attributes) => ({
        tagName,
        attribs: absolutizeAttribute(attributes, "src", options.baseUrl),
      }),
    },
  });

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

export const sanitizeReportHtml = (
  html: string,
  options: ReportHtmlSanitizationOptions = {},
): string => {
  const $ = cheerio.load(sanitizeDangerousHtml(html, options), null, false);

  normalizeNonBreakingSpaces($.root().contents().toArray());
  removeTrailingBreaksInTableCells($);
  unwrapPresentationOnlyInlineElements($);

  return $.root().html() ?? "";
};

export const sanitizeFetchedReportHtml = (
  html: string,
  options: ReportHtmlSanitizationOptions = {},
): string => sanitizeReportHtml(extractDocumentBodyHtml(html), options);
