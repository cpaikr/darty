# Darty CLI successful-workflow UX notes

Date: 2026-05-24

Scope: low-risk commands that do not require credentials. Ran the development CLI via `bun run src/cli.ts`.

## Commands run

| Command | Exit | Notes |
| --- | ---: | --- |
| `bun run src/cli.ts --help` | 0 | Listed available commands and cautions. |
| `bun run src/cli.ts report-guide --help` | 0 | Help says command is network-free and bundled. |
| `bun run src/cli.ts disclosure-types --help` | 0 | Help includes category map and examples. |
| `bun run src/cli.ts search-company --help` | 0 | Help explains 8-digit DART code vs 6-digit stock code. |
| `bun run src/cli.ts report-guide` | 0 | Markdown guide, 99 lines / about 10 KB. |
| `bun run src/cli.ts disclosure-types --query 사업보고서 --pretty` | 0 | Static JSON result, no warnings. |
| `bun run src/cli.ts disclosure-types --category A --pretty` | 0 | Static JSON result, no warnings. |
| `bun run src/cli.ts search-company --company-name 삼성전자 --pretty` | 0 | Network worked; returned 6 companies, no warnings. |
| `bun run src/cli.ts search-company --company-name 삼성전자` | 0 | Same data as compact one-line JSON, 1,846 bytes. |

## Output snippets and shape

### `report-guide`

```md
# DART report information guide

This guide helps agents choose which DART report family to inspect before retrieving filings.
...
## Quick map

| Need | Start with | What it usually contains |
| --- | --- | --- |
| Regular business, financial, governance, shareholder, officer, and audit information | `사업보고서`; interim updates in `반기보고서` / `분기보고서` | Broad company, operating, financial, and governance disclosure. |
```

Findings:
- Human-readable Markdown only; no JSON envelope, `references`, or `warnings` fields.
- Includes verified DART source page links near the top.
- Useful as a first-step orientation, but long for an agent that only needs the next command.

### `disclosure-types --query 사업보고서 --pretty`

```json
{
  "result": {
    "request": { "query": "사업보고서" },
    "totalCount": 2,
    "categories": [
      {
        "category": "A",
        "categoryLabel": "정기공시",
        "categoryDescription": "Periodic filing family, including 사업보고서, 반기보고서, and 분기보고서.",
        "items": [{ "code": "A001", "label": "사업보고서" }]
      },
      {
        "category": "F",
        "categoryLabel": "외부감사관련",
        "items": [{ "code": "F004", "label": "회계법인사업보고서" }]
      }
    ]
  },
  "references": {
    "sourceUrl": "https://github.com/sjunepark/open-dart/blob/85e7a07dee1d24cd810c705c1400c4ac3bbf6add/src/docs/pblntf_detail_ty.md"
  },
  "warnings": []
}
```

Shape:
- Top level: `result`, `metadata`, `references`, `warnings`.
- `result`: `request`, `totalCount`, `categories[]`.
- Category rows include `category`, `categoryLabel`, `categoryDescription`, and `items[]` with `code` / `label`.
- `metadata` records source/provenance and `completeness: "complete"`.

Agent usefulness:
- Good: `A001` is immediately usable for `search-company-reports --disclosure-type A001`.
- Caution: substring matching also returns `F004 회계법인사업보고서`; an agent should inspect category labels before choosing.

### `disclosure-types --category A --pretty`

```json
{
  "result": {
    "request": { "category": "A" },
    "totalCount": 5,
    "categories": [
      {
        "category": "A",
        "categoryLabel": "정기공시",
        "items": [
          { "code": "A001", "label": "사업보고서" },
          { "code": "A002", "label": "반기보고서" },
          { "code": "A003", "label": "분기보고서" }
        ]
      }
    ]
  },
  "warnings": []
}
```

Agent usefulness:
- Concise and reliable for selecting periodic-report codes.
- Category help in `--help` is strong enough to choose the category before running the query.

### `search-company --company-name 삼성전자 --pretty`

```json
{
  "result": {
    "request": { "page": 1, "pageSize": 15, "companyName": "삼성전자" },
    "pagination": { "currentPage": 1, "totalPages": 1, "totalCount": 6, "returnedCount": 6 },
    "items": [
      {
        "companyCode": "00126380",
        "companyName": "삼성전자",
        "stockCode": "005930",
        "marketKind": "kospi",
        "marketLabel": "유가증권시장",
        "references": { "detailEndpoint": "https://dart.fss.or.kr/dsae001/select.ax?selectKey=00126380" }
      }
    ]
  },
  "references": { "searchUrl": "https://dart.fss.or.kr/dsae001/search.ax" },
  "warnings": []
}
```

Shape:
- Top level: `result`, `metadata`, `references`, `warnings`.
- `result.request` echoes normalized inputs.
- `result.pagination` is enough to decide whether to fetch another page.
- `result.items[]` has `companyCode`, `companyName`, optional `stockCode`, market fields, and item-level `references.detailEndpoint`.
- `metadata` includes fetch time, DART surface/endpoint, observed source behavior, completeness, and dropped item count.

Agent usefulness:
- First hit is the expected Samsung Electronics DART code (`00126380`) and stock code (`005930`).
- Pagination shows no next page for this exact query.
- Output is sufficient to choose next commands such as `company-detail --company-code 00126380` or `search-company-reports --company-code 00126380`.
- Compact default JSON is parseable and small, but hard for humans to scan; `--pretty` is better for manual/agent transcript review.

## UX findings

- Successful JSON workflows are consistent: `result`, `metadata`, `references`, `warnings`.
- Empty `warnings: []` is explicit and useful; no successful command emitted unexpected warnings.
- References are present and actionable for JSON commands. `search-company` includes both a top-level search endpoint and per-company detail endpoints.
- Help text is practical and includes examples; `disclosure-types --help` especially helps agents map category letters.
- `report-guide` is useful but verbose. It is better for human orientation than for compact agent planning.

## Concrete improvements

1. Add a short agent-oriented summary mode for `report-guide`, e.g. `--summary` or JSON output with `quickMap`, `references`, and `warnings`.
2. Add `matchType` / `matchReason` or an `exactMatch` boolean to `disclosure-types` items so agents can distinguish `사업보고서` from `회계법인사업보고서` without relying only on labels.
3. Add optional `suggestedNextCommands` to successful JSON results, especially:
   - `disclosure-types`: `search-company-reports --disclosure-type <code>`.
   - `search-company`: `company-detail --company-code <companyCode>` and `search-company-reports --company-code <companyCode>`.
4. Add a ranking or exact-name signal to `search-company`; broad results can include surprising matches such as `수원삼성축구단` for `삼성전자`.
5. Consider including query parameters or a reproducible URL in `references.searchUrl`, not only the endpoint, when safe and stable.
