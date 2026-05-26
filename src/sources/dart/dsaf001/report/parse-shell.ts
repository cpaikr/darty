import * as cheerio from "cheerio";

import { ParseFailure, SourceChanged } from "../../errors.ts";
import { toParseFailureDiagnostics } from "../../http-diagnostics.ts";
import { dsaf001ReportMessages } from "./messages.ts";
import type {
  SourceReportDocument,
  SourceReportDocumentKind,
  SourceReportLocator,
  SourceReportSection,
  SourceReportShell,
} from "./source-model.ts";

const normalizeText = (value: string): string =>
  value.replace(/\s+/g, " ").trim();

const decodeJavaScriptString = (value: string): string => {
  try {
    return JSON.parse(`"${value.replace(/"/g, '\\"')}"`) as string;
  } catch {
    return value.replace(/\\"/g, '"').replace(/\\'/g, "'");
  }
};

const parseReceiptNumberFromUrl = (sourceUrl: string): string | undefined => {
  try {
    return new URL(sourceUrl).searchParams.get("rcpNo") ?? undefined;
  } catch {
    return undefined;
  }
};

const parseDocuments = ($: cheerio.CheerioAPI): readonly SourceReportDocument[] => {
  const documents: SourceReportDocument[] = [];

  const parseSelect = (selector: string, kind: SourceReportDocumentKind): void => {
    let index = 0;

    $(selector)
      .find("option")
      .each((_, option) => {
        const value = $(option).attr("value");

        if (value === undefined || value === "null" || value.trim() === "") {
          return;
        }

        index += 1;

        const titleAttribute = normalizeText($(option).attr("title") ?? "");
        const label = normalizeText($(option).text());
        const title = titleAttribute.length > 0 ? titleAttribute : label;
        const selected = $(option).is("[selected]");
        const id = `document:${kind}:${index}`;

        documents.push({
          id,
          title,
          kind,
          selected,
          query: value.replaceAll("&amp;", "&"),
        });
      });
  };

  parseSelect("#family", "body");
  parseSelect("#att", "attachment");

  return documents;
};

type MutableRawNode = {
  text?: string;
  rcpNo?: string;
  dcmNo?: string;
  eleId?: string;
  offset?: string;
  length?: string;
  dtd?: string;
  tocNo?: string;
  children: MutableRawNode[];
};

const toSourceSection = (
  rawNode: MutableRawNode,
  id: string,
): SourceReportSection | undefined => {
  if (
    rawNode.text === undefined ||
    rawNode.rcpNo === undefined ||
    rawNode.dcmNo === undefined ||
    rawNode.eleId === undefined ||
    rawNode.offset === undefined ||
    rawNode.length === undefined ||
    rawNode.dtd === undefined
  ) {
    return undefined;
  }

  const locator: SourceReportLocator =
    rawNode.tocNo === undefined
      ? {
          rcpNo: rawNode.rcpNo,
          dcmNo: rawNode.dcmNo,
          eleId: rawNode.eleId,
          offset: rawNode.offset,
          length: rawNode.length,
          dtd: rawNode.dtd,
        }
      : {
          rcpNo: rawNode.rcpNo,
          dcmNo: rawNode.dcmNo,
          eleId: rawNode.eleId,
          offset: rawNode.offset,
          length: rawNode.length,
          dtd: rawNode.dtd,
          tocNo: rawNode.tocNo,
        };

  return {
    id: `section:${id}`,
    title: rawNode.text,
    locator,
    children: rawNode.children.flatMap((child, childIndex) => {
      const section = toSourceSection(child, `${id}.${childIndex + 1}`);

      return section === undefined ? [] : [section];
    }),
  };
};

const parseTreeData = (html: string): readonly SourceReportSection[] => {
  const assignmentPattern =
    /node(\d+)\['([^']+)'\]\s*=\s*"((?:\\.|[^"])*)"/;
  const nodeCreatePattern = /var\s+(node\d+)\s*=\s*\{\s*\}/;
  const childPushPattern = /node(\d+)\['children'\]\.push\(node(\d+)\)/;
  const treePushPattern = /treeData\.push\(node(\d+)\)/;
  const rawNodes = new Map<string, MutableRawNode>();
  const roots: MutableRawNode[] = [];

  for (const line of html.split(/\r?\n/)) {
    const createMatch = nodeCreatePattern.exec(line);
    if (createMatch?.[1] !== undefined) {
      rawNodes.set(createMatch[1], { children: [] });
      continue;
    }

    const assignmentMatch = assignmentPattern.exec(line);
    if (
      assignmentMatch?.[1] !== undefined &&
      assignmentMatch[2] !== undefined &&
      assignmentMatch[3] !== undefined
    ) {
      const node = rawNodes.get(`node${assignmentMatch[1]}`);
      const key = assignmentMatch[2];

      if (node !== undefined) {
        const value = decodeJavaScriptString(assignmentMatch[3]);

        if (key === "text") node.text = value;
        else if (key === "rcpNo") node.rcpNo = value;
        else if (key === "dcmNo") node.dcmNo = value;
        else if (key === "eleId") node.eleId = value;
        else if (key === "offset") node.offset = value;
        else if (key === "length") node.length = value;
        else if (key === "dtd") node.dtd = value;
        else if (key === "tocNo") node.tocNo = value;
      }
      continue;
    }

    const childPushMatch = childPushPattern.exec(line);
    if (childPushMatch?.[1] !== undefined && childPushMatch[2] !== undefined) {
      const parent = rawNodes.get(`node${childPushMatch[1]}`);
      const child = rawNodes.get(`node${childPushMatch[2]}`);

      if (parent !== undefined && child !== undefined) {
        parent.children.push(child);
      }
      continue;
    }

    const treePushMatch = treePushPattern.exec(line);
    if (treePushMatch?.[1] !== undefined) {
      const root = rawNodes.get(`node${treePushMatch[1]}`);

      if (root !== undefined) {
        roots.push(root);
      }
    }
  }

  return roots.flatMap((root, rootIndex) => {
    const section = toSourceSection(root, `${rootIndex + 1}`);

    return section === undefined ? [] : [section];
  });
};

const parseInitialViewLocator = (html: string): SourceReportLocator | undefined => {
  const viewDocPattern =
    /viewDoc\(\s*"([^"]*)"\s*,\s*"([^"]*)"\s*,\s*"([^"]*)"\s*,\s*"([^"]*)"\s*,\s*"([^"]*)"\s*,\s*"([^"]*)"(?:\s*,\s*"([^"]*)")?\s*\)/g;
  let match: RegExpExecArray | null;

  while ((match = viewDocPattern.exec(html)) !== null) {
    if (
      match[1] !== undefined &&
      match[2] !== undefined &&
      match[3] !== undefined &&
      match[4] !== undefined &&
      match[5] !== undefined &&
      match[6] !== undefined
    ) {
      return match[7] === undefined
        ? {
            rcpNo: match[1],
            dcmNo: match[2],
            eleId: match[3],
            offset: match[4],
            length: match[5],
            dtd: match[6],
          }
        : {
            rcpNo: match[1],
            dcmNo: match[2],
            eleId: match[3],
            offset: match[4],
            length: match[5],
            dtd: match[6],
            tocNo: match[7],
          };
    }
  }

  return undefined;
};

export const parseReportShell = (
  html: string,
  sourceUrl: string,
): SourceReportShell => {
  const $ = cheerio.load(html);
  const documents = parseDocuments($);
  const selectedDocument = documents.find((document) => document.selected) ?? documents[0];
  const receiptNumber = parseReceiptNumberFromUrl(sourceUrl);

  if (receiptNumber === undefined || selectedDocument === undefined) {
    throw new SourceChanged({
      message: dsaf001ReportMessages.shellChanged,
      sourceUrl,
    });
  }

  try {
    return {
      receiptNumber,
      sourceUrl,
      documents,
      selectedDocument,
      toc: parseTreeData(html),
      initialViewLocator: parseInitialViewLocator(html),
    };
  } catch (error) {
    throw new ParseFailure({
      message: dsaf001ReportMessages.htmlDecodeFailure,
      sourceUrl,
      diagnostics: toParseFailureDiagnostics({
        reason: dsaf001ReportMessages.htmlDecodeFailure,
        responseText: html,
        cause: error,
      }),
    });
  }
};
