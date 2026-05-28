# Reusable CLI Tool Package Review Checklist

Use this checklist after reading the target package and the CLI surface spec.

## Public CLI surface

- [ ] `package.json` defines at least one CLI `bin` when the package is distributed through npm or an equivalent package manager.
- [ ] Build output files referenced by `bin` entries exist.
- [ ] The README or install docs explain how to run the command as an installed command, explicit executable path, or package-runner command.
- [ ] The package documents required runtime versions.

## Source of truth

- [ ] `<command> --help` exits 0 and prints current command, option, output, and example guidance.
- [ ] Every meaningful subcommand has command-level help.
- [ ] Docs and skills point agents to the CLI's own help instead of duplicating a stale manual.
- [ ] Help text states output behavior, including JSON stdout and stderr usage.
- [ ] Help examples are current and runnable, or clearly marked as illustrative.

## Command design

- [ ] Command and subcommand names are stable, host-neutral, and kebab-case where applicable.
- [ ] Inputs use semantic flags/fields instead of raw transport parameters unless source accuracy requires them.
- [ ] Unknown or unsafe input shapes are rejected where appropriate.
- [ ] Each command is one meaningful deterministic action, not a vague prompt wrapper.
- [ ] The command set avoids future adapters, compatibility layers, or broad abstractions before a real user need exists.

## Language and model ergonomics

- [ ] Package, command, option, help, validation, warning, summary, limitation, and error copy is English-native for agent reliability.
- [ ] Official Korean source terms such as `사업보고서`, `감사보고서`, `표준지 공시지가`, and `개별공시지가` are preserved when translation would reduce accuracy.
- [ ] The package does not maintain separate Korean, English, and agent-facing variants for reusable tool definitions; localized UI copy, if needed, belongs to the host application's presentation layer.
- [ ] Help and error recovery guidance preserves concrete usage constraints, source provenance, mutually exclusive-field rules, accepted/rejected identifier types, and cross-command lookup paths.

## Stdout, stderr, and exit codes

- [ ] Successful command execution emits exactly one JSON object to stdout.
- [ ] Command failure emits exactly one JSON failure object to stdout and exits non-zero.
- [ ] Invalid command usage exits non-zero and emits a structured JSON failure object.
- [ ] Stderr is not required to parse results; important warnings are also represented in stdout JSON.
- [ ] Progress/debug diagnostics on stderr are predictable and do not duplicate source-owned errors in a confusing way.

## Success result envelope

- [ ] Success JSON includes a clear success marker such as `ok: true` or an equivalent stable shape.
- [ ] Operation-specific data is kept under a clear result payload such as `result`.
- [ ] Normalized input, command name, or request context is included when useful for replay and auditability.
- [ ] Results preserve references, metadata, warnings, and source context when relevant.
- [ ] The result is useful for the next agent step without extra browsing.
- [ ] Important claims can be cited or revisited through references.

## Failure and recovery envelope

- [ ] Failure JSON includes a clear failure marker such as `ok: false` or an equivalent stable shape.
- [ ] Failures include a structured `error` object or equivalent typed error field.
- [ ] Error metadata includes stable codes, messages, retryability, parameter names, expected/actual details, source references, or recovery hints where relevant.
- [ ] Validation failures point the model toward `--help` or command-level help.
- [ ] Source-owned validation and execution error metadata is preserved instead of rewritten into generic prose.
- [ ] Host/process-level errors are distinguishable from source/upstream errors.

## Capability layering

- [ ] CLI argument parsing stays thin and does not own domain logic.
- [ ] Domain messages, result summaries, validation copy, recovery hints, warnings, and source references live in reusable capability code behind the CLI.
- [ ] Command behavior is covered by tests at the CLI boundary or an equivalent executable boundary.
- [ ] Cancellation/timeouts are handled safely when the runtime supports them.

## Human judgment

- [ ] The schemas or documented output shapes are small enough for model use but complete enough for validation.
- [ ] Limitations are concrete, not boilerplate.
- [ ] Source drift, auth gaps, partial coverage, and known unsupported cases are documented.
- [ ] The CLI provides source-reference material without overstating legal, accounting, audit, tax, investment, appraisal, or official-government status.
