# TODO

- Extract shared date/search request validation helpers now that `search-body` and `search-company-reports` duplicate YYYYMMDD/date-range validation, unknown-key checks, and Effect parse-issue traversal. Keep capability-specific messages local.
- `search-company-reports` seems to be missing filters like "제출인명", "공시유형", "업종", "법인유형", "결산유형", "보고서명"
  - Create specs
  - Implement filters
- Check how flags are validated

## Later

- Support XBRL views
