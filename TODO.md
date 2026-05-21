# TODO

## Now

- Add license for npm
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
