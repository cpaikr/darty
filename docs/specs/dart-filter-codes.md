# DART Filter Codes

This is the caller reference for source-shaped filters accepted by
`search-company-reports`. Callers pass DART codes, not guessed semantic aliases.

Use the static lookup for detailed disclosure types:

```bash
darty disclosure-types --query 사업보고서
```

## Rules

- Use `reportName` for title text such as `사업보고서` or `감사보고서`.
- Use `disclosureTypes[]` only for codes returned by `disclosure-types`.
- Use `industryCode: "all"`, `corporationType: "all"`, and
  `closingAccountsMonth: "all"` when the exact source code is unknown.
- Unknown detail codes, including shape-valid values such as `A999`, are
  rejected with a lookup hint.

## Accepted filter shapes

| Public input | DART field | Accepted values |
|---|---|---|
| `disclosureTypes[]` | repeated `publicType` | Retained DART detail codes matching `[A-J]ddd` |
| `industryCode` | `businessCode` | `all`, `ROOTdddd`, or a 2–5 digit DART industry code |
| `corporationType` | `corporationType` | `all`, `P`, `A`, `N`, or `E` |
| `closingAccountsMonth` | `closingAccountsMonth` | `all` or `01` through `12`; CLI normalizes `1`–`9` |

Corporation types are `P` 유가증권시장, `A` 코스닥시장, `N` 코넥스시장,
and `E` 기타법인. Industry codes are not a general project-owned catalog; use
`all` unless a source-provided value is known.

Common detail codes include:

| Code | Label | Category |
|---|---|---|
| `A001` | 사업보고서 | 정기공시 |
| `A002` | 반기보고서 | 정기공시 |
| `A003` | 분기보고서 | 정기공시 |
| `B001` | 주요사항보고서 | 주요사항보고 |
| `D001` | 주식등의대량보유상황보고서 | 지분공시 |
| `F001` | 감사보고서 | 외부감사관련 |
| `I001` | 수시공시 | 거래소공시 |
| `I002` | 공정공시 | 거래소공시 |
| `J004` | 기업집단현황공시 | 공정위공시 |

The complete canonical runtime catalog is
[`crates/darty/resources/disclosure-types.json`](../../crates/darty/resources/disclosure-types.json). Its pinned
`sjunepark/open-dart` GitHub URL is currently unavailable, so the retained
table is local evidence rather than a reachable provenance claim. Repairing
that implementation metadata is tracked in
[`tasks/repair-disclosure-type-provenance.md`](../../tasks/repair-disclosure-type-provenance.md).
Category labels remain independently documented by
[`dart-fss`](https://dart-fss.readthedocs.io/en/latest/dart_types.html).

See the [company filing-search contract](dsab007-search-company-reports-v1.md)
for request/result behavior and the
[source map](../research/dart-source-map.md) for dated observations.
