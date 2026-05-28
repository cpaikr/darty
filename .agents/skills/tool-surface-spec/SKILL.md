---
name: tool-surface-spec
description: Design, review, scaffold, or validate CLI-first reusable agent-tool packages. Use when a user wants command-line tool contracts, JSON stdout/stderr behavior, package conformance checks, or guidance for creating deterministic tools agents can discover and run through a CLI.
---

# Tool Surface Spec

Help projects expose deterministic capabilities through a **CLI-only public surface** for external agents and users.

The core idea is **one command-line contract over one capability core**. Compatibility means agents can discover current behavior from the CLI itself, run commands as subprocesses, and receive predictable structured JSON output without needing an in-process SDK, Pi adapter, or host-specific wrapper.

## Workflow

1. Clarify target scope.
   - Confirm whether the user wants a design review, a spec, a scaffold, implementation, or conformance checks.
   - Default the public integration surface to the CLI. Do not ask external users to expose TypeScript toolset SDKs, Pi extensions, MCP servers, or host adapters unless the user explicitly requests that host integration.
   - Confirm how the command should be invoked: installed command, explicit executable path, or package-runner command such as `npx`, `bunx`, or `pnpm dlx`.

2. Inspect the project.
   - Read `package.json`, README/docs, existing CLI entrypoints, tests, and build scripts.
   - Identify the deterministic capability core behind the CLI.
   - Inspect the CLI's own `--help` and relevant command help. Treat that help as the source of truth for current commands, options, inputs, and output shape.

3. Apply the CLI surface spec.
   - Read `references/tool-package-surface-spec.md`.
   - Keep behavior discoverable through `--help` and command-level help.
   - Keep CLI commands thin over deterministic capability functions. Argument parsing and final process rendering belong in the CLI; domain logic, source messages, validation rules, recovery hints, warnings, references, and result metadata should be produced by the capability layer behind it.
   - Keep successful stdout machine-readable: preferably exactly one structured JSON object.
   - Keep failure stdout machine-readable: preferably exactly one structured JSON failure object plus a non-zero exit.
   - Keep stderr reserved for diagnostics/progress that should not corrupt stdout JSON.
   - Keep reusable tool packages English-native for the agent/control plane: command help, option descriptions, validation/errors, recovery hints, warnings, result summaries, and prompt guidance should be English. Preserve official Korean domain terms when they are source-native identifiers users and filings actually use, such as `사업보고서`, `감사보고서`, `반기보고서`, `분기보고서`, `표준지 공시지가`, and `개별공시지가`.

4. Decide what can be automated.
   - Use automated checks for package `bin` shape, built executable presence, help behavior, invalid-command JSON failures, and known success-command JSON output when a safe command is available.
   - Use human review for command boundaries, result usefulness, source references, warning quality, examples, and model ergonomics.
   - If adding checks, prefer a dependency-light script similar to `scripts/validate-tool-surface.mjs`.

5. Produce a compact result.
   - For a review: report pass/fail by CLI contract area, concrete gaps, and smallest fixes.
   - For implementation: edit only the required package files and tests.
   - For a new package: propose the CLI command layout and JSON output contract before writing code.

## Guardrails

- Do not require external users or agents to import package APIs, expose in-process SDK adapters, install Pi extensions, or use host action envelopes.
- Do not duplicate domain logic, validation copy, recovery hints, result summaries, or source warnings in argument-parsing code.
- Do not make terminal prose the only machine-readable output for normal command results.
- Do not hide structured errors behind generic exit messages.
- Keep package/tool-level labels and descriptions English-native for reusable agent packages. Command help, JSON Schema descriptions, parameter descriptions, examples, result-field descriptions, recovery hints, and prompt snippets should preserve concrete usage constraints, source provenance, mutually exclusive fields, accepted/rejected identifiers, and cross-command references needed to use the command correctly.
- Do not maintain separate Korean, English, and agent-facing variants for reusable tool definitions. The package-owned agent contract is English; host apps such as Creo own Korean UI display copy in their presentation catalogs when they need localized labels or descriptions.
- Preserve source-native Korean terms when translating them would make the tool less accurate or harder to use with the source system. Prefer `사업보고서`, `감사보고서`, `반기보고서`, `분기보고서`, `표준지 공시지가`, `개별공시지가`, `법정동`, and similar official terms as-is, optionally with a short English gloss on first mention when it helps model understanding.
- Do not require agents to infer retry policy from option names alone; preserve validation/error recovery metadata in JSON failures.
- Do not force one domain payload shape across all tools. Require compatible CLI behavior and typed errors; put project-specific data under the command's result payload and document it in command help or referenced docs.
- Forward cancellation/timeouts through subprocess-safe mechanisms when the runtime supports them.
- Separate CLI availability from task activation in host apps.

## References

- `references/tool-package-surface-spec.md` — normative CLI-first package surface spec.
- `references/review-checklist.md` — human review checklist.
- `scripts/validate-tool-surface.mjs` — optional CLI conformance smoke checker.
