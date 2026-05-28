# DART Filter Codes

Status: reference for implemented filters.

This page collects source-shaped DART filter values that are exposed by current capability contracts. Keep these fields explicit: callers pass DART codes, not semantic aliases, unless a future spec adds a separately evidenced lookup or alias layer.

For interactive/static discovery of detailed disclosure-type codes, use:

```bash
darty disclosure-types --query 사업보고서
```

CLI callers can use `darty disclosure-types` with optional `--category` (`A`-`J`) or `--query`. Results include source-backed `categoryLabel` and implementation-authored `categoryDescription` guidance because some labels appear in more than one category; for example, `B001` is the general `주요사항보고` code while `H006` is the `자산유동화` category's `주요사항보고서` code.

## Quick Rules

- Use `reportName` for report title text such as `사업보고서`, `반기보고서`, `감사보고서`, or `기업설명회`.
- Use `disclosureTypes[]` only for DART detailed disclosure-type codes returned by `darty disclosure-types`.
- Use `industryCode: "all"`, `corporationType: "all"`, and `closingAccountsMonth: "all"` when the exact DART code is unknown. Do not guess from Korean labels.
- `search-company-reports` validates `disclosureTypes[]` against the implemented DART detailed-code table; shape-only values like `A999` are rejected with a lookup hint.

## Common Detailed Disclosure-Type Codes

| Code | Label | Category | Use when |
|---|---|---|---|
| `A001` | 사업보고서 | 정기공시 | Annual reports. Pair with `reportName: "사업보고서"` only when you also want title-text narrowing. |
| `A002` | 반기보고서 | 정기공시 | Half-year reports. |
| `A003` | 분기보고서 | 정기공시 | Quarterly reports. |
| `B001` | 주요사항보고서 | 주요사항보고 | General material-event reports filed to DART. Do not confuse with `H006`. |
| `D001` | 주식등의대량보유상황보고서 | 지분공시 | Large shareholding reports. |
| `D002` | 임원ㆍ주요주주특정증권등소유상황보고서 | 지분공시 | Officer/major-shareholder ownership reports. |
| `F001` | 감사보고서 | 외부감사관련 | Audit reports. |
| `F002` | 연결감사보고서 | 외부감사관련 | Consolidated audit reports. |
| `I001` | 수시공시 | 거래소공시 | Exchange timely disclosures. |
| `I002` | 공정공시 | 거래소공시 | Fair disclosures. |
| `J004` | 기업집단현황공시 | 공정위공시 | Business-group status disclosures. |

Category labels:

| Category | Label |
|---|---|
| A | 정기공시 |
| B | 주요사항보고 |
| C | 발행공시 |
| D | 지분공시 |
| E | 기타공시 |
| F | 외부감사관련 |
| G | 펀드공시 |
| H | 자산유동화 |
| I | 거래소공시 |
| J | 공정위공시 |

## `search-company-reports`

These inputs map to `dsab007` company filing search (`option=corp`) replay fields.

| Public input | DART field | Accepted values | Observed examples | Notes |
|---|---|---|---|---|
| `disclosureTypes[]` | repeated `publicType` | DART detailed disclosure type codes matching `[A-J]ddd` | `A001` returned annual-report rows; `I001` returned timely-disclosure rows in the seeded KT window | Use this only for DART type codes. Use `reportName` for title text such as `사업보고서`. |
| `industryCode` | `businessCode` | `all`, `ROOTdddd`, or a 2-5 digit DART industry code | `612` matched KT's `전기 통신업`; unrelated `011` returned no rows in the seeded KT window | Use `all` when the industry code is unknown. |
| `corporationType` | `corporationType` | `all`, `P`, `A`, `N`, `E` | `P` matched KT in the seeded window; `A` returned no rows | Meanings: `all` 전체, `P` 유가증권시장, `A` 코스닥시장, `N` 코넥스시장, `E` 기타법인. |
| `closingAccountsMonth` | `closingAccountsMonth` | `all` or `01` through `12` | `12` matched KT in the seeded window; `11` returned no rows | Agent/native callers should send zero-padded values. The CLI accepts `1` through `9` and normalizes them. |

## Common `search-company-reports` Filter Values

### `reportName`

`reportName` is plain report-title text, not a code. Common values include `사업보고서`, `반기보고서`, `분기보고서`, `감사보고서`, and narrower title fragments such as `기업설명회`.

### `industryCode`

`industryCode` uses DART industry codes. Use `all` unless the source-provided code is known. Observed examples:

| Code | Label | Notes |
|---|---|---|
| `all` | 전체 | Safe default when the industry is unknown. |
| `612` | 전기 통신업 | Matched KT in the seeded observation window. |
| `011` | 작물 재배업 family code | Returned no KT rows in the seeded observation window. |
| `ROOTdddd` | DART industry tree root | Accepted source-shaped root format; use only when copied from the DART industry tree. |

### `corporationType`

| Code | Meaning |
|---|---|
| `all` | 전체 |
| `P` | 유가증권시장 |
| `A` | 코스닥시장 |
| `N` | 코넥스시장 |
| `E` | 기타법인 |

### `closingAccountsMonth`

Use `all` or a zero-padded month string `01` through `12`. Agent/native callers should send the zero-padded form. The CLI accepts `1` through `9` and normalizes them to `01` through `09`.

The full detailed disclosure-type helper table is sourced from the fixed `sjunepark/open-dart` `pblntf_detail_ty.md` commit used by the implementation. Category labels mirror the `pblntf_ty` names documented by `dart-fss`; category descriptions are implementation-authored summaries derived from those labels and detailed-code items.

Source evidence: [`docs/research/dart-source-map.md`](../research/dart-source-map.md), [`dsab007-search-company-reports-v1.md`](dsab007-search-company-reports-v1.md), [`sjunepark/open-dart/src/docs/pblntf_detail_ty.md`](https://github.com/sjunepark/open-dart/blob/85e7a07dee1d24cd810c705c1400c4ac3bbf6add/src/docs/pblntf_detail_ty.md), and [`dart-fss` report type docs](https://dart-fss.readthedocs.io/en/latest/dart_types.html).
