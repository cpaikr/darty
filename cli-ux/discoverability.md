# Darty CLI discoverability review

Perspective: first-time coding agent. I inspected only `README.md` and `package.json`, then exercised local CLI help/error flows from the repo root.

## Commands run

| Command | Exit |
| --- | ---: |
| `bun run src/cli.ts --help` | 0 |
| `bun run src/cli.ts search-body --help` | 0 |
| `bun run src/cli.ts search-company --help` | 0 |
| `bun run src/cli.ts search-company-reports --help` | 0 |
| `bun run src/cli.ts company-detail --help` | 0 |
| `bun run src/cli.ts company-rss --help` | 0 |
| `bun run src/cli.ts disclosure-types --help` | 0 |
| `bun run src/cli.ts report-guide --help` | 0 |
| `bun run src/cli.ts view-report --help` | 0 |
| `bun run src/cli.ts` | 0 |
| `bun run src/cli.ts search-company` | 0 |
| `bun run src/cli.ts company-detail` | 0 |
| `bun run src/cli.ts view-report` | 0 |
| `bun run src/cli.ts nope --help` | 0 |
| `bun run src/cli.ts nope` | 1 |
| `bun run src/cli.ts search-company --company-name A` | 1 |
| `bun run src/cli.ts search-company-reports --company-code 00126380` | 1 |

## What is clear

- Command names are mostly discoverable: `search-company`, `search-company-reports`, `view-report`, and `disclosure-types` describe their jobs well.
- Required options are marked in command help, and examples are practical enough to copy.
- Search tips are agent-friendly, especially the workflow hints: use `search-company` before company-code searches, pass `receiptNumber`/`viewerUrl` to `view-report`, use `disclosure-types` for detailed codes.
- `view-report` help does a good job explaining pagination/window continuation and warning that section IDs are report-specific.
- README sets the important output contract: most commands return JSON on stdout; help and `report-guide` are text.

## Confusing or missing discoverability

- Root help does not show the common agent workflow. A first-time agent can see available commands but not the shortest path from company name or keyword to report body.
- Root help does not state the CLI output promise. The JSON-on-stdout behavior is in README, but not visible from `darty --help`.
- Running a subcommand with required options omitted, such as `search-company`, prints command help and exits `0`. That is helpful for humans, but misleading for agents that treat exit `0` as successful execution.
- `darty nope --help` prints root help and exits `0`, hiding the unknown command. `darty nope` correctly exits `1` with a JSON error.
- `view-report --receipt` is not marked `[required]`, even though the command description says it fetches by receipt number or viewer URL and the no-arg command only prints help.
- The root caution phrase “Yahoo Finance-style replay” is unexpected in a DART tool. It communicates “web-observed calls,” but the Yahoo Finance analogy may distract agents.
- Error JSON is useful, but some validation failures lack next-step recovery guidance. Example: `--company-name A` says the value is too short, but gives no example retry.

## Smallest concrete improvements

1. Add a short root-help workflow block:

   ```text
   Common agent flow:
     1. Find a company code: darty search-company --company-name 삼성전자
     2. Search filings: darty search-company-reports --company-code 00126380 --start-date YYYYMMDD --end-date YYYYMMDD
     3. Inspect a filing: darty view-report --receipt <receiptNumber-or-viewerUrl>
     Use search-body for document-level keyword search and disclosure-types for --disclosure-type codes.
   ```

2. Add root-help output contract text:

   ```text
   Output: commands print a JSON response object to stdout on success and failure; failures exit non-zero. Use --pretty for indented JSON. Help and report-guide print human-readable text.
   ```

3. Keep root no-arg help as exit `0`, but make subcommands missing required execution input exit `1` with the existing JSON error shape plus `recoveryHint: "Run darty <command> --help for options and examples."`

4. Make `darty <unknown> --help` exit `1` or print an explicit line before root help:

   ```text
   Unknown command: nope
   Run darty --help to list commands.
   ```

5. Mark `view-report --receipt <receipt-or-url>` as `[required]` if execution always needs it, or explain no-arg behavior if the command intentionally supports help-only discovery.

6. Replace the Yahoo analogy with DART-specific wording:

   ```text
   This tool replays read-only DART web requests observed during browser interaction.
   ```

7. Add compact recovery hints to validation errors where the retry is obvious, for example company-name length:

   ```json
   "recoveryHint": "Use at least 2 Korean/English characters, for example --company-name 삼성전자."
   ```
