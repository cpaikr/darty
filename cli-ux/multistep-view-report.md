# Multi-step CLI workflow: find reports, then view report TOC/body

Date: 2026-05-24

Goal: starting from CLI help only, find a company report and view its table of contents or body using identifiers returned by earlier commands.

Live DART access succeeded.

## Commands run

### 1. Discover top-level commands

```sh
bun dist/cli.js --help
# exit 0
```

Representative output:

```text
Commands:
  search-company [options]          Find 8-digit DART company codes through DART 기업개황 회사별 search.
  search-company-reports [options]  Search company-specific DART filings by DART company code.
  view-report [options]             Fetch a DART report table of contents or body content.
```

### 2. Read relevant subcommand help

```sh
bun dist/cli.js search-company --help
# exit 0
bun dist/cli.js search-company-reports --help
# exit 0
bun dist/cli.js view-report --help
# exit 0
```

Useful help snippets:

```text
Search tips:
  - companyCode is DART's 8-digit company identifier embedded in company links such as select('00126380').
  - stockCode is a 6-digit listed-company stock code shown only for listed companies; it is not the DART company code.
```

```text
Search tips:
  - If you know the company name but not the company code, first run `darty search-company --company-name <company name>` to find the 8-digit companyCode.
  - Pass a result filing.receiptNumber or references.viewerUrl to `view-report` for follow-up retrieval.
```

```text
Options:
  --receipt <receipt-or-url>       DART receipt number or viewer URL
  --document-id <id>               Document ID to fetch (documents[].id)
  --section-id <id>                TOC section ID to fetch (toc[].id). It is report-specific; do not reuse it across reports.
```

### 3. Find the DART company code

```sh
bun dist/cli.js search-company --company-name 삼성전자 --pretty
# exit 0
```

Representative output:

```json
{
  "companyCode": "00126380",
  "companyName": "삼성전자",
  "stockCode": "005930",
  "marketKind": "kospi",
  "marketLabel": "유가증권시장"
}
```

### 4. Find company reports

```sh
bun dist/cli.js search-company-reports --company-code 00126380 --start-date 20250101 --end-date 20260524 --report-name 사업보고서 --pretty
# exit 0
```

Representative output:

```json
{
  "filing": {
    "receiptNumber": "20260310002820",
    "reportTitle": "사업보고서 (2025.12)",
    "receiptDate": "2026-03-10",
    "presenterName": "삼성전자"
  },
  "references": {
    "viewerUrl": "https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260310002820"
  }
}
```

### 5. View the report TOC by receipt number

```sh
bun dist/cli.js view-report --receipt 20260310002820 --pretty --toc-depth 2
# exit 0
```

Representative output:

```json
{
  "receipt": { "receiptNumber": "20260310002820" },
  "document": {
    "id": "document:body:1",
    "title": "사업보고서",
    "kind": "body",
    "selected": true
  },
  "toc": [
    { "id": "section:3", "title": "I. 회사의 개요" },
    {
      "id": "section:4",
      "title": "II. 사업의 내용",
      "children": [
        { "id": "section:4.1", "title": "1. 사업의 개요" },
        { "id": "section:4.2", "title": "2. 주요 제품 및 서비스" }
      ]
    }
  ]
}
```

### 6. View the same TOC by the reported viewer URL

```sh
bun dist/cli.js view-report --receipt 'https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260310002820' --toc-depth 1 --pretty
# exit 0
```

This also worked and normalized the receipt to `20260310002820`.

### 7. View one section body using the TOC section ID

```sh
bun dist/cli.js view-report --receipt 20260310002820 --section-id section:4.1 --max-bytes 2000 --pretty
# exit 0
```

Representative output:

```json
{
  "content": {
    "scope": "section",
    "format": "markdown",
    "body": "1. 사업의 개요\n\n당사는 본사를 거점으로 한국과 DX 부문 산하 해외 9개 지역총괄 및 DS 부문 산하 해외 5개 지역총괄의 생산ㆍ판매법인...",
    "sizeBytes": 3655,
    "returnedBytes": 1999,
    "isFullContent": false,
    "window": {
      "hasMore": true,
      "nextStartByte": 1999
    },
    "section": {
      "id": "section:4.1",
      "title": "1. 사업의 개요"
    }
  }
}
```

The truncation warning gave the continuation command shape clearly:

```text
continue with contentStartByte=1999 using the same receipt/documentId/sectionId/outputFormat.
```

### 8. Check identifier-related error recovery

```sh
bun dist/cli.js view-report --receipt 20260310002820 --section-id 4.1 --max-bytes 1000 --pretty
# exit 1
```

Representative error:

```json
{
  "code": "not_found",
  "message": "Section ID \"4.1\" was not found in this document TOC. Call view-report again with the same receipt/documentId and use the returned toc[].id. Section IDs cannot be reused across years, corrections, or other receipt numbers.",
  "parameter": "sectionId",
  "recoveryHint": "Call view-report again with the same receipt to get current documents[].id/toc[].id values, then use the returned value."
}
```

```sh
bun dist/cli.js view-report --receipt 20260310002820 --document-id 123 --pretty
# exit 1
```

Representative error:

```json
{
  "code": "not_found",
  "message": "Document ID \"123\" was not found for this receipt. Call view-report again with receipt and use the returned documents[].id. Do not pass DART dcmNo as documentId.",
  "parameter": "documentId"
}
```

## Identifier discoverability

Easy:

- `companyCode`: top-level help points to `search-company`; `search-company` help explicitly distinguishes 8-digit `companyCode` from 6-digit `stockCode`.
- `receiptNumber`: `search-company-reports` returns `filing.receiptNumber`, and help says to pass it to `view-report`.
- `viewerUrl` / `rcpNo`: `search-company-reports` returns `references.viewerUrl` with `rcpNo=...`; `view-report` accepts it directly.
- `sectionId`: `view-report` TOC returns `toc[].id`, and help/error text emphasizes that the value is report-specific.
- Continuation identifier: body output returns `content.window.nextStartByte`, and the warning explains how to use it.

Hard or hidden:

- `dcmNo`, `eleId`, `offset`, `length`, and similar native DART viewer identifiers are not exposed in the default workflow. That is fine for normal use because `view-report` abstracts them away, but hard for users who expect to map back to raw DART URLs.
- `document-id` is an artificial Darty ID (`document:body:1`, `document:attachment:1`) rather than `dcmNo`. The error message says not to pass DART `dcmNo`, but the help could make that non-equivalence visible before an error.
- `view-report --verbose --detail raw` still did not expose native DART locators in my run, so there was no obvious CLI-only way to inspect the underlying `dcmNo`/`eleId` values.

## Workflow friction

- The happy path is coherent: `--help` -> `search-company` -> `search-company-reports` -> `view-report` TOC -> `view-report --section-id` body.
- The command names are descriptive, and search tips provide the needed handoff fields.
- `view-report --toc-depth` is useful, but its help says "Print the TOC" even though the output is JSON, not a separate printed tree.
- `view-report` returns full `documents` plus TOC when using `--toc-depth`, which can still be large for agent context. `--toc-depth 1` helps.
- The default `view-report` invocation returns locator lists but no body, which is good for the multi-step agent workflow.
- Error messages for bad `sectionId` and `documentId` are strong and give actionable recovery hints.

## Smallest improvements

1. In `view-report --help`, add one line near `--document-id`: "This is Darty's `documents[].id`, not DART `dcmNo`."
2. In `view-report --help`, add a compact workflow example using fields from prior output: `search-company` -> `search-company-reports` -> `view-report --receipt <filing.receiptNumber>` -> `view-report --section-id <toc[].id>`.
3. Consider a `--locators` or raw-detail field that exposes native DART `rcpNo`/`dcmNo`/`eleId` when available, clearly marked as diagnostic and not required for normal follow-up.
4. Reword `--toc-depth` help from "Print the TOC" to "Include TOC entries to the specified depth" to match JSON output.
