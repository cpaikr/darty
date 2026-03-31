# AGENTS.md

## Scope
- This repo is for the `darty` DART access tool. The current tree is mostly vision, research, and tool-contract documents.
- Treat repository documents as the source of truth. Do not invent implementation details, commands, or package structure that the repo does not already define.

## Read Order
- Start with [README.md](/Users/sejunpark/IT/darty/README.md).
- Read [VISION.md](/Users/sejunpark/IT/darty/VISION.md), [ROADMAP.md](/Users/sejunpark/IT/darty/ROADMAP.md), [TODO.md](/Users/sejunpark/IT/darty/TODO.md), and [PLAN.md](/Users/sejunpark/IT/darty/PLAN.md) in that order for current product and planning context.
- Use [ARCHITECTURE.md](/Users/sejunpark/IT/darty/ARCHITECTURE.md) for document ownership and placement rules.

## Working Rules
- Keep diffs small and reviewable. Prefer editing the canonical document over repeating guidance elsewhere.
- Put strategic sequencing in [ROADMAP.md](/Users/sejunpark/IT/darty/ROADMAP.md), the near-term queue in [TODO.md](/Users/sejunpark/IT/darty/TODO.md), and the active execution plan in [PLAN.md](/Users/sejunpark/IT/darty/PLAN.md).
- Record live DART investigation in [docs/research/dart-source-map.md](/Users/sejunpark/IT/darty/docs/research/dart-source-map.md).
- Promote only stable, evidence-backed capability decisions into [docs/specs/](/Users/sejunpark/IT/darty/docs/specs/README.md).
- Keep shared tool-design guidance in [docs/tools/](/Users/sejunpark/IT/darty/docs/tools/foundations.md) and link to canonical docs instead of duplicating rules.
- Mark source claims as observed, inferred, or unverified when the distinction matters.

## Commands And Validation
- No package manager, build, lint, format, or test commands are defined in this repo yet.
- Do not add placeholder workflow commands to docs or instructions. If implementation scaffolding is added later, document only commands that exist in the repo.

## Change Expectations
- Update nearby planning or research docs in the same change when the scope, evidence, or contract changes.
- Keep writing concise. Preserve necessary detail, but avoid restating the same point across multiple files.
