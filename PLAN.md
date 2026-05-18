# Agent Tool Improvement Plan

This plan applies Anthropic's "Writing effective tools for agents" guidance to darty's current capability layer. Work through the items in order. Items borrowed from `../kasb/PLAN.md` are included only where they fit darty's transport-neutral core and current CLI/agent-eval surfaces.

## 1. Enrich capability schemas for agent use

Current operation schemas are useful for validation, but exported JSON Schemas should also explain intent, identifiers, and follow-up paths when used by eval tooling or future adapters.

- Add concise descriptions and examples to request fields and important result fields.
- Explain DART-specific identifiers in schema annotations:
  - `companyCode`: 8-digit DART company code, e.g. `00126380`
  - `receiptNumber`: DART filing receipt number (`rcpNo`)
  - `documentNumber`: DART document number (`dcmNo`) when exposed as a reference, not as a required caller input
  - `viewerUrl`: DART `/dsaf001/main.do?rcpNo=...` report-viewer URL
  - `documentId`: darty-returned report document id from `view-report`
  - `sectionId`: darty-returned TOC section id from `view-report`, scoped to one receipt/document
- Keep low-level replay fields internal unless a spec explicitly exposes them.
- Keep descriptions compact; do not turn schemas into prompt dumps.
- Keep schema text aligned with the public specs in `docs/specs/`.

Success criteria:

- Exported JSON Schemas are useful without reading CLI help.
- Agents can identify the correct operation and parameters from schema metadata.
- Schema descriptions match the stable capability contracts.

## 2. Add explicit response detail controls

The CLI already omits raw `evidence` unless `--verbose`, and `view-report` has content-window controls, but future adapters may expose full capability result schemas by default.

- Add or standardize response/detail options where output can become large:
  - `search-body`
  - `search-company-reports`
  - `view-report`
  - `company-rss`
- Consider a simple enum:
  - `concise`
  - `detailed`
  - `raw`
- Default to the smallest useful response.
- Keep raw HTML/source evidence opt-in.
- Preserve references needed for follow-up calls even in concise output.

Success criteria:

- Default responses are agent-readable and token-efficient.
- Detailed/raw evidence remains available when verification requires it.
- Evals track output size or a token proxy metric.

## 3. Reclassify routine format notes vs real warnings

Warnings should mean "pay attention," not "this field is formatted as designed."

- Review warning codes across all capability envelopes.
- Move routine notes, expected HTML preservation, and normal formatting behavior into `metadata` or result field descriptions.
- Reserve `warnings` for partial parsing, source drift risk, ambiguity, truncation, stale identifiers, no-TOC fallbacks, and other action-worthy states.
- Ensure warning names and messages accurately describe what happened.

Success criteria:

- Warnings represent recoverable or citation-relevant conditions.
- Agents do not need to special-case normal output-format notes as warnings.
- Warning semantics are consistent across capabilities.

## 4. Improve recovery hints in failures

Typed failures exist, but recovery guidance should lead agents to the next correct call.

- For unknown company codes or ambiguous company names, suggest `search-company` before company-specific filing searches.
- For stale or wrong `documentId`/`sectionId`, suggest rerunning `view-report` for the receipt and using returned IDs.
- For invalid date windows, page numbers, limits, and content-window byte offsets, include accepted formats or ranges.
- For unsupported raw DART viewer parameters, say to use returned darty IDs instead of `dcmNo`, `eleId`, `offset`, or `length`.
- For no-result searches, suggest broader or source-relevant search terms only when evidence-backed.
- Keep failure envelopes parseable and concise.

Success criteria:

- Common invalid calls lead agents to the next correct call.
- Failure messages identify the bad parameter or source URL when known.
- No human-readable diagnostics leak outside the structured envelope.

## 5. Improve cryptic DART-code inputs

Some fields are source-shaped and useful but hard for agents to use without prior DART knowledge.

Focus fields:

- `disclosureTypes`
- `industryCode`
- `corporationType`
- `closingAccountsMonth`
- `reportName`

Possible improvements:

- Add richer schema descriptions with common examples.
- Add docs listing common DART codes and when to use them.
- Consider a lookup/list capability if code discovery becomes common.
- Consider semantic aliases only when there is a stable, evidence-backed mapping.

Success criteria:

- Agents can choose common filters without guessing raw DART codes.
- Invalid-code errors provide actionable correction hints.
- Source-shaped fields remain explicit where exact DART behavior matters.

## 6. Expand evals from single-capability search to multi-step workflows

Current evals cover `search-body` CLI and agent-native tracks. Add realistic agent workflows that require chaining tools.

Candidate scenarios:

- Given a company name, find its DART company code, search recent filings, and return the filing reference.
- Find a company's latest annual report and return the viewer reference.
- Search body text for a concept, open a matching filing, and cite the relevant report section.
- Retrieve a report TOC, fetch a specific section window, and continue if truncated.
- Confirm no-result behavior without inventing filing references.
- Handle amended reports or multiple similar company names.
- Recover from a stale `sectionId` by rerunning `view-report` and selecting a returned section.

Track metrics:

- task success
- tool-call count
- invalid calls/retries
- runtime
- output size/token proxy
- reference usability

Success criteria:

- Evals represent real DART research tasks, not only simple command execution.
- Failures reveal whether the issue is naming, schema design, output shape, or source behavior.
- Held-out scenarios are kept separate from scenarios used to tune descriptions.

## 7. Review descriptions and schemas after eval failures

Use eval transcripts to refine descriptions and schemas.

- Look for wrong tool selection.
- Look for invalid parameter patterns.
- Look for repeated broad searches where a narrower call should work.
- Look for outputs where the model misses the next useful reference.
- Update descriptions, validation messages, result shapes, or examples based on concrete failures.

Success criteria:

- Description changes are evidence-backed by eval transcripts.
- Improvements reduce invalid calls or unnecessary follow-up calls.
- Tool specs stay concise and do not become prompt dumps.
