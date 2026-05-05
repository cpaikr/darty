# darty

A Bun CLI for searching Korean DART filings.

`darty` provides read-only, structured access to DART search surfaces. The current release supports DART filing body-content search through the `contents-search` command.

## Requirements

- [Bun](https://bun.sh/)

## Quick Start

Run without installing:

```bash
bunx @sjunepark/darty contents-search \
  --keyword 배당 \
  --start-date 20250331 \
  --end-date 20260331
```

Or install globally:

```bash
bun add -g @sjunepark/darty

darty contents-search \
  --keyword 배당 \
  --start-date 20250331 \
  --end-date 20260331
```

## Commands

### `contents-search`

Search DART filing body contents and print structured JSON to stdout.

```bash
darty contents-search --keyword <text> --start-date <YYYYMMDD> --end-date <YYYYMMDD>
```

Required options:

- `--keyword <text>`: body-content search keyword
- `--start-date <YYYYMMDD>`: inclusive receipt start date
- `--end-date <YYYYMMDD>`: inclusive receipt end date

Optional filters:

- `--page <number>`: 1-based results page, default `1`
- `--sort-by <date|reportName>`: sort field, default `date`
- `--sort-direction <asc|desc>`: sort direction, default `desc`
- `--company-code <text>`: DART company code
- `--presenter-name <text>`: presenter name
- `--report-name <text>`: report title filter

Show command help:

```bash
darty contents-search --help
```

## Example

```bash
darty contents-search \
  --keyword 배당 \
  --start-date 20250331 \
  --end-date 20260331 \
  --company-code 01368637 \
  --sort-by reportName
```

The command writes one JSON payload containing normalized result fields, DART references, source evidence, and warnings when DART response rows are partially recoverable.

## Notes

- This tool is read-only.
- It uses public DART web search behavior and may be affected by upstream DART changes.
- The current public CLI exposes semantic options only; internal DART replay fields are intentionally not part of the CLI contract.
