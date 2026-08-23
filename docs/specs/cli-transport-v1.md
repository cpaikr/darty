# CLI Transport v1

## Scope

This spec defines the subprocess contract for the active `darty` CLI transport.
Capability request and result schemas remain owned by each capability spec.

## Command Execution Output

For command executions that run or attempt to run a capability:

- success exits `0`
- failure exits `1`
- stdout contains exactly one JSON envelope followed by a newline
- stderr is empty by default
- `--pretty` pretty-prints both success and failure JSON

Help, home, and `report-guide` success paths are exceptions:

- `darty --help` and `darty <command> --help` print human-readable help to stdout
  and exit `0`
- bare `darty` prints a compact JSON home envelope to stdout and exits `0`
- successful `darty report-guide` execution prints human-readable Markdown to
  stdout and exits `0`; failures still use the JSON failure envelope
- a command invoked with no required options attempts to run the capability,
  prints a JSON `invalid_request` failure envelope, and exits `1`

## Success Envelope

Success output is the capability result envelope, possibly transformed by CLI
presentation options such as `--verbose`, `--agent`, or `--toc-depth`. CLI
success output may include a top-level `help` array of concrete next-step hints.
`--agent` is a compact projection intended for subprocess agents; it preserves
follow-up identifiers and source references while omitting lower-benefit
diagnostic detail.

Common shape:

```json
{
  "result": {},
  "metadata": {},
  "references": {},
  "warnings": [],
  "help": []
}
```

## Failure Envelope

Failure output uses the same envelope discipline with `result: null` and a typed
`error` object:

```json
{
  "result": null,
  "metadata": {
    "cliTransportVersion": "1"
  },
  "references": {},
  "warnings": [],
  "error": {
    "code": "invalid_request",
    "message": "옵션 \"--company-code\"은(는) 8자리 DART 회사 코드여야 합니다.",
    "retryable": false,
    "parameter": "companyCode",
    "recoveryHint": "회사명이나 6자리 종목코드만 알고 있다면 먼저 search-company로 8자리 companyCode를 확인한 뒤 다시 호출하세요."
  }
}
```

Failure `error` fields:

- `code`: stable typed category, such as `invalid_request`, `not_found`,
  `source_unavailable`, `source_changed`, `source_parse_failure`, or
  `internal_error`
- `message`: CLI-facing explanation; request validation messages use CLI flag
  names where possible
- `retryable`: whether retrying the same request may help
- `parameter`: optional semantic request parameter related to the failure
- `sourceUrl`: optional upstream URL related to source failures
- `recoveryHint`: optional concise next action for common recoverable failures, such as resolving an 8-digit `companyCode` with `search-company` or refreshing stale `view-report` IDs

## Stderr

Do not parse stderr as part of the normal result contract. It is empty by
default. When `--verbose`, root `--debug`, or `DARTY_LOG_LEVEL=debug|trace` is
set, the CLI may write safe execution diagnostics to stderr for failures, such
as provider id/code, source URL, HTTP status/content-type/response length, parse
reason, and sanitized cause name/message/code/retryability. CLI stdout remains
the single parseable command result.
