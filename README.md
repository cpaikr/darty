# darty

Markdown-first guidance for building a DART access tool.

This repo starts the same way as `../kasb`: define the product, investigate the live source, and only then lock the tool contract. The target, though, is broader and messier: `https://dart.fss.or.kr/` plus the adjacent `https://opendart.fss.or.kr/` surface.

## Core Stance

- Start from agent tasks, not from page clicks.
- Treat `dart.fss.or.kr` and `opendart.fss.or.kr` as source surfaces to evaluate, not assumptions to bake in.
- Optimize for structured, traceable, bounded results with stable filing and section references.
- Keep v1 read-only and citation-first.

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
   Current evidence about DART, OpenDART, and the report viewer surface.
6. [docs/tools/foundations.md](docs/tools/foundations.md)
   Core principles for tool design.
7. Tool track:
   [docs/tools/contracts.md](docs/tools/contracts.md), [docs/tools/transport-decision.md](docs/tools/transport-decision.md), [docs/tools/evaluation.md](docs/tools/evaluation.md)
8. Templates:
   [docs/tools/templates/tool-spec-template.md](docs/tools/templates/tool-spec-template.md)
9. Relevant tool playbook in [docs/tools/playbooks/](docs/tools/playbooks/)
   Tool-family-specific guidance.

## Repo Map

- [ARCHITECTURE.md](ARCHITECTURE.md): document ownership and contributor flow
- [VISION.md](VISION.md): product vision for the DART access tool
- [ROADMAP.md](ROADMAP.md): strategic direction and phased sequencing
- [TODO.md](TODO.md): ordered near-term work queue
- [PLAN.md](PLAN.md): the one active detailed plan
- [docs/research/dart-source-map.md](docs/research/dart-source-map.md): captured source evidence and initial complexity map
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

## Why This Is Harder Than kasb

- DART spans at least two public surfaces with different contracts and access models.
- The main site is a server-rendered application with `.do` and `.ax` endpoints, popup flows, and embedded viewer state.
- Filing retrieval uses multiple identifier spaces such as receipt numbers, document numbers, element ids, offsets, and lengths.
- OpenDART adds a cleaner API surface, but likely with auth and coverage differences.

The first job is not implementation. It is choosing a credible v1 boundary.
