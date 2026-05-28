# Reusable CLI Tool Package Surface Spec

## Purpose

This spec defines a project-neutral shape for packages that expose deterministic agent-usable capabilities through a command-line interface.

The CLI is the public integration surface. Agents should be able to discover current behavior from the command's own help, run the tool as a subprocess, and consume predictable structured stdout. External users should not need an in-process TypeScript SDK, Pi adapter, host action envelope, MCP server, or other host-specific wrapper to use the package.

Compatibility is defined at the CLI behavior and output-envelope level. Each package still defines its own domain commands, inputs, and result payloads.

## Non-goals

- This is not an MCP spec.
- This is not a Pi extension spec.
- This is not a TypeScript SDK or toolset export spec.
- This is not a marketplace/plugin system.
- This does not prescribe one domain `result` payload for every tool family.

## Required public surface

`package.json` should expose at least one command explicitly:

```jsonc
{
  "bin": {
    "example-tool": "dist/cli.js"
  }
}
```

Invocation guidance:

- Prefer an installed command when the environment already has one.
- Prefer an explicit executable path when testing a local checkout or build artifact.
- Prefer package-runner commands such as `npx`, `bunx`, or `pnpm dlx` when the package is not installed.
- Document the minimum supported runtime version when the command needs one.

Naming guidance:

- Use a short stable command name.
- Use kebab-case canonical subcommand names: `search-company`, `view-report`, `list-items`.
- Keep command, option, and JSON key names stable and code-like English.

## Source of truth

The CLI's own help is the authoritative contract for agents:

- `<command> --help` lists available command groups, global options, output behavior, and examples.
- `<command> <subcommand> --help` or equivalent command help lists inputs, mutually exclusive fields, defaults, output shape, examples, limitations, and recovery guidance.
- Documentation may summarize behavior, but it should tell agents to inspect help before running real queries.
- Do not rely on copied manuals inside skills or host prompts when the CLI can report current behavior itself.

## Language policy

Reusable agent-tool packages should be **English-native for the agent/control plane**. Keep these surfaces in English:

- command names, option names, and JSON keys,
- package and command descriptions,
- `--help` and command help text,
- option descriptions and examples,
- validation failure messages, recovery hints, warnings, execution error messages, result summaries, limitations, and citation guidance.

Do not maintain three parallel variants such as Korean, English, and agent-facing copy. The reusable package provides one English model-facing contract. Product hosts such as Creo own Korean UI display copy in their presentation layer when they need localized labels, descriptions, toasts, panels, or dialogs.

Preserve source-native Korean domain terms when they are official identifiers or the terms users and source systems actually use. Do not force awkward translations for terms such as `사업보고서`, `감사보고서`, `반기보고서`, `분기보고서`, `표준지 공시지가`, `개별공시지가`, `법정동`, `공시지가`, and source-specific report or section titles. When a Korean term may be unfamiliar to the model, add a short English gloss on first mention, for example `사업보고서 (annual business report)` or `개별공시지가 (individual publicly announced land price)`.

## Layering model

```text
source/domain adapters -> capability functions -> CLI argument parser -> process stdout/stderr/exit code
```

The CLI parses arguments, chooses a capability, renders the final process result, and exits. It should not own domain behavior, domain validation copy, reusable agent guidance, or source-specific recovery guidance. Keep that material in the capability layer behind the CLI so tests and future internal integrations can reuse it without changing the public surface.

## Compatibility boundary

The compatibility contract is the shared shell that scripts and agents can rely on across unrelated packages:

- package `bin` entries and executable build artifacts,
- command and subcommand help behavior,
- stdout/stderr discipline,
- process exit-code semantics,
- structured success and failure JSON envelopes,
- validation and execution error metadata,
- result references, warnings, and metadata when relevant.

The domain contract is intentionally project-specific:

- the specific set of commands and subcommands,
- command input fields and flags,
- command result payloads under `result`,
- references, metadata, warnings, and source-specific fields inside those command results.

A greenfield package is compatible when it implements the shared CLI behavior and documents its own payloads through command help or linked docs. It does not need to copy another package's commands or payload fields.

## CLI contract

Required behavior:

- `--help` exits 0 and prints human-readable English help text for agents and developers, while preserving official Korean source terms where accuracy requires them.
- Command-level help is available for every meaningful subcommand.
- Successful command execution prints exactly one JSON response object to stdout.
- Command failure prints exactly one JSON failure object to stdout and exits non-zero.
- Stderr does not contain data needed to parse the command result. Use stderr only for diagnostics, progress, debug logs, or warnings that are also preserved in stdout JSON when they matter.
- Invalid commands, invalid options, validation failures, upstream/source failures, and unexpected execution failures are distinguishable in structured output.
- Examples in help are current and runnable, or clearly marked as illustrative.

Recommended behavior:

- Provide a `--pretty` flag for manual debugging while keeping stdout a single JSON object.
- Provide a safe no-network or low-cost command that can be used as a success smoke test when practical.
- Keep flags semantic and stable; avoid exposing raw transport parameters unless the source system requires them.
- Include machine-readable result metadata such as source name, request identifiers, parser version, timing, cache status, or completeness when useful.

## Output envelope guidance

Success envelopes should generally look like this:

```jsonc
{
  "ok": true,
  "command": "search-company",
  "input": { "normalized": "values actually used" },
  "result": { "domain": "payload" },
  "metadata": { "source": "source name or version" },
  "references": [],
  "warnings": []
}
```

Failure envelopes should generally look like this:

```jsonc
{
  "ok": false,
  "command": "search-company",
  "error": {
    "name": "ValidationError",
    "code": "missing_parameter",
    "message": "companyName is required.",
    "parameter": "companyName",
    "retryable": true,
    "recoveryHint": "Run `example-tool search-company --help` and provide --company-name."
  },
  "metadata": { "source": "cli" },
  "warnings": []
}
```

These exact keys are recommended, not mandatory for every domain. The invariant is that stdout remains one parseable JSON object and preserves enough structured data for an agent to recover or cite the result.

## Validation and error contract

Validation failures should be structured and recoverable. Preserve fields like:

- `code`: stable machine-readable category, such as `missing_parameter`, `invalid_parameter`, `unknown_parameter`, `invalid_request`, `source_unavailable`, or `not_found`.
- `message`: concise human/model-readable explanation.
- `command`: command or subcommand involved.
- `parameter`: specific flag or input field involved.
- `expected` / `actual`: useful mismatch details.
- `retryable`: whether changing inputs or retrying could help.
- `recoveryHint`: concrete next step, often pointing to command help.
- `sourceUrl`, `reference`, or source metadata when the failure came from an upstream source.

Do not collapse source-owned structured errors into generic prose. If the CLI catches an unexpected exception, serialize it into the same failure object shape without leaking secrets.

## Result payload guidance

Domain payloads may vary, but agent-facing command results should generally include:

- `result`: the structured domain payload,
- `metadata`: source, timing, completeness, version, cache, or parser details,
- `references`: stable ids, URLs, anchors, section ids, page numbers, or source pointers,
- `warnings`: partial results, parsing uncertainty, source drift, fallback use,
- `error`: typed failure when a command returns an error envelope instead of throwing.

Traceability is a contract feature. If a result cannot be cited, revisited, or recovered from, it is usually not ready for agent workflows.

## Message ownership

Source packages should own domain and reusable agent messages:

- command descriptions and result summaries,
- limitations and citation guidance,
- validation failure messages,
- retryability and recovery hints,
- source warnings and execution error messages.

The CLI owns only process-level messages:

- malformed command-line syntax that cannot be mapped to a domain command,
- unknown commands or flags,
- activity/progress/debug logs on stderr,
- transport, persistence, or cancellation messages.

When process-level code wraps source errors, preserve source messages and structured recovery details. Do not add generic wrapper warnings unless the source did not provide actionable guidance.

## Conformance checks

Automated checks should verify shape, not product quality.

Good automated checks:

- `package.json` has a CLI `bin`.
- Referenced CLI files exist after build.
- `--help` exits 0 and prints help text.
- Invalid CLI usage exits non-zero and prints exactly one JSON failure object to stdout.
- A known safe success command, when supplied to the checker, exits 0 and prints exactly one JSON success object to stdout.
- JSON failure objects preserve structured error metadata.
- Command examples in help are covered by project-specific tests when practical.

Human review is still required for:

- command boundaries,
- field naming,
- result usefulness,
- reference quality,
- warning quality,
- English control-plane clarity for labels, descriptions, help, validation copy, warnings, summaries, and errors, including correct preservation of official Korean source terms,
- source drift and safety claims,
- whether any host adapter should exist at all for an internal product need.

## Acceptance checklist

A package follows this spec when:

- the required CLI surface exists,
- help is the source of truth for current commands and options,
- successful command output is one structured JSON object on stdout,
- failed command output is one structured JSON failure object on stdout plus a non-zero exit,
- stderr cannot corrupt stdout parsing,
- invalid input produces useful recovery metadata,
- results preserve references/warnings/metadata where relevant,
- automated CLI conformance checks pass,
- human review confirms the commands are agent-usable.
