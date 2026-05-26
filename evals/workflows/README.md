# Workflow Evals

These evals cover multi-step DART research tasks that require chaining more than one `darty_*` tool. They complement the narrower `search-body` evals, which validate a single capability and its transport boundaries.

## Agent-native workflow track

`agent-native/run-eval.ts` evaluates the internal typed `darty_*` control surface. `../suites/workflow-pi.eval.ts` evaluates the public Pi single-tool surface for the same semantic workflow scenarios.

Both tracks check whether the model can:

- find a company code from a company name before company-specific searches;
- search company filings and carry a returned receipt/viewer URL into `view-report`;
- narrow to annual reports with source-shaped DART filters such as `A001` or report-title text;
- retrieve a report TOC and use a returned `sectionId` for a section window;
- open a filing returned by body-text search;
- preserve no-result behavior without inventing filing references.

Each scenario reports deterministic metrics:

- tool-call count;
- failed tool-call count;
- repeated-call retry proxy;
- runtime;
- stdout byte and character counts as output-size/token proxies.

The assertions check tool choice, important input parameters, result shape, identifier handoff between calls, and no-result item counts. They do not use an LLM judge.

## Running

Create `.env.local` with `OPENAI_API_KEY`, then run:

```bash
bun run eval:workflows:agent:native
bun run eval:pi:workflow
```

Set `OPENAI_MODEL` to override the default model.
