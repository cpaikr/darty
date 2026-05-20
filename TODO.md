# TODO

## Now

- Improve recovery hints in failures.
  - For unknown company codes or ambiguous company names, suggest `search-company` before company-specific filing searches.
  - For stale or wrong `documentId`/`sectionId`, suggest rerunning `view-report` for the receipt and using returned IDs.
  - For invalid date windows, page numbers, limits, and content-window byte offsets, include accepted formats or ranges.
  - For unsupported raw DART viewer parameters, say to use returned darty IDs instead of `dcmNo`, `eleId`, `offset`, or `length`.
  - For no-result searches, suggest broader or source-relevant search terms only when evidence-backed.
  - Keep failure envelopes parseable and concise.
  - Success criteria:
    - Common invalid calls lead agents to the next correct call.
    - Failure messages identify the bad parameter or source URL when known.
    - No human-readable diagnostics leak outside the structured envelope.
- Improve cryptic DART-code inputs.
  - Focus fields:
    - `disclosureTypes`.
    - `industryCode`.
    - `corporationType`.
    - `closingAccountsMonth`.
    - `reportName`.
  - Add richer schema descriptions with common examples.
  - Add docs listing common DART codes and when to use them.
  - Consider a lookup/list capability if code discovery becomes common.
  - Consider semantic aliases only when there is a stable, evidence-backed mapping.
  - Success criteria:
    - Agents can choose common filters without guessing raw DART codes.
    - Invalid-code errors provide actionable correction hints.
    - Source-shaped fields remain explicit where exact DART behavior matters.
- Review descriptions and schemas after eval failures.
  - Use eval transcripts to refine descriptions and schemas.
  - Look for wrong tool selection.
  - Look for invalid parameter patterns.
  - Look for repeated broad searches where a narrower call should work.
  - Look for outputs where the model misses the next useful reference.
  - Update descriptions, validation messages, result shapes, or examples based on concrete failures.
  - Success criteria:
    - Description changes are evidence-backed by eval transcripts.
    - Improvements reduce invalid calls or unnecessary follow-up calls.
    - Tool specs stay concise and do not become prompt dumps.

## Later

- Add held-out workflow eval cases for amended reports or multiple similar company names, stale `sectionId` recovery, and truncated section continuation after the baseline multi-step workflow evals produce transcripts.
- Add a discoverability path for `search-company-reports --industry-code` values. Users should not need to know DART 업종 codes like `612` ahead of time.
- Support XBRL views.
- Consider semantic `view-report` content pagination/chunking for very large sections or TOC-less reports. Keep DART raw viewer params hidden; prefer a stable cursor or explicit content window contract.
