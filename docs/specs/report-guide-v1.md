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
- Failures are non-retryable `invalid_request` or `internal_error`.

[`dart-report-guide.md`](../research/dart-report-guide.md) owns the maintained
source guide and its source caveat. The TypeScript capability compiles an
English rendering into code. Its `guidePath` names that repository authoring
source for provenance; the published npm package does not include the Markdown
file as a separately readable asset. The port must preserve the public content
and provenance contract.
