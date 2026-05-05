# darty

Markdown-first guidance for building a DART access tool.

This repo starts from first principles: define the product, investigate the live source, and only then lock the tool contract. The target is broader and messier than a single endpoint: `https://dart.fss.or.kr/`, especially the `dsab007` integrated filing search and report viewer flows.

## Core Stance

- Start from agent tasks, not from page clicks.
- Treat `dart.fss.or.kr` as the source of truth for v1.
- Optimize for structured, traceable, bounded results with stable filing and section references.
- Keep v1 read-only and citation-first.
- Treat `dsab007` integrated filing search as the first major surface.
- Implement one mode at a time under that shared surface, starting with `본문내용`.

## Read In This Order

1. [VISION.md](VISION.md)
   Product-level goal and scope for the current project.
2. [docs/research/dart-source-map.md](docs/research/dart-source-map.md)
   Current evidence about DART body-content search and the report viewer surface.
3. [docs/specs/dsab007-search-v1.md](docs/specs/dsab007-search-v1.md)
   First concrete spec draft for `dsab007` search, with `본문내용` as the first implemented mode.
4. [docs/tools/foundations.md](docs/tools/foundations.md)
   Core principles for tool design.
5. Tool track:
   [docs/tools/contracts.md](docs/tools/contracts.md), [docs/tools/transport-decision.md](docs/tools/transport-decision.md), [docs/tools/evaluation.md](docs/tools/evaluation.md)
6. Templates:
   [docs/tools/templates/tool-spec-template.md](docs/tools/templates/tool-spec-template.md)
7. Relevant tool playbook in [docs/tools/playbooks/](docs/tools/playbooks/)
   Tool-family-specific guidance.

## Repo Map

- [ARCHITECTURE.md](ARCHITECTURE.md): document ownership and contributor flow
- [VISION.md](VISION.md): product vision for the DART access tool
- [docs/research/dart-source-map.md](docs/research/dart-source-map.md): captured source evidence and initial complexity map
- [docs/specs/dsab007-search-v1.md](docs/specs/dsab007-search-v1.md): first `dsab007` search spec
- `evals/`: scenario evals where fixed commands or a model use the current capability through CLI/MCP
- [docs/specs/](docs/specs/README.md): stable capability specs once the evidence exists
- [docs/tools/foundations.md](docs/tools/foundations.md): what makes a good agent tool
- [docs/tools/contracts.md](docs/tools/contracts.md): input, output, references, and errors
- [docs/tools/transport-decision.md](docs/tools/transport-decision.md): when to use CLI, MCP, or both
- [docs/tools/evaluation.md](docs/tools/evaluation.md): how to measure real tool usefulness
- [docs/tools/lifecycle.md](docs/tools/lifecycle.md): recommended tool build sequence
- [docs/tools/portfolio.md](docs/tools/portfolio.md): shared conventions across a tool portfolio
- [docs/tools/playbooks/site-data-tool.md](docs/tools/playbooks/site-data-tool.md): site/API data tool guidance
- [docs/tools/playbooks/pdf-tool.md](docs/tools/playbooks/pdf-tool.md): PDF tool guidance
- [docs/tools/playbooks/excel-tool.md](docs/tools/playbooks/excel-tool.md): spreadsheet tool guidance
- [docs/tools/playbooks/filesystem-tool.md](docs/tools/playbooks/filesystem-tool.md): workspace tool guidance
- [docs/tools/templates/tool-spec-template.md](docs/tools/templates/tool-spec-template.md): spec template for new tools

## Why This Is Hard

- The main site is a server-rendered application with `.do` and `.ax` endpoints, popup flows, and embedded viewer state.
- `dsab007` search returns HTML fragments, not a clean JSON payload.
- Filing retrieval uses multiple identifier spaces such as receipt numbers, document numbers, element ids, offsets, and lengths.
- Search modes share one DART surface, but their row shapes and filters are not identical.
- Search results and section retrieval are separate contracts that must be stitched together carefully.

The first job is not broad implementation. It is locking a credible `dsab007` search core with `본문내용` as the first implemented mode.

Current implementation stance:

- public capability contract first
- internal `dsab007` replay adapter second
- one public result envelope that keeps references and source evidence explicit without exposing replay fields as the default API

## Implementation Baseline

- runtime and package manager: `bun`
- language: strict TypeScript
- application model: `effect`
- HTML parsing: `cheerio`
- browser automation: deferred unless the live contract stops being replayable

## CLI Usage

```bash
bunx @sjunepark/darty contents-search --help
bunx @sjunepark/darty contents-search --keyword 배당 --start-date 20250331 --end-date 20260331
```

Or install it globally:

```bash
bun add -g @sjunepark/darty
darty contents-search --keyword 배당 --start-date 20250331 --end-date 20260331
```

## Current Entry Point

```bash
bun install
bun run typecheck
bun test
bun run test:live
bun run src/cli.ts contents-search --help
bun run src/cli.ts contents-search --keyword 배당 --start-date 20250331 --end-date 20260331
bun run mcp
bun run env:check
bun run eval:contents:cli
bun run eval:contents:agent:cli
bun run eval:contents:agent:mcp
```

## Environment Setup

This repo uses `varlock` for local env management.

1. Create `.env.local` in the repo root and fill in your real API key:

```bash
OPENAI_API_KEY=
```

2. Validate the env setup:

```bash
bun run env:check
```

3. Run evals:

```bash
bun run eval:contents:cli
bun run eval:contents:agent:cli
bun run eval:contents:agent:mcp
```

The MCP eval script keeps Promptfoo state in the repo-local `.promptfoo/` directory instead of `~/.promptfoo`, which avoids home-directory sandbox write issues.
