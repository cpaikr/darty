#!/usr/bin/env bun

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { deepStrictEqual, strictEqual } from "node:assert";

import { Effect } from "effect";

import { parseCompanySearchHtml } from "../src/sources/dart/dsae001/company/parse-html.ts";
import { parseCompanyReportsSearchHtml } from "../src/sources/dart/dsab007/company-reports/parse-html.ts";
import { parseReportShell } from "../src/sources/dart/dsaf001/report/parse-shell.ts";
import { createDartSourceTextResponse } from "../src/sources/dart/source-response.ts";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const fixtureRoot = resolve(repoRoot, "fixtures/dart/vertical-v1");
const manifest = JSON.parse(
  await readFile(resolve(fixtureRoot, "manifest.json"), "utf8"),
) as { cases: Array<Record<string, any>> };
const cases = new Map(manifest.cases.map((fixtureCase) => [fixtureCase.id, fixtureCase]));

const resolvedRequests = new Map<string, Record<string, any>>();
const resolveRequest = (fixtureCase: Record<string, any>): Record<string, any> => {
  const cached = resolvedRequests.get(fixtureCase.id);
  if (cached !== undefined) return cached;
  if (fixtureCase.request.matchRequestFrom === undefined) {
    const request = structuredClone(fixtureCase.request);
    resolvedRequests.set(fixtureCase.id, request);
    return request;
  }
  const base = cases.get(fixtureCase.request.matchRequestFrom);
  if (base === undefined) throw new Error(`${fixtureCase.id} has no base request`);
  const request = structuredClone(resolveRequest(base));
  request.form = { ...request.form, ...fixtureCase.request.formOverrides };
  request.query = { ...request.query, ...fixtureCase.request.queryOverrides };
  resolvedRequests.set(fixtureCase.id, request);
  return request;
};

const classify = (error: unknown): string => {
  const tag = (error as { _tag?: string })._tag;
  if (tag === "SourceChanged") return "source_changed";
  if (tag === "ParseFailure") return "source_parse_failure";
  throw error;
};

const companyRequest = (form: Record<string, any>) => ({
  currentPage: Number(form.currentPage),
  maxResults: Number(form.maxResults),
  searchType: form.searchType as "1",
  textCrpNm: form.textCrpNm as string,
});

const reportsRequest = (form: Record<string, any>) => ({
  option: form.option as "corp",
  currentPage: Number(form.currentPage),
  maxResults: Number(form.maxResults) as 15 | 30 | 50 | 100,
  maxLinks: Number(form.maxLinks),
  sort: form.sort as "date",
  series: form.series as "asc" | "desc",
  textCrpCik: form.textCrpCik as string,
  ...(form.textPresenterNm === "" ? {} : { textPresenterNm: form.textPresenterNm }),
  ...(form.reportName === "" ? {} : { reportName: form.reportName }),
  publicTypes: form.publicType as string[],
  businessCode: form.businessCode as string,
  corporationType: form.corporationType as "all" | "P" | "A" | "N" | "E",
  closingAccountsMonth: form.closingAccountsMonth as
    | "all" | "01" | "02" | "03" | "04" | "05" | "06"
    | "07" | "08" | "09" | "10" | "11" | "12",
  startDate: form.startDate as string,
  endDate: form.endDate as string,
  finalReportOnly: form.finalReport === "recent",
});

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
    initialLocator: value.initialViewLocator,
  };
};

let parserCases = 0;
for (const fixtureCase of manifest.cases) {
  const expected = fixtureCase.expected;
  if (expected.parser === "report-content") continue;
  parserCases += 1;
  const request = resolveRequest(fixtureCase);
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
console.log(`DART fictional fixtures conformed through ${parserCases} active TypeScript parser cases (authority ${authorityHash.slice(0, 12)}).`);
