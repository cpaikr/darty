# CLI Transport v1

## Scope

This implementation-neutral spec defines the subprocess contract for the
`darty` CLI. Capability request and result schemas remain owned by each
capability spec; [ARCHITECTURE.md](../../ARCHITECTURE.md) owns which
implementation currently conforms.

## Command Execution Output

For command executions that run or attempt to run a capability:

- success exits `0`
- failure exits `1`
- stdout contains exactly one JSON envelope followed by a newline
- stderr is empty by default
- `--pretty` pretty-prints both success and failure JSON

Help and `report-guide` success paths are exceptions:

- `darty --help` and `darty <command> --help` print human-readable help to stdout
  and exit `0`
- bare `darty` prints the same root help as `darty --help`, byte for byte, and
  exits `0`; there is no separate home view to drift from it
- successful `darty report-guide` execution prints human-readable Markdown to
  stdout and exits `0`; failures still use the JSON failure envelope
- a command invoked with no required options attempts to run the capability,
  prints a JSON `invalid_request` failure envelope, and exits `1`
- `darty --version` prints `darty <version>` and a newline to stdout and exits
  `0` without network access

## Version Command

`darty version` prints a local JSON success envelope with
`metadata.output: "version"` and `result` fields `name`, `version` (the
embedded release version), and `target` (the release target id, or `null` for
a build outside the release target inventory). It exits `0`.

`darty version --check` adds `result.releaseCheck`, a release report that is
present even when no update exists:

- `currentVersion` and `target`
- `comparison`: `newer`, `equal`, `ahead`, `no_stable_release`,
  `uncomparable`, or `null` without usable evidence
- `latestVersion`, `releaseUrl`, `distribution` (`complete` or
  `incomplete_distribution`), and `runtimeCertified`, or `null` when unknown
- `freshness`: `fresh`, `stale`, or `unavailable`; `observedAt`, `ageSeconds`,
  and `lastRefreshFailedAt` when known
- `problems`: evidence, cache, or opt-out explanations

Evidence problems are part of the report and still exit `0`. Equality does not
prove source freshness or executable integrity.

## Upgrade Command

`darty upgrade [--check] [--pretty]` manages only a standalone installation
whose executable matches the adjacent `.darty-receipt.json` written by the
release installers. It prints one JSON envelope with
`metadata.output: "upgrade"`, exits `0` on success and `1` on failure, and
never carries advisories.

Success `result` fields are `name`, `runningVersion` (the executable that ran
the command), `latestVersion`, `installedVersion` (the version at the
executable path afterwards), `updateAvailable`, `updated`, `distribution` (`complete` or
`incomplete_distribution` for this target), `target`, `releaseUrl`, and
`executable` (the receipt's path). `--check` and an up-to-date installation
download no release assets and change nothing; `--check` reports an incomplete
release as success. When an update is available but not installed, `help`
names `darty upgrade` or says the release lacks this target's archive.

Failure `error.code` values are `unmanaged_installation`,
`upgrade_receipt_mismatch`, `upgrade_unsupported`,
`upgrade_source_unavailable` (retryable), `upgrade_release_invalid`,
`upgrade_verification_failed`, `upgrade_failed` (the installation is unchanged
or was restored), and `upgrade_recovery_required`, whose `recoveryHint` names
the remaining recovery step.

## Advisories

After a successful network capability operation (`search-body`,
`company-detail`, `company-rss`, `search-company`, `search-company-reports`,
`view-report`), the success envelope may include a top-level `advisories`
array. It holds incidental notices unrelated to the capability result, which
`warnings` describes. Each entry has a stable `code`, a human-readable
`message`, and a `check` object shaped like `releaseCheck`. Codes are
`update_available`, `update_incomplete_distribution`, `version_uncomparable`,
`update_check_stale`, `update_check_unavailable`, and `update_check_problem`;
at most one entry is emitted per invocation.

The key is omitted when there is nothing to report, including fresh `equal`,
`ahead`, and `no_stable_release` results and opted-out execution. Advisories
never change the exit code, `result`, or other envelope fields, and stderr stays
empty. Help, `--version`, `version`, `disclosure-types`, `report-guide`,
`upgrade`, and failures never carry advisories. The addition is backward compatible, so
`cliTransportVersion` stays `"1"`. The [README](../../README.md) owns network
destinations, cache location, refresh timing, and the opt-out.

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

An optional top-level `advisories` array may follow; see [Advisories](#advisories).

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
    "message": "Option \"--company-code\" must be an 8-digit DART company code. Company names and 6-digit stock codes are not accepted. Example: Samsung Electronics DART company code 00126380.",
    "retryable": false,
    "parameter": "companyCode",
    "recoveryHint": "If you only know a company name or 6-digit stock code, first use search-company to find the 8-digit companyCode, then call this operation again."
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
default. `darty upgrade` writes human progress stages to stderr only when
stderr is an interactive terminal, so pipes, CI, and agents still see an empty
stderr. With the global `--debug` option, the Rust CLI writes a bounded JSON
diagnostic containing only the failure `code` and `retryable` classification.
`--verbose` controls result presentation; it does not enable stderr logging.
The Rust CLI does not read `DARTY_LOG_LEVEL`. CLI stdout remains the single
parseable command result.
