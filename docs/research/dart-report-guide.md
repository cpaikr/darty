# DART report information guide

Last source review: 2026-05-24. The descriptions below reflect that review;
reporting requirements may change.

This guide helps agents choose which DART report family to inspect before retrieving filings. It summarizes DART's public filing guide and the `사업보고서 - 사업의 내용` drafting guidance. Use it as a search guide, not as legal, accounting, or investment advice.

The original URL and file for the reviewed HWP drafting guidance were not
retained in the repository. Recheck any claim relying only on that guidance
against the official source before reuse. The SDK embeds a separately frozen
English rendering in [`report-guide.json`](../../crates/darty/resources/report-guide.json);
this authoring document is not loaded at runtime.

Source pages reviewed on the date above:

- Periodic reports: <https://dart.fss.or.kr/info/main.do?menu=210>
- Material-event reports (`주요사항보고서`): <https://dart.fss.or.kr/info/main.do?menu=220>
- Issuance disclosures: <https://dart.fss.or.kr/info/main.do?menu=230>
- Mergers and reorganizations: <https://dart.fss.or.kr/info/main.do?menu=240>
- Large shareholding reports: <https://dart.fss.or.kr/info/main.do?menu=310>
- Officer ownership reports: <https://dart.fss.or.kr/info/main.do?menu=320>
- Short-swing profit return: <https://dart.fss.or.kr/info/main.do?menu=330>
- Officer/major shareholder trading plans: <https://dart.fss.or.kr/info/main.do?menu=340>

## Quick map

| Need | Start with | What it usually contains |
| --- | --- | --- |
| Regular business, financial, governance, shareholder, officer, and audit information | `사업보고서`; interim updates in `반기보고서` / `분기보고서` | Broad company, operating, financial, and governance disclosure. |
| What the company does, how it earns money, products, customers, facilities, risks, R&D, contracts, IP, regulation, or new businesses | `사업보고서` → `사업의 내용` | The core business-description section. |
| Material events between periodic reports | `주요사항보고서` | Treasury shares, capital changes, CB/BW/EB issuance, restructurings, major asset/business transfers, mergers, spin-offs, and share exchanges. |
| Financing, public offerings, or secondary offerings | `증권신고서`, `투자설명서`, `증권발행실적보고서`, or small-offering documents | Securities terms, schedule, subscription structure, and issuer information. |
| Merger, split-off, share exchange/transfer, or transaction completion | `주요사항보고서`; `증권신고서` if offering-like; `합병등 종료보고서` after completion | Transaction structure, valuation method, external appraisal, and completion status. |
| Who owns or controls at least 5% of a listed company | `주식등의 대량보유상황보고서` / 5% report | Reporting persons, group holdings, holding purpose, ownership ratio, key contracts, funding source, and changes. |
| What officers or major shareholders personally hold or trade | `임원ㆍ주요주주의 특정증권등 소유상황보고서` | Individual holdings and changes for shares, CB/BW/EB, DR, and other covered securities. |
| Whether insiders have short-swing profit subject to return | `단기매매차익 발생사실` and related materials | Covered person, matched buy/sell trades, exceptions, and profit calculation. |
| Large planned trades by officers or major shareholders | `임원 등의 특정증권등 거래계획 보고서` | Trade purpose, expected price and basis, quantity, and trading period. |

## Periodic reports: `사업보고서`, `반기보고서`, `분기보고서`

`사업보고서` is the annual baseline report. It can include company overview, business description, financial matters and schedules, management discussion and analysis, auditor opinion, board and governance information, affiliates, shareholders, officers/employees, and related-party transactions. Attachments can include audit reports (`감사보고서`), business reports, articles of incorporation, and internal accounting control reports.

`반기보고서` and `분기보고서` generally follow the same structure with some omitted or abbreviated items. DART guidance says interim reports may use review opinions instead of audit opinions and may omit some management discussion or schedules; quarterly reports can omit review opinions for some companies.

### `사업보고서` → `사업의 내용`

`사업의 내용` is often the most useful section for understanding the business. The drafting guidance says companies should describe current and newly pursued businesses by major business segment. Listed companies preparing K-IFRS consolidated statements should write from the consolidated group perspective and include material subsidiaries.

For manufacturing and service companies, this section may include:

- business overview and narrative summary;
- major products/services, uses, features, and revenue mix;
- major raw materials, purchase sources, pricing, related-party status, market concentration, and supply stability;
- production, facilities, capacity, utilization, major real estate/equipment/systems, planned investment, funding need, and expected effects;
- sales by product/service, export/domestic split, sales channels, methods, strategy, and major customers;
- orders: order dates, delivery periods, total order amounts, delivered amounts, backlog, seasonal patterns, and other material order information;
- market risks and risk management: interest-rate, price, and foreign-exchange risks, their profit/loss effects, and the management methods and organization;
- derivatives and put-back options: contract names, counterparties, contract and maturity dates, purposes, terms, amounts, settlement methods, early redemption terms, fair values, gains/losses, and payoff structure;
- significant non-recurring contracts affecting financial position: counterparties, purpose, contents, dates, duration, amounts, and payment methods;
- R&D: overview, organization, costs, and results;
- other investment information: brand and customer policies, IP, regulation, environmental rules and capital spending, industry characteristics, growth, economic sensitivity, seasonality, market stability, competition, market share, strengths/weaknesses, segment assets/revenue/operating profit, and material new businesses.

Financial companies use a finance-specific structure, including business overview, operating status, business-line size/performance, funding and asset management by segment, products/services, derivatives, branches/facilities, capital adequacy and soundness metrics such as BIS, liquidity, net operating capital, and solvency ratios, industry conditions, competitive position, and new businesses.

## Material-event reports (`주요사항보고서`)

`주요사항보고서` reports material management or property events between periodic reports. Common triggers include payment default, suspension of important operations, rehabilitation proceedings, capital increase/decrease, capital-like securities issuance, creditor-bank management proceedings, overseas listing/delisting or trading halt, CB/BW/EB issuance, contingent capital events, treasury share decisions, mergers, splits, share exchanges/transfers, material business or asset transfers, and put-back option contracts tied to material asset transfers.

Frequently useful detailed reports include:

- `자기주식 취득ㆍ처분` and related result reports for treasury share acquisition/disposal and trust contracts;
- `중요한 자산의 양수도 결정` for major asset/business transfer terms, threshold analysis, external appraisal, and completion reporting;
- `유상증자결정` for new share classes/count, par value, pre-issuance share count, funding purpose, issuance method, legal basis, price, discount/premium, subscription/payment schedule, board decision, redemption/conversion terms, and information about participants who may become controlling shareholders.

## Issuance disclosures

`발행공시` covers securities offerings and sales. The representative document is `증권신고서`; small offerings use small-offering documents, and post-issuance filings may follow.

A `증권신고서` usually has two broad parts:

- `제1부 모집 또는 매출에 관한 사항`: securities offered/sold, method, schedule, terms, and offering information for investors;
- `제2부 발행인에 관한 사항`: issuer information. DART guidance says this part follows the periodic-report item structure, but its reference date is the day before the securities registration statement filing date.

Start here for financing transactions, public/private offering analysis, issuance terms, investor materials, or issuer context at the time of issuance.

## Mergers and reorganizations

For mergers, splits, split-mergers, comprehensive share exchanges, and share transfers, companies subject to 사업보고서 filing generally submit `주요사항보고서`. Listed companies also submit `합병등 종료보고서` after completion. If the transaction has offering characteristics, it may follow the `증권신고서` / issuance-result path instead.

These filings can contain transaction structure, parties, board resolution or contract information, merger price/exchange ratio and valuation method, external appraisal requirement and attachment status, valuation basis for listed/listed or listed/unlisted combinations, and completion status.

## Ownership and insider reports

### `주식등의 대량보유상황보고서` / 5% report

This report shows large holdings of voting-related securities in listed companies. It is filed when a person and related parties reach 5% or more, when the holding ratio later changes by at least 1%, or when material items such as purpose, holding form, or key contracts change.

It may include issuer information, reporting persons and related parties, holding status and ratios, purpose (passive investment, general investment, management influence), change reasons, holding form, key contracts such as trust/collateral/loan/OTC/options, funding sources, and detailed change records.

### `임원ㆍ주요주주의 특정증권등 소유상황보고서`

This report covers individual holdings of officers and major shareholders. It is separate from the 5% report. Covered securities can include shares, CB, BW, EB, DR, and changes. Unlike the 5% report, it is individual rather than group-aggregated, and a report can be triggered by changes in securities type as well as quantity. DART guidance distinguishes the 5% report’s focus on potential control transfers and a fair market for corporate control from the officer/major shareholder report’s role in monitoring and preventing trading on inside information.

### `단기매매차익` disclosures

The short-swing profit return system applies to listed-company officers, major shareholders, and some employees with access to important inside information. Related disclosures and guidance show the covered person, matched buy/sell trades within six months, exceptions, and returnable profit calculation.

### `임원 등의 특정증권등 거래계획 보고서`

This report pre-discloses large planned trades by listed-company officers or major shareholders. It can apply when planned trades plus trades over the prior six months reach at least 1% of covered securities or KRW 5 billion. It includes trade purpose, expected price and basis, quantity, and trading period. DART guidance says the trading period should be within 30 days, generally filed at least 30 days before the start date, and actual trades may vary only within the reported allowed range.
