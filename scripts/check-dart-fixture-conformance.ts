#!/usr/bin/env bun

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { deepStrictEqual, strictEqual } from "node:assert";

import { Effect, Schema } from "effect";

import { buildCompanySearchForm } from "../src/sources/dart/dsae001/company/build-form.ts";
import { parseCompanySearchHtml } from "../src/sources/dart/dsae001/company/parse-html.ts";
import { SourceCompanyReplayInput } from "../src/sources/dart/dsae001/company/replay-schema.ts";
import { buildCompanyReportsSearchForm } from "../src/sources/dart/dsab007/company-reports/build-form.ts";
import { parseCompanyReportsSearchHtml } from "../src/sources/dart/dsab007/company-reports/parse-html.ts";
import { SourceCompanyReportsReplayInput } from "../src/sources/dart/dsab007/company-reports/replay-schema.ts";
import { parseReportShell } from "../src/sources/dart/dsaf001/report/parse-shell.ts";
import { createDartSourceTextResponse } from "../src/sources/dart/source-response.ts";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const fixtureRoot = resolve(repoRoot, "fixtures/dart/vertical-v1");
const manifest = JSON.parse(
  await readFile(resolve(fixtureRoot, "manifest.json"), "utf8"),
) as { cases: Array<Record<string, any>> };
const cases = new Map(manifest.cases.map((fixtureCase) => [fixtureCase.id, fixtureCase]));

const resolvedRequests = new Map<string, Record<string, any>>();
const resolveRequest = (
  fixtureCase: Record<string, any>,
  stack: string[] = [],
): Record<string, any> => {
  const cached = resolvedRequests.get(fixtureCase.id);
  if (cached !== undefined) return cached;
  const rawRequest = fixtureCase.request;
  if (rawRequest === undefined) throw new Error(`${fixtureCase.id} has no request`);
  if (rawRequest.matchRequestFrom === undefined) {
    const request = structuredClone(rawRequest);
    resolvedRequests.set(fixtureCase.id, request);
    return request;
  }
  if (stack.includes(fixtureCase.id)) {
    throw new Error(`fixture inheritance cycle at ${fixtureCase.id}`);
  }
  const base = cases.get(rawRequest.matchRequestFrom);
  if (base === undefined) throw new Error(`${fixtureCase.id} has no base request`);
  const request = structuredClone(
    resolveRequest(base, [...stack, fixtureCase.id]),
  );
  request.form = { ...request.form, ...rawRequest.formOverrides };
  request.query = { ...request.query, ...rawRequest.queryOverrides };
  resolvedRequests.set(fixtureCase.id, request);
  return request;
};

const classify = (error: unknown): string => {
  const tag = (error as { _tag?: string })._tag;
  if (tag === "SourceChanged") return "source_changed";
  if (tag === "ParseFailure") return "source_parse_failure";
  throw error;
};

const stringField = (form: Record<string, any>, field: string): string => {
  const value = form[field];
  if (typeof value !== "string") {
    throw new Error(`${field} must be a string in the fixture manifest`);
  }
  return value;
};

const integerField = (form: Record<string, any>, field: string): number => {
  const value = form[field];
  const parsed = typeof value === "number"
    ? value
    : typeof value === "string" && /^\d+$/.test(value)
      ? Number(value)
      : Number.NaN;
  if (!Number.isSafeInteger(parsed)) {
    throw new Error(`${field} must be an integer in the fixture manifest`);
  }
  return parsed;
};

const stringArrayField = (form: Record<string, any>, field: string): string[] => {
  const value = form[field];
  if (!Array.isArray(value) || !value.every((entry) => typeof entry === "string")) {
    throw new Error(`${field} must be a string array in the fixture manifest`);
  }
  return value;
};

const companyRequest = (form: Record<string, any>) =>
  Schema.decodeUnknownSync(SourceCompanyReplayInput)({
    currentPage: integerField(form, "currentPage"),
    maxResults: integerField(form, "maxResults"),
    searchType: stringField(form, "searchType"),
    textCrpNm: stringField(form, "textCrpNm"),
  });

const reportsRequest = (form: Record<string, any>) => {
  const presenterName = stringField(form, "textPresenterNm");
  const reportName = stringField(form, "reportName");
  const finalReport = stringField(form, "finalReport");
  if (finalReport !== "" && finalReport !== "recent") {
    throw new Error(`finalReport value ${finalReport} is outside its fixture contract`);
  }
  return Schema.decodeUnknownSync(SourceCompanyReportsReplayInput)({
    option: stringField(form, "option"),
    currentPage: integerField(form, "currentPage"),
    maxResults: integerField(form, "maxResults"),
    maxLinks: integerField(form, "maxLinks"),
    sort: stringField(form, "sort"),
    series: stringField(form, "series"),
    textCrpCik: stringField(form, "textCrpCik"),
    ...(presenterName === "" ? {} : { textPresenterNm: presenterName }),
    ...(reportName === "" ? {} : { reportName }),
    publicTypes: stringArrayField(form, "publicType"),
    businessCode: stringField(form, "businessCode"),
    corporationType: stringField(form, "corporationType"),
    closingAccountsMonth: stringField(form, "closingAccountsMonth"),
    startDate: stringField(form, "startDate"),
    endDate: stringField(form, "endDate"),
    finalReportOnly: finalReport === "recent",
  });
};

const assertSerializedForm = (
  actual: URLSearchParams,
  expected: Record<string, any>,
  fixtureId: string,
) => {
  const expectedKeys = Object.entries(expected)
    .filter(([, value]) => !Array.isArray(value) || value.length > 0)
    .map(([name]) => name)
    .sort();
  const actualKeys = [...new Set(actual.keys())].sort();
  deepStrictEqual(actualKeys, expectedKeys, `${fixtureId} serialized field names`);
  for (const [name, rawValue] of Object.entries(expected)) {
    const expectedValues = Array.isArray(rawValue)
      ? rawValue.map(String)
      : [String(rawValue)];
    deepStrictEqual(
      actual.getAll(name),
      expectedValues,
      `${fixtureId}.${name} serialization`,
    );
  }
};

const locatorProjection = (locator: Record<string, any>) => ({
  rcpNo: locator.rcpNo,
  dcmNo: locator.dcmNo,
  eleId: locator.eleId,
  offset: locator.offset,
  length: locator.length,
  dtd: locator.dtd,
  ...(locator.tocNo === undefined ? {} : { tocNo: locator.tocNo }),
});

const tocProjection = (nodes: readonly Record<string, any>[]): unknown[] =>
  nodes.map((node) => ({
    title: node.title,
    locator: locatorProjection(node.locator),
    children: tocProjection(node.children),
  }));

const successProjection = (value: any, expected: Record<string, any>) => {
  if (expected.parser === "company-search") {
    return {
      rows: value.rows.length,
      droppedRows: value.droppedRowCount,
      pagination: value.pagination,
      ...(expected.first === undefined ? {} : {
        first: {
          companyCode: value.rows[0]?.companyCode,
          companyName: value.rows[0]?.companyName,
          stockCode: value.rows[0]?.stockCode,
          marketKind: value.rows[0]?.marketKind,
        },
      }),
    };
  }
  if (expected.parser === "company-reports") {
    return {
      rows: value.rows.length,
      droppedRows: value.droppedRowCount,
      pagination: value.pagination,
      ...(expected.first === undefined ? {} : {
        first: {
          companyCode: value.rows[0]?.companyCode,
          reportTitle: value.rows[0]?.reportTitle,
          receiptNumber: value.rows[0]?.rcpNo,
          receiptDate: value.rows[0]?.receiptDate,
        },
      }),
    };
  }
  return {
    documentCount: value.documents.length,
    selectedQuery: value.selectedDocument.query,
    selectedWasExplicit: value.selectedDocument.selected,
    tocRoots: value.toc.length,
    ...(expected.documents === undefined ? {} : {
      documents: value.documents.map((document: Record<string, any>) => ({
        title: document.title,
        kind: document.kind,
        selected: document.selected,
        query: document.query,
      })),
    }),
    ...(expected.toc === undefined ? {} : { toc: tocProjection(value.toc) }),
    initialLocator: value.initialViewLocator,
  };
};

let parserCases = 0;
let serializerCases = 0;
for (const fixtureCase of manifest.cases) {
  const expected = fixtureCase.expected;
  const request = resolveRequest(fixtureCase);
  if (fixtureCase.operationId === "searchCompanyFragment") {
    assertSerializedForm(
      buildCompanySearchForm(companyRequest(request.form)),
      request.form,
      fixtureCase.id,
    );
    serializerCases += 1;
  } else if (fixtureCase.operationId === "searchCompanyReportsFragment") {
    assertSerializedForm(
      buildCompanyReportsSearchForm(reportsRequest(request.form)),
      request.form,
      fixtureCase.id,
    );
    serializerCases += 1;
  }
  if (expected.parser === "report-content") continue;
  parserCases += 1;
  const body = await readFile(resolve(fixtureRoot, fixtureCase.response.bodyPath), "utf8");
  const query = new URLSearchParams(request.query ?? {}).toString();
  const sourceUrl = `https://dart.fss.or.kr${request.path}${query === "" ? "" : `?${query}`}`;
  const response = createDartSourceTextResponse(body, sourceUrl);
  try {
    const parsed = expected.parser === "company-search"
      ? await Effect.runPromise(Effect.either(parseCompanySearchHtml(response, companyRequest(request.form))))
      : expected.parser === "company-reports"
        ? await Effect.runPromise(Effect.either(parseCompanyReportsSearchHtml(response, reportsRequest(request.form))))
        : { _tag: "Right" as const, right: parseReportShell(response) };
    if (parsed._tag === "Left") {
      strictEqual(expected.kind, "error", `${fixtureCase.id} unexpectedly failed`);
      strictEqual(classify(parsed.left), expected.classification, fixtureCase.id);
      continue;
    }
    const value = parsed.right;
    strictEqual(expected.kind, "success", `${fixtureCase.id} unexpectedly succeeded`);
    const { kind: _kind, parser: _parser, ...projection } = expected;
    deepStrictEqual(successProjection(value, expected), projection, fixtureCase.id);
  } catch (error) {
    if (expected.kind !== "error") throw error;
    strictEqual(classify(error), expected.classification, fixtureCase.id);
  }
}

const authorityHash = createHash("sha256")
  .update(await readFile(resolve(repoRoot, "docs/specs/dart-wire-v1.openapi.yaml")))
  .digest("hex");
console.log(`DART fictional fixtures conformed through ${parserCases} active TypeScript parser cases and ${serializerCases} POST serializer cases (authority ${authorityHash.slice(0, 12)}).`);
