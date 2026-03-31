# darty

Markdown-first guidance for building a DART access tool.

This repo starts from first principles: define the product, investigate the live source, and only then lock the tool contract. The target is broader and messier than a single endpoint: `https://dart.fss.or.kr/`, especially the integrated filing search and report viewer flows.

## Core Stance

- Start from agent tasks, not from page clicks.
- Treat `dart.fss.or.kr` as the source of truth for v1.
- Optimize for structured, traceable, bounded results with stable filing and section references.
- Keep v1 read-only and citation-first.
- Start from `공시통합검색 > 본문내용`, not from the full DART feature surface.

## Read In This Order

1. [VISION.md](VISION.md)
   Product-level goal and scope for the current project.
2. [ROADMAP.md](ROADMAP.md)
   Strategic sequencing from investigation to implementation.
3. [TODO.md](TODO.md)
   Ordered near-term work queue.
4. [PLAN.md](PLAN.md)
   Detailed plan for the one active job.
5. [docs/research/dart-source-map.md](docs/research/dart-source-map.md)
   Current evidence about DART body-content search and the report viewer surface.
6. [docs/specs/dart-body-search-v1.md](docs/specs/dart-body-search-v1.md)
   First concrete spec draft for replaying `본문내용` search.
7. [docs/tools/foundations.md](docs/tools/foundations.md)
   Core principles for tool design.
8. Tool track:
   [docs/tools/contracts.md](docs/tools/contracts.md), [docs/tools/transport-decision.md](docs/tools/transport-decision.md), [docs/tools/evaluation.md](docs/tools/evaluation.md)
9. Templates:
   [docs/tools/templates/tool-spec-template.md](docs/tools/templates/tool-spec-template.md)
10. Relevant tool playbook in [docs/tools/playbooks/](docs/tools/playbooks/)
   Tool-family-specific guidance.

## Repo Map

- [ARCHITECTURE.md](ARCHITECTURE.md): document ownership and contributor flow
- [VISION.md](VISION.md): product vision for the DART access tool
- [ROADMAP.md](ROADMAP.md): strategic direction and phased sequencing
- [TODO.md](TODO.md): ordered near-term work queue
- [PLAN.md](PLAN.md): the one active detailed plan
- [docs/research/dart-source-map.md](docs/research/dart-source-map.md): captured source evidence and initial complexity map
- [docs/specs/dart-body-search-v1.md](docs/specs/dart-body-search-v1.md): first narrow spec for `본문내용` search
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
- `본문내용` search returns HTML fragments, not a clean JSON payload.
- Filing retrieval uses multiple identifier spaces such as receipt numbers, document numbers, element ids, offsets, and lengths.
- Search results and section retrieval are separate contracts that must be stitched together carefully.

The first job is not broad implementation. It is locking a credible v1 around body-content filing search and deterministic follow-on retrieval.

## Implementation Baseline

- runtime and package manager: `bun`
- language: strict TypeScript
- application model: `effect`
- HTML parsing: `cheerio`
- browser automation: deferred unless the live contract stops being replayable

## Current Entry Point

```bash
bun install
bun run typecheck
bun test
bun run src/cli.ts search --query 배당 --start-date 20250331 --end-date 20260331
```
