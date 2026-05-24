# CLI validation/error UX findings

Tested local CLI validation with intentionally missing, invalid, and boundary inputs. Commands used `bun run src/cli.ts ...`. I stopped at pre-network validation cases where possible.

## Commands run and representative results

| Command | Exit | Representative output |
| --- | ---: | --- |
| `nope` | 1 | JSON on stdout: `error.code="invalid_request"`, `message="error: unknown command 'nope'"` |
| `search-body --bogus` | 1 | JSON on stdout: `message="error: unknown option '--bogus'"` |
| `search-body --keyword 배당 --start-date 20250101` | 1 | `parameter="endDate"`, `Missing required option "--end-date"...`, recovery hint for real `YYYYMMDD` dates |
| `search-body --keyword 배당 --start-date 2025-01-01 --end-date 20250131` | 1 | `parameter="startDate"`, `must use YYYYMMDD format` |
| `search-body --keyword 배당 --start-date 20250230 --end-date 20250301` | 1 | `parameter="startDate"`, `must be a real date... "20250230" is not a valid date` |
| `search-body --keyword 배당 --start-date 20250131 --end-date 20250101` | 1 | `startDate cannot be after endDate...` |
| `search-body ... --sort-by foo` | 1 | `parameter="sortBy"`, allowed values `date, reportName` |
| `search-body ... --page 0` | 1 | `parameter="page"`, range `1 and 100`, recovery hint included |
| `search-body ... --page abc` | 1 | `message="error: option '--page <number>' argument 'abc' is invalid..."`; no `parameter` |
| `search-body ... --company-code 005930` | 1 | `parameter="companyCode"`, explains 8-digit DART code required and suggests `search-company` first |
| `search-company` | 0 | Printed command help, not JSON error, despite missing required `--company-name` |
| `search-company --company-name 삼` | 1 | `parameter="companyName"`, minimum 2 chars |
| `search-company --company-name 삼성 --page-size 46` | 1 | `parameter="pageSize"`, max 45 |
| `search-company --company-name 삼성 --page-size abc` | 1 | Commander parse error in JSON message; no `parameter` |
| `disclosure-types --category K` | 1 | `parameter="category"`, category must be `A` through `J` |
| `disclosure-types --category a` | 0 | Succeeds and normalizes to `A` |
| `search-company-reports` | 0 | Printed command help, not JSON error, despite missing required options |
| `search-company-reports --company-code 005930 --start-date 20250101 --end-date 20250131` | 1 | 8-digit DART company code required; suggests `search-company` |
| `search-company-reports --company-code 00126380 --start-date 20100101 --end-date 20250131` | 1 | 10-year limit, includes earliest allowed start date and split-window hint |
| `search-company-reports ... --page-size 16` | 1 | allowed values `5, 10, 15, 30, 50, 100` |
| `search-company-reports ... --closing-accounts-month 13` | 1 | use `all` or `01` through `12` |
| `search-company-reports ... --corporation-type Z` | 1 | allowed values with Korean labels |
| `search-company-reports ... --disclosure-type BAD` | 1 | suggests `disclosure-types --query <term>` and using report title text in `reportName` |
| `view-report` | 0 | Printed command help, not JSON error, despite missing required `--receipt` |
| `view-report --section-id section:1` | 1 | `parameter="receipt"`, says pass receiptNumber or viewerUrl from search results |
| `view-report --receipt abc` | 1 | receipt must be 14-digit number or viewer URL containing `rcpNo` |
| `view-report --receipt 20250101000000 --output-format pdf` | 1 | `parameter="outputFormat"`, expected `html` or `markdown` |
| `view-report --receipt 20250101000000 --max-bytes 999` | 1 | range `1,000` to `1,000,000`, recovery hint included |
| `view-report --receipt 20250101000000 --max-bytes abc` | 1 | Commander parse error in JSON message; no `parameter` |
| `view-report --receipt 20250101000000 --content-start-byte -1` | 1 | parse error says expected integer `>= 0`; no `parameter` |
| `company-detail` / `company-rss` | 0 | Printed command help, not JSON error, despite missing required `--company-code` |
| `company-detail --company-code 005930` / `company-rss --company-code 005930` | 1 | 8-digit DART company code required; suggests `search-company` |

`--pretty` also formats validation errors as indented JSON, which is helpful for human inspection.

## What was clear

- Most validation failures produce a consistent JSON envelope on stdout with `result:null`, `error.code`, `message`, `retryable:false`, and often `parameter` plus `recoveryHint`.
- Date errors are especially actionable: bad format, impossible dates, reversed ranges, and 10-year `search-company-reports` ranges all explain the exact fix.
- Company-code errors are agent-friendly because they distinguish DART 8-digit company codes from 6-digit stock codes and point to `search-company`.
- Help text is strong: required options, examples, search tips, and follow-up workflows are usually enough to recover.
- Domain-specific validators (`disclosure-type`, `closing-accounts-month`, `corporation-type`) list acceptable values or the next lookup command.

## What was confusing

- Running several commands with no options exits `0` and prints help instead of returning a JSON validation error: `search-company`, `search-company-reports`, `view-report`, `company-detail`, `company-rss`. For an agent, this can look successful unless it inspects output text.
- Commander parse errors are wrapped in JSON but often omit `parameter` and `recoveryHint` (`--page abc`, `--max-bytes abc`, `--content-start-byte -1`, unknown command/option).
- Unknown command/option errors do not include a recovery hint such as `run darty --help` or the nearest command/option suggestion.
- JSON errors are emitted to stdout and stderr is empty. This matches the README’s JSON-response contract, but agents expecting failures on stderr may miss diagnostics.
- Some allowed values are not normalized consistently from the user’s perspective: `disclosure-types --category a` normalizes to `A`, while enum-like values such as `--sort-by` and `--output-format` reject invalid/lower/other forms without recovery hints.

## Smallest improvements

1. For missing required options on command invocation, prefer non-zero JSON validation errors over exit-0 help, or add a machine-readable marker that help was shown because required input is missing.
2. Add `parameter` and `recoveryHint` to Commander parse errors and unknown command/option errors.
3. For unknown commands/options, include `recoveryHint: "Run darty --help or darty <command> --help"`; optionally include nearest suggestions.
4. Consider documenting prominently that CLI JSON errors are on stdout and stderr is intentionally empty.
5. Add `exampleInput` or command examples to the JSON error object for high-frequency recovery paths such as missing receipt, company code lookup, and date ranges.
