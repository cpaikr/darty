# DART Filter Codes

Status: reference for implemented filters.

This page collects source-shaped DART filter values that are exposed by current capability contracts. Keep these fields explicit: callers pass DART codes, not semantic aliases, unless a future spec adds a separately evidenced lookup or alias layer.

For interactive/static discovery of detailed disclosure-type codes, use:

```bash
darty disclosure-types --query 사업보고서
```

Agent-native callers can use `darty_list_disclosure_types` with optional `category` (`A`-`J`) or `query`.

## `search-company-reports`

These inputs map to `dsab007` company filing search (`option=corp`) replay fields.

| Public input | DART field | Accepted values | Observed examples | Notes |
|---|---|---|---|---|
| `disclosureTypes[]` | repeated `publicType` | DART detailed disclosure type codes matching `[A-J]ddd` | `A001` returned annual-report rows; `I001` returned timely-disclosure rows in the seeded KT window | Use this only for DART type codes. Use `reportName` for title text such as `사업보고서`. |
| `industryCode` | `businessCode` | `all`, `ROOTdddd`, or a 2-5 digit DART industry code | `612` matched KT's `전기 통신업`; unrelated `011` returned no rows in the seeded KT window | Use `all` when the industry code is unknown. |
| `corporationType` | `corporationType` | `all`, `P`, `A`, `N`, `E` | `P` matched KT in the seeded window; `A` returned no rows | Meanings: `all` 전체, `P` 유가증권시장, `A` 코스닥시장, `N` 코넥스시장, `E` 기타법인. |
| `closingAccountsMonth` | `closingAccountsMonth` | `all` or `01` through `12` | `12` matched KT in the seeded window; `11` returned no rows | Agent/native callers should send zero-padded values. The CLI accepts `1` through `9` and normalizes them. |

Implemented detailed disclosure-type examples include `A001` 사업보고서 and `I001` 수시공시. The full helper table is sourced from the fixed `sjunepark/open-dart` `pblntf_detail_ty.md` commit used by the implementation.

Source evidence: [`docs/research/dart-source-map.md`](../research/dart-source-map.md), [`dsab007-search-company-reports-v1.md`](dsab007-search-company-reports-v1.md), and [`sjunepark/open-dart/src/docs/pblntf_detail_ty.md`](https://github.com/sjunepark/open-dart/blob/85e7a07dee1d24cd810c705c1400c4ac3bbf6add/src/docs/pblntf_detail_ty.md).
