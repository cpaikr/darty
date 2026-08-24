import * as cheerio from "cheerio";

import { ParseFailure, SourceChanged } from "../../errors.ts";
import { toParseFailureDiagnostics } from "../../http-diagnostics.ts";
import {
  getSourceResponseErrorContext,
  type DartSourceTextResponse,
} from "../../source-response.ts";
import { dsaf001ReportMessages } from "./messages.ts";
import { parseReportQueryIdentity } from "./query-identity.ts";
import type {
  SourceReportDocument,
  SourceReportDocumentKind,
  SourceReportLocator,
  SourceReportSection,
  SourceReportShell,
} from "./source-model.ts";

const normalizeText = (value: string): string =>
  value.replace(/\s+/g, " ").trim();

type JavaScriptToken =
  | { readonly kind: "identifier"; readonly value: string }
  | { readonly kind: "string"; readonly value: string }
  | { readonly kind: "number"; readonly value: string }
  | { readonly kind: "regex"; readonly value: string }
  | { readonly kind: "punctuation"; readonly value: string };

const isIdentifierStart = (value: string): boolean => /[A-Za-z_$]/.test(value);
const isIdentifierPart = (value: string): boolean => /[A-Za-z0-9_$]/.test(value);
const twoHexDigits = /^[0-9A-Fa-f]{2}$/;
const fourHexDigits = /^[0-9A-Fa-f]{4}$/;

const regexAfterKeywords = new Set([
  "case",
  "delete",
  "do",
  "else",
  "in",
  "instanceof",
  "new",
  "of",
  "return",
  "throw",
  "typeof",
  "void",
  "yield",
]);

const controlParenKeywords = new Set([
  "catch",
  "for",
  "if",
  "switch",
  "while",
  "with",
]);

const canStartRegexLiteral = (token: JavaScriptToken | undefined): boolean => {
  if (token === undefined) {
    return true;
  }

  if (token.kind === "identifier") {
    return regexAfterKeywords.has(token.value);
  }

  if (token.kind !== "punctuation") {
    return false;
  }

  return "([{=,:;!?~+-*%&|^<>".includes(token.value);
};

/**
 * Read the small JavaScript subset used by the DART viewer shell.
 *
 * This is deliberately a lexer, rather than a collection of regular
 * expressions. Viewer scripts are often minified, and regexes otherwise
 * mistake commented-out examples or text in a JavaScript string for live
 * viewer statements.
 */
const tokenizeJavaScript = (source: string): readonly JavaScriptToken[] => {
  const tokens: JavaScriptToken[] = [];
  let index = 0;
  let lastToken: JavaScriptToken | undefined;
  const parenthesisStack: boolean[] = [];
  let canStartRegexAfterControlParen = false;

  const appendToken = (
    token: JavaScriptToken,
    options: { readonly closesControlParen?: boolean } = {},
  ): void => {
    tokens.push(token);
    lastToken = token;
    canStartRegexAfterControlParen = options.closesControlParen === true;
  };

  const skipRegexLiteral = (): boolean => {
    let cursor = index + 1;
    let inCharacterClass = false;
    let escaped = false;

    while (cursor < source.length) {
      const character = source[cursor];

      if (character === undefined || character === "\n" || character === "\r") {
        index = cursor;
        return false;
      }

      if (escaped) {
        escaped = false;
        cursor += 1;
        continue;
      }

      if (character === "\\") {
        escaped = true;
        cursor += 1;
        continue;
      }

      if (character === "[") {
        inCharacterClass = true;
        cursor += 1;
        continue;
      }

      if (character === "]") {
        inCharacterClass = false;
        cursor += 1;
        continue;
      }

      if (character === "/" && !inCharacterClass) {
        cursor += 1;

        while (cursor < source.length && isIdentifierPart(source[cursor] ?? "")) {
          cursor += 1;
        }

        index = cursor;
        lastToken = { kind: "regex", value: "" };
        canStartRegexAfterControlParen = false;
        return true;
      }

      cursor += 1;
    }

    index = cursor;
    return false;
  };

  const appendString = (quote: string): void => {
    index += 1;
    let value = "";

    while (index < source.length) {
      const character = source[index];

      if (character === quote) {
        index += 1;
        appendToken({ kind: "string", value });
        return;
      }

      if (character !== "\\") {
        value += character ?? "";
        index += 1;
        continue;
      }

      index += 1;
      const escaped = source[index];

      if (escaped === undefined) {
        value += "\\";
        return;
      }

      const escapeMap: Record<string, string> = {
        "0": "\0",
        b: "\b",
        f: "\f",
        n: "\n",
        r: "\r",
        t: "\t",
        v: "\v",
        "\\": "\\",
        "'": "'",
        '"': '"',
        "`": "`",
      };
      const mapped = escapeMap[escaped];

      if (mapped !== undefined) {
        value += mapped;
        index += 1;
        continue;
      }

      if (escaped === "x" || escaped === "u") {
        const digits = escaped === "x" ? 2 : 4;
        const hexadecimal = source.slice(index + 1, index + 1 + digits);

        if ((digits === 2 ? twoHexDigits : fourHexDigits).test(hexadecimal)) {
          value += String.fromCodePoint(Number.parseInt(hexadecimal, 16));
          index += digits + 1;
          continue;
        }
      }

      // JavaScript line continuations do not contribute a character to the
      // value. For unknown escapes, retaining the escaped character is both
      // useful for DART's legacy strings and safer than dropping it.
      if (escaped === "\n") {
        index += 1;
        continue;
      }

      if (escaped === "\r") {
        index += source[index + 1] === "\n" ? 2 : 1;
        continue;
      }

      value += escaped;
      index += 1;
    }

    // Unterminated strings are intentionally not emitted. A partial token
    // must not make a broken script look like a valid viewer declaration.
  };

  while (index < source.length) {
    const character = source[index];

    if (character === undefined) {
      break;
    }

    if (/\s/.test(character)) {
      index += 1;
      continue;
    }

    if (character === "/" && source[index + 1] === "/") {
      index += 2;

      while (index < source.length && source[index] !== "\n" && source[index] !== "\r") {
        index += 1;
      }

      continue;
    }

    if (character === "/" && source[index + 1] === "*") {
      const end = source.indexOf("*/", index + 2);
      index = end < 0 ? source.length : end + 2;
      continue;
    }

    // A slash in an expression can begin a regular-expression literal. Skip
    // its escaped slashes and character classes so fake viewer calls inside
    // regex text cannot become parser input. Keep division tokenized by using
    // the preceding-token context as a small, conservative JS heuristic.
    if (
      character === "/" &&
      (canStartRegexLiteral(lastToken) || canStartRegexAfterControlParen)
    ) {
      skipRegexLiteral();
      continue;
    }

    // Legacy script blocks sometimes wrap JavaScript in HTML comments. Treat
    // those markers as comments too, so old examples cannot become live
    // viewer statements during tokenization.
    if (source.startsWith("<!--", index)) {
      index += 4;

      while (index < source.length && source[index] !== "\n" && source[index] !== "\r") {
        index += 1;
      }

      continue;
    }

    if (source.startsWith("-->", index)) {
      index += 3;
      continue;
    }

    if (character === "'" || character === '"' || character === "`") {
      appendString(character);
      continue;
    }

    if (isIdentifierStart(character)) {
      const start = index;
      index += 1;

      while (index < source.length && isIdentifierPart(source[index] ?? "")) {
        index += 1;
      }

      appendToken({ kind: "identifier", value: source.slice(start, index) });
      continue;
    }

    if (/[0-9]/.test(character)) {
      const start = index;
      index += 1;

      while (index < source.length && /[0-9A-Za-z._]/.test(source[index] ?? "")) {
        index += 1;
      }

      appendToken({ kind: "number", value: source.slice(start, index) });
      continue;
    }

    if (character === "(") {
      const previousToken = tokens[tokens.length - 2];
      parenthesisStack.push(
        lastToken?.kind === "identifier" &&
          controlParenKeywords.has(lastToken.value) &&
          !(
            previousToken?.kind === "punctuation" &&
            previousToken.value === "."
          ),
      );
      appendToken({ kind: "punctuation", value: character });
    } else if (character === ")") {
      appendToken(
        { kind: "punctuation", value: character },
        { closesControlParen: parenthesisStack.pop() === true },
      );
    } else {
      appendToken({ kind: "punctuation", value: character });
    }
    index += 1;
  }

  return tokens;
};

const isToken = (
  token: JavaScriptToken | undefined,
  kind: JavaScriptToken["kind"],
  value: string,
): boolean => token?.kind === kind && token.value === value;

const isIdentifier = (
  token: JavaScriptToken | undefined,
  value?: string,
): token is Extract<JavaScriptToken, { readonly kind: "identifier" }> =>
  token?.kind === "identifier" && (value === undefined || token.value === value);

const nodeNamePattern = /^node\d+$/;

type RawNode = {
  declared: boolean;
  invalidChildren: boolean;
  readonly fields: Partial<
    Record<"text" | "rcpNo" | "dcmNo" | "eleId" | "offset" | "length" | "dtd" | "tocNo", string>
  >;
  readonly children: string[];
};

type ParsedTreeData = {
  readonly declared: boolean;
  readonly malformedDeclaration: boolean;
  readonly malformedGraphStatement: boolean;
  readonly rootNames: readonly string[];
  readonly nodes: ReadonlyMap<string, RawNode>;
};

const ensureRawNode = (nodes: Map<string, RawNode>, name: string): RawNode => {
  const existing = nodes.get(name);

  if (existing !== undefined) {
    return existing;
  }

  const node: RawNode = {
    declared: false,
    invalidChildren: false,
    fields: {},
    children: [],
  };
  nodes.set(name, node);
  return node;
};

const isEmptyArray = (tokens: readonly JavaScriptToken[], start: number): boolean =>
  isToken(tokens[start], "punctuation", "[") &&
  isToken(tokens[start + 1], "punctuation", "]");

const isEmptyObject = (tokens: readonly JavaScriptToken[], start: number): boolean =>
  isToken(tokens[start], "punctuation", "{") &&
  isToken(tokens[start + 1], "punctuation", "}");

const parseTreeData = (tokens: readonly JavaScriptToken[]): ParsedTreeData => {
  const nodes = new Map<string, RawNode>();
  const rootNames: string[] = [];
  let declared = false;
  let malformedDeclaration = false;
  let malformedGraphStatement = false;

  const propertyNameAt = (
    start: number,
  ): { readonly key: string; readonly end: number } | undefined => {
    if (
      isToken(tokens[start], "punctuation", "[") &&
      tokens[start + 1]?.kind === "string" &&
      isToken(tokens[start + 2], "punctuation", "]")
    ) {
      return { key: tokens[start + 1]?.value ?? "", end: start + 3 };
    }

    const dotProperty = tokens[start + 1];

    if (isToken(tokens[start], "punctuation", ".") && isIdentifier(dotProperty)) {
      return { key: dotProperty.value, end: start + 2 };
    }

    return undefined;
  };

  const nodeNameAt = (token: JavaScriptToken | undefined): string | undefined =>
    isIdentifier(token) && nodeNamePattern.test(token.value) ? token.value : undefined;

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];

    // `var treeData = []` and `treeData = []` are the only initialized TOC
    // forms observed in the viewer. A declaration of another shape is a
    // recognized-but-unusable shell, not a genuine empty TOC.
    if (isIdentifier(token, "treeData")) {
      const afterName = index + 1;

      if (isToken(tokens[afterName], "punctuation", "=")) {
        declared = true;
        if (!isEmptyArray(tokens, afterName + 1)) {
          malformedDeclaration = true;
        }
      }

      const property = propertyNameAt(afterName);

      if (property?.key === "push" && isToken(tokens[property.end], "punctuation", "(")) {
        if (
          nodeNameAt(tokens[property.end + 1]) !== undefined &&
          isToken(tokens[property.end + 2], "punctuation", ")")
        ) {
          rootNames.push(nodeNameAt(tokens[property.end + 1]) as string);
        } else {
          malformedGraphStatement = true;
        }
      }

      continue;
    }

    if (isIdentifier(token, "var") || isIdentifier(token, "let") || isIdentifier(token, "const")) {
      const name = nodeNameAt(tokens[index + 1]);

      if (name !== undefined && isToken(tokens[index + 2], "punctuation", "=")) {
        const node = ensureRawNode(nodes, name);

        if (isEmptyObject(tokens, index + 3)) {
          node.declared = true;
        }
      }

      if (isIdentifier(tokens[index + 1], "treeData")) {
        const initializer = tokens[index + 2];

        if (isToken(initializer, "punctuation", "=")) {
          declared = true;

          if (!isEmptyArray(tokens, index + 3)) {
            malformedDeclaration = true;
          }
        }
      }

      continue;
    }

    const nodeName = nodeNameAt(token);

    if (nodeName !== undefined) {
      const property = propertyNameAt(index + 1);

      if (property === undefined) {
        continue;
      }

      if (
        property.key === "children" &&
        isToken(tokens[property.end], "punctuation", ".") &&
        isIdentifier(tokens[property.end + 1], "push") &&
        isToken(tokens[property.end + 2], "punctuation", "(")
      ) {
        const node = ensureRawNode(nodes, nodeName);

        if (
          nodeNameAt(tokens[property.end + 3]) !== undefined &&
          isToken(tokens[property.end + 4], "punctuation", ")")
        ) {
          node.children.push(nodeNameAt(tokens[property.end + 3]) as string);
        } else {
          node.invalidChildren = true;
        }

        continue;
      }

      if (
        property.key === "children" &&
        isToken(tokens[property.end], "punctuation", "=")
      ) {
        const node = ensureRawNode(nodes, nodeName);

        if (!isEmptyArray(tokens, property.end + 1)) {
          node.invalidChildren = true;
        }

        continue;
      }

      if (
        isToken(tokens[property.end], "punctuation", "=") &&
        tokens[property.end + 1]?.kind === "string"
      ) {
        ensureRawNode(nodes, nodeName).fields[property.key as keyof RawNode["fields"]] =
          tokens[property.end + 1]?.value ?? "";
      }
    }
  }

  return {
    declared,
    malformedDeclaration,
    malformedGraphStatement,
    rootNames,
    nodes,
  };
};

type RequestedDocumentIdentity = {
  readonly receiptNumber: string;
  readonly dcmNo: string | undefined;
};

const parseUrlIdentity = (sourceUrl: string): RequestedDocumentIdentity | undefined => {
  try {
    const url = new URL(sourceUrl);
    const receiptNumber = url.searchParams.get("rcpNo")?.trim();

    if (receiptNumber === undefined || receiptNumber.length === 0) {
      return undefined;
    }

    const dcmNo = url.searchParams.get("dcmNo")?.trim();

    return {
      receiptNumber,
      dcmNo: dcmNo === undefined || dcmNo.length === 0 ? undefined : dcmNo,
    };
  } catch {
    return undefined;
  }
};

const parseDocuments = (
  $: cheerio.CheerioAPI,
  identity: RequestedDocumentIdentity,
): readonly SourceReportDocument[] => {
  const documents: SourceReportDocument[] = [];

  const parseSelect = (selector: string, kind: SourceReportDocumentKind): void => {
    let index = 0;

    $(selector)
      .find("option")
      .each((_, option) => {
        const rawValue = $(option).attr("value");

        if (
          rawValue === undefined ||
          rawValue.trim() === "" ||
          rawValue.trim().toLowerCase() === "null"
        ) {
          return;
        }

        const query = rawValue.replaceAll("&amp;", "&");
        const queryIdentity = parseReportQueryIdentity(query);

        // A selector option is a replay token. Never expose a token for a
        // different receipt, even when it happens to be displayed in the
        // current shell's HTML.
        if (queryIdentity?.receiptNumber !== identity.receiptNumber) {
          return;
        }

        index += 1;
        const titleAttribute = normalizeText($(option).attr("title") ?? "");
        const label = normalizeText($(option).text());
        const title = titleAttribute.length > 0 ? titleAttribute : label;

        documents.push({
          id: `document:${kind}:${index}`,
          title,
          kind,
          selected: $(option).is("[selected]"),
          query,
        });
      });
  };

  parseSelect("#family", "body");
  parseSelect("#att", "attachment");

  return documents;
};

const documentQueryIdentity = (
  document: SourceReportDocument,
): { readonly receiptNumber: string; readonly dcmNo: string | undefined } | undefined =>
  parseReportQueryIdentity(document.query);

const selectDocument = (
  documents: readonly SourceReportDocument[],
  identity: RequestedDocumentIdentity,
): SourceReportDocument | undefined => {
  const matchingDocument = (document: SourceReportDocument): boolean => {
    const documentIdentity = documentQueryIdentity(document);

    return (
      documentIdentity?.receiptNumber === identity.receiptNumber &&
      (identity.dcmNo === undefined || documentIdentity.dcmNo === identity.dcmNo)
    );
  };

  return (
    documents.find((document) => document.selected && matchingDocument(document)) ??
    documents.find(matchingDocument)
  );
};

const locatorMatchesIdentity = (
  locator: SourceReportLocator,
  identity: RequestedDocumentIdentity,
  expectedDcmNo: string | undefined,
): boolean => {
  if (locator.rcpNo !== identity.receiptNumber) {
    return false;
  }

  return expectedDcmNo === undefined || locator.dcmNo === expectedDcmNo;
};

const rawNodeLocator = (rawNode: RawNode): SourceReportLocator | undefined => {
  const { rcpNo, dcmNo, eleId, offset, length, dtd, tocNo } = rawNode.fields;

  if (
    rcpNo === undefined ||
    dcmNo === undefined ||
    eleId === undefined ||
    offset === undefined ||
    length === undefined ||
    dtd === undefined
  ) {
    return undefined;
  }

  return {
    rcpNo,
    dcmNo,
    eleId,
    offset,
    length,
    dtd,
    ...(tocNo === undefined ? {} : { tocNo }),
  };
};

const validateTreeGraph = (
  tree: ParsedTreeData,
  identity: RequestedDocumentIdentity,
  expectedDcmNo: string | undefined,
): boolean => {
  // `treeData=[]` with no node declarations is the only observed no-TOC
  // shape. A shell containing orphan nodes must not silently downgrade to a
  // document fetch with an unknown locator.
  if (tree.rootNames.length === 0) {
    return tree.nodes.size === 0;
  }

  if (new Set(tree.rootNames).size !== tree.rootNames.length) {
    return false;
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();

  const visit = (nodeName: string): boolean => {
    if (visiting.has(nodeName) || visited.has(nodeName)) {
      return false;
    }

    const rawNode = tree.nodes.get(nodeName);
    const locator = rawNode === undefined ? undefined : rawNodeLocator(rawNode);

    if (
      rawNode === undefined ||
      !rawNode.declared ||
      rawNode.invalidChildren ||
      locator === undefined ||
      !locatorMatchesIdentity(locator, identity, expectedDcmNo) ||
      new Set(rawNode.children).size !== rawNode.children.length
    ) {
      return false;
    }

    visiting.add(nodeName);

    for (const childName of rawNode.children) {
      if (!visit(childName)) {
        return false;
      }
    }

    visiting.delete(nodeName);
    visited.add(nodeName);
    return true;
  };

  for (const rootName of tree.rootNames) {
    if (!visit(rootName)) {
      return false;
    }
  }

  return visited.size === tree.nodes.size;
};

const buildSection = (
  nodeName: string,
  nodes: ReadonlyMap<string, RawNode>,
  identity: RequestedDocumentIdentity,
  expectedDcmNo: string | undefined,
  id: string,
  ancestors: ReadonlySet<string>,
): SourceReportSection | undefined => {
  const rawNode = nodes.get(nodeName);

  if (rawNode === undefined || !rawNode.declared || ancestors.has(nodeName)) {
    return undefined;
  }

  const { text } = rawNode.fields;
  const locator = rawNodeLocator(rawNode);

  if (text === undefined || locator === undefined) {
    return undefined;
  }

  if (!locatorMatchesIdentity(locator, identity, expectedDcmNo)) {
    return undefined;
  }

  const nextAncestors = new Set(ancestors);
  nextAncestors.add(nodeName);

  return {
    id: `section:${id}`,
    title: text,
    locator,
    children: rawNode.children.flatMap((childName, childIndex) => {
      const child = buildSection(
        childName,
        nodes,
        identity,
        expectedDcmNo,
        `${id}.${childIndex + 1}`,
        nextAncestors,
      );

      return child === undefined ? [] : [child];
    }),
  };
};

type ParsedViewDoc = {
  readonly locator: SourceReportLocator;
};

const parseViewDocCalls = (tokens: readonly JavaScriptToken[]): readonly ParsedViewDoc[] => {
  const locators: ParsedViewDoc[] = [];

  for (let index = 0; index < tokens.length; index += 1) {
    if (!isIdentifier(tokens[index], "viewDoc") || isToken(tokens[index - 1], "punctuation", ".")) {
      continue;
    }

    if (!isToken(tokens[index + 1], "punctuation", "(")) {
      continue;
    }

    const values: string[] = [];
    let cursor = index + 2;
    let valid = true;

    while (cursor < tokens.length && !isToken(tokens[cursor], "punctuation", ")")) {
      const token = tokens[cursor];

      if (token?.kind !== "string") {
        valid = false;
        break;
      }

      values.push(token.value);
      cursor += 1;

      if (isToken(tokens[cursor], "punctuation", ")")) {
        break;
      }

      if (!isToken(tokens[cursor], "punctuation", ",")) {
        valid = false;
        break;
      }

      cursor += 1;
    }

    if (
      !isToken(tokens[cursor], "punctuation", ")") ||
      !valid ||
      (values.length !== 6 && values.length !== 7)
    ) {
      continue;
    }

    const [rcpNo, dcmNo, eleId, offset, length, dtd, tocNo] = values;

    if (
      rcpNo === undefined ||
      dcmNo === undefined ||
      eleId === undefined ||
      offset === undefined ||
      length === undefined ||
      dtd === undefined
    ) {
      continue;
    }

    locators.push({
      locator: {
        rcpNo,
        dcmNo,
        eleId,
        offset,
        length,
        dtd,
        ...(tocNo === undefined ? {} : { tocNo }),
      },
    });
  }

  return locators;
};

const scriptSource = ($: cheerio.CheerioAPI): string =>
  $("script")
    .toArray()
    .map((script) => $(script).html() ?? "")
    .join("\n");

const throwShellChanged = (response: DartSourceTextResponse): never => {
  throw new SourceChanged({
    message: dsaf001ReportMessages.shellChanged,
    ...getSourceResponseErrorContext(response),
  });
};

export const parseReportShell = (
  response: DartSourceTextResponse,
): SourceReportShell => {
  const html = response.body;
  const sourceUrl = response.sourceUrl;
  const $ = cheerio.load(html);
  const identity = parseUrlIdentity(sourceUrl);

  if (identity === undefined) {
    return throwShellChanged(response);
  }

  try {
    const documents = parseDocuments($, identity);
    const selectedDocument = selectDocument(documents, identity);

    if (selectedDocument === undefined) {
      return throwShellChanged(response);
    }

    const scripts = scriptSource($);
    const tokens = tokenizeJavaScript(scripts);
    const tree = parseTreeData(tokens);
    const viewDocLocators = parseViewDocCalls(tokens).map((entry) => entry.locator);
    const selectedDocumentDcmNo = documentQueryIdentity(selectedDocument)?.dcmNo;
    const receiptViewDocDcmNos = new Set(
      viewDocLocators
        .filter((locator) => locator.rcpNo === identity.receiptNumber)
        .map((locator) => locator.dcmNo)
        .filter((dcmNo) => dcmNo.length > 0),
    );
    const treeDcmNos = new Set(
      [...tree.nodes.values()]
        .map((node) => node.fields.dcmNo)
        .filter((dcmNo): dcmNo is string => dcmNo !== undefined && dcmNo.length > 0),
    );

    // A bare receipt URL does not identify an attachment. Use the selected
    // document's query, then the shell's initial locator, to bind every TOC
    // locator to one document. Mixed document numbers are unsafe even when
    // one of them happens to be reachable from a root.
    if (receiptViewDocDcmNos.size > 1 || treeDcmNos.size > 1) {
      return throwShellChanged(response);
    }

    const knownDcmNos = [
      identity.dcmNo,
      selectedDocumentDcmNo,
      ...receiptViewDocDcmNos,
      ...treeDcmNos,
    ].filter((dcmNo): dcmNo is string => dcmNo !== undefined);
    const distinctKnownDcmNos = new Set(knownDcmNos);

    if (distinctKnownDcmNos.size > 1) {
      return throwShellChanged(response);
    }

    const expectedDcmNo = [...distinctKnownDcmNos][0];

    if (
      !tree.declared ||
      tree.malformedDeclaration ||
      tree.malformedGraphStatement ||
      !validateTreeGraph(tree, identity, expectedDcmNo)
    ) {
      return throwShellChanged(response);
    }

    const roots = tree.rootNames.flatMap((rootName, rootIndex) => {
      const section = buildSection(
        rootName,
        tree.nodes,
        identity,
        expectedDcmNo,
        `${rootIndex + 1}`,
        new Set(),
      );

      return section === undefined ? [] : [section];
    });

    if (roots.length !== tree.rootNames.length) {
      return throwShellChanged(response);
    }

    const initialViewLocator = viewDocLocators.find((locator) =>
      locatorMatchesIdentity(locator, identity, expectedDcmNo),
    );

    if (roots.length === 0 && viewDocLocators.length > 0 && initialViewLocator === undefined) {
      return throwShellChanged(response);
    }

    return {
      receiptNumber: identity.receiptNumber,
      sourceUrl,
      documents,
      selectedDocument,
      toc: roots,
      initialViewLocator,
    };
  } catch (error) {
    if (error instanceof SourceChanged) {
      throw error;
    }

    throw new ParseFailure({
      message: dsaf001ReportMessages.htmlDecodeFailure,
      sourceUrl,
      diagnostics: toParseFailureDiagnostics({
        reason: dsaf001ReportMessages.htmlDecodeFailure,
        response,
        cause: error,
      }),
    });
  }
};
