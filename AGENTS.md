# AGENTS.md

## Writing baseline

- Be concise but clear. Preserve necessary detail with the fewest words that keep meaning intact.
- Avoid repetition unless it materially improves clarity.

## Default approach

- Build context incrementally. Start at the repo root, nearby docs, and module entry points; load only the files needed for the current task.
- When library or framework behavior matters, prefer inspecting source over secondary docs.
- Refactor before extending when the current structure fights the change.
- Prefer simple, explicit code for stateless collaborators over clever abstractions.
- Be conservative with dependencies. Add one only for durable complexity the project should not own.

## Code rules

- Type boundaries strictly. Make invalid states unrepresentable with the simplest types available.
- Keep schemas minimal. Add fields only for current behavior.
- Treat naming as a design tool. A signature should make obvious what a function does, takes, and returns.
- Model errors explicitly. Do not swallow errors or hide them behind broad catch-all handling.
- Treat logs as production diagnostics. Log decision points with structured context.
- Document why, tradeoffs, invariants, and non-obvious flow near the code.

## Changes

- Use the repo's existing build, lint, format, and test commands; do not invent new workflow conventions unless asked.
- Treat tests as executable specs. Prefer user-facing or integration-style coverage over implementation-coupled tests.
- For behavior changes, update tests and colocated docs in the same change.
- Prefer reviewable chunks over large implementations.
- After implementing code, do a pass for design flaws exposed by the concrete solution.
- For tracked renames, use `git mv`.
- For JavaScript and TypeScript package tooling, prefer `bun` over `pnpm`, and `pnpm` over `npm` unless the project explicitly requires otherwise.
- Persist important decisions in code, docs, or commit messages; do not rely on chat history.

## Planning docs

- Keep planning state in repo Markdown files rather than chat history.
- Use `ROADMAP.md` for strategic direction, phased sequencing, and intentional deferrals.
- Use `TODO.md` for the ordered near-term queue of concrete candidate tasks.
- Use `PLAN.md` for one active detailed plan.
- Avoid repeating the same task across all three files.

## Communication

- Lead with the answer or next action.
- Keep progress updates brief, factual, and free of filler.
- State what is gained and what is lost when tradeoffs matter.
- Ask concise clarifying questions when intent, scope, or prioritization is materially unclear.
