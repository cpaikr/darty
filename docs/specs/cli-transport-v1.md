# CLI Transport v1

## Scope

This spec defines the subprocess contract for the active `darty` CLI transport.
Capability request and result schemas remain owned by each capability spec.

## Command Execution Output

For command executions that run or attempt to run a capability:

- success exits `0`
- failure exits `1`
- stdout contains exactly one JSON envelope followed by a newline
- stderr is empty
- `--pretty` pretty-prints both success and failure JSON

Help paths are the exception: `darty --help`, `darty <command> --help`, and a
command invoked with no options print human-readable help to stdout and exit `0`.

## Success Envelope

Success output is the capability result envelope, possibly transformed by CLI
presentation options such as `--verbose` or `--toc-depth`.

Common shape:

```json
{
  "result": {},
  "metadata": {},
  "references": {},
  "warnings": []
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

Do not parse stderr as part of the contract. It is reserved for unexpected
process-level diagnostics outside normal command failure handling.
