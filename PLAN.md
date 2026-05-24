# PLAN: Agent-Friendly CLI On-Ramp

## Status

Implemented. The CLI now exposes the root workflow/output contract, emits JSON failures for missing execution input, adds recovery hints for Commander parse errors, and clarifies `view-report` identifier handoffs. Optional `suggestedNextCommands` remain deferred.

Validated with:

```sh
bun run typecheck
bun test
bun run build
```

## Proposed enhancement

Improve Darty's CLI so a first-time human or coding agent can discover the common DART workflow, recover from invalid invocations, and continue from one command to the next without reading separate notes. This is a CLI UX enhancement over the existing read-only capabilities, not a new DART data surface.

## Evidence

The `cli-ux/` reviews show a coherent happy path but repeated friction at the transport boundary:

- Root help lists commands but does not show the shortest workflow from company name to report body.
- Root help does not state the JSON output contract that agents need to interpret success and failure.
- Several subcommands invoked without required execution input print help and exit `0`, which can look like a successful tool call.
- Commander parse errors and unknown commands/options often lack `parameter` and `recoveryHint` fields.
- `view-report` help hides key identifier rules until an error occurs, especially that `--document-id` is Darty's `documents[].id`, not DART `dcmNo`.

## Goals

- Make `darty --help` enough to choose the standard search-to-view workflow.
- Keep successful command output machine-readable and compatible with the current JSON envelope.
- Make failed execution attempts fail as JSON with a non-zero exit code.
- Preserve human-readable help for explicit `--help` and `report-guide` usage.
- Keep changes transport-light: CLI presentation should improve without changing DART source parsers.

## Non-goals

- Do not add a new DART capability or broaden product scope.
- Do not replace `report-guide` with generated advice.
- Do not expose raw DART viewer identifiers as the default workflow.
- Do not change the neutral toolset or Pi adapter contract unless a CLI improvement requires a reusable copy/metadata field.

## Implementation plan

### 1. Root help on-ramp

Update `src/cli/program.ts` root help text:

- Add a compact common flow:
  1. `search-company --company-name <name>`
  2. `search-company-reports --company-code <companyCode> ...`
  3. `view-report --receipt <filing.receiptNumber-or-viewerUrl>`
  4. `view-report --section-id <toc[].id>` for body retrieval
- Add the stdout contract: JSON response object on success and failure; failures exit non-zero; `--pretty` indents JSON; help and `report-guide` are text.
- Replace the Yahoo Finance analogy with DART-specific wording about read-only replay of observed DART web requests.

### 2. Missing-input failures

Change subcommands that currently print help and exit `0` on empty execution input:

- `search-company`
- `search-company-reports`
- `company-detail`
- `company-rss`
- `view-report`

For normal execution without required input, route into the existing operation validation and emit the standard JSON failure envelope with `exitCode = 1`. Keep explicit `darty <command> --help` as text with exit `0`.

### 3. Commander error recovery

Enrich generic CLI parse failures in `src/cli/command-helpers.ts`:

- Add `recoveryHint` for unknown commands: `Run darty --help to list commands.`
- Add `recoveryHint` for unknown options and invalid option arguments: `Run darty <command> --help for options and examples.`
- Where practical, map option parse failures back to the long option name so JSON includes `parameter` or a CLI-facing option field.
- Add tests for unknown command, unknown option, and invalid integer options.

### 4. `view-report` identifier help

Update `src/cli/commands/view-report.ts` copy sources so help explains the identifier handoff before users hit errors:

- Mark `--receipt` as the required execution input, while still allowing explicit help-only invocation.
- Clarify `--document-id`: use Darty `documents[].id`, not DART `dcmNo`.
- Reword `--toc-depth` from “Print the TOC” to “Include TOC entries to the specified depth.”
- Add one compact workflow example using `filing.receiptNumber`, `documents[].id`, and `toc[].id` from prior JSON output.

### 5. Optional next-command hints

After the error-path improvements land, consider a compatible CLI-only presentation addition: `suggestedNextCommands` for high-value successful outputs.

Initial candidates:

- `search-company`: suggest `company-detail` and `search-company-reports` for the selected `companyCode`.
- `search-company-reports`: suggest `view-report --receipt <receiptNumber>`.
- `view-report` TOC output: suggest `view-report --section-id <toc[].id>`.

Keep this optional until the failure and help UX are stable.

## Validation

Run the repository's existing checks:

```sh
bun run typecheck
bun test
bun run build
```

Add or update CLI tests for:

- Root help contains the common workflow and output contract.
- Empty required subcommand invocation exits non-zero and emits JSON.
- Explicit `--help` still exits `0` and emits text.
- Unknown commands/options include recovery hints.
- `view-report --help` includes Darty identifier wording and revised `--toc-depth` copy.

## Acceptance criteria

- A first-time agent can infer the company-to-report workflow from `darty --help` alone.
- Execution attempts that cannot run because of missing input no longer exit `0`.
- All validation and parse failures use the JSON failure envelope on stdout and include actionable recovery text.
- The happy path documented in `cli-ux/multistep-view-report.md` remains unchanged.
- No DART source parser behavior changes are needed.
