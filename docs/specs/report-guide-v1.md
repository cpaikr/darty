# Report Guide v1

`report-guide` is a static, read-only operation that returns the bundled guide
to information commonly found in DART report families. It does not call the
live provider.

## Contract

- Input is an empty object; unknown fields are rejected.
- The capability result contains `title`, `contentMarkdown`, a
  `bundled_project_document` status, repository-source provenance, source URLs,
  and warnings.
- The CLI success exception prints the guide as human-readable Markdown rather
  than the normal JSON envelope, as frozen by
  [CLI transport v1](cli-transport-v1.md).
- SDK input and CLI execution expose non-retryable `invalid_request` or
  `internal_error` failures. The historical TypeScript toolset's generic-envelope
  error wrapping is not a supported repository surface after cutover.

[`dart-report-guide.md`](../research/dart-report-guide.md) owns the maintained
source guide and its source caveat. The Rust SDK embeds the English rendering
from [`report-guide.json`](../../crates/darty/resources/report-guide.json).
Its `guidePath` retains the repository authoring source for provenance; the
standalone executable does not read that Markdown file at runtime or require
it as a separate asset. Public content and frozen provenance remain unchanged.
