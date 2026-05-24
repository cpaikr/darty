# TODO

## Later

- Add held-out workflow eval cases for amended reports or multiple similar company names, stale `sectionId` recovery, and truncated section continuation after the baseline multi-step workflow evals produce transcripts.
- Add a discoverability path for `search-company-reports --industry-code` values. Users should not need to know DART 업종 codes like `612` ahead of time.
- Support XBRL views.
- Consider semantic `view-report` content pagination/chunking for very large sections or TOC-less reports. Keep DART raw viewer params hidden; prefer a stable cursor or explicit content window contract.
