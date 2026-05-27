# Test and Eval Refactor Plan

## Current Status

This refactor is implemented. The repo now separates implementation tests from scenario evals, has shared eval harness utilities, treats the public Pi single-tool surface as a first-class eval target, and includes judged research-answer evals with deterministic trace checks.

Completed in this pass:

- extracted shared eval harness code under `evals/harness/` for OpenAI chat loops, model-tool loops, tool traces, truncation, artifacts, JSON helpers, and reporting;
- added model-eval JSON artifacts under `.tmp/evals/<suite>/<timestamp>/<scenario-id>.json`;
- created transport-independent scenarios under `evals/scenarios/` for search-body, filing workflows, recovery, and research answers;
- added reusable CLI, typed-agent, and public Pi single-tool surface modules under `evals/surfaces/`;
- added Pi suites for search-body, workflow, validation/recovery, and research-answer coverage under `evals/suites/`;
- added deterministic workflow assertions for identifier handoff, ordering, no-result behavior, returned-reference citations, and anti-invention checks;
- added versioned final-answer judge/rubric files under `evals/judges/`;
- preserved model-eval artifacts when the judge returns malformed JSON;
- documented the eval architecture, surface matrix, assertion policy, artifact format, scripts, manual Pi gate policy, default-vs-exploratory model-family policy, and judged final-answer pass threshold;
- hardened Pi model eval prompts, judge evidence summaries, recovered-call assertions, and OpenAI retry handling so the manual Pi gate is usable against live model/source variance.

Remaining follow-ups:

- add a `toolset-host` eval surface only if an external host wrapper needs model-in-the-loop coverage.

## Goal

Keep one clear boundary:

- tests verify implementation contracts, source parsing, package integrity, and adapter mechanics;
- evals verify whether fixed commands or agents can use exposed Darty surfaces to complete realistic DART tasks.

## Principles

- Keep colocated `src/**/*.test.ts` for implementation-level contracts and parser fixtures.
- Keep opt-in live DART drift checks under `test/live/`.
- Keep package/export smoke checks under `test/package/`.
- Keep eval scenarios independent from transport surfaces.
- Treat public surfaces as first-class eval targets: CLI and Pi now; future surfaces only when active.
- Keep deterministic assertions for objective facts: tool names, arguments, identifiers, ordering, envelopes, returned references, and no-result behavior.
- Use an LLM judge only for subjective final-answer quality.
- Persist model-eval artifacts so failures can be debugged without rerunning.

## Current Layout

```text
evals/
  README.md
  scenarios/
    search-body.ts
    filing-workflows.ts
    research-answers.ts
    recovery.ts
  harness/
    model-loop.ts
    openai-chat.ts
    tool-trace.ts
    artifacts.ts
    reporter.ts
    json.ts
  surfaces/
    cli/
      fixed-cli-runner.ts
      agent-cli-tool.ts
      assertions.ts
    pi/
      pi-single-tool.ts
      assertions.ts
      assertions.test.ts
    typed-agent/
      typed-darty-tools.ts
      assertions.ts
  judges/
    final-answer-judge.ts
    rubrics.ts
  suites/
    search-body-pi.eval.ts
    workflow-pi.eval.ts
    recovery-pi.eval.ts
    research-answer-pi.eval.ts
  search-body/
    cli/
    agent-cli/
    agent-native/
    shared/
  workflows/
    agent-native/
```

`search-body/` and `workflows/` keep the staged legacy runners while shared eval code lives in `harness/`, `scenarios/`, and `surfaces/`.

## Commands

Fixed CLI eval, no OpenAI key required:

```bash
bun run eval:cli:search-body
```

Model-in-the-loop evals require `OPENAI_API_KEY` through the environment, usually via `varlock`:

```bash
bun run env:check
bun run eval:agent-cli:search-body
bun run eval:typed:search-body
bun run eval:typed:workflow
bun run eval:pi:search-body
bun run eval:pi:workflow
bun run eval:pi:recovery
bun run eval:pi:research-answer
bun run eval:pi:gate
```

Legacy names remain available during the staged refactor:

```bash
bun run eval:search-body:cli
bun run eval:search-body:agent:cli
bun run eval:search-body:agent:native
bun run eval:workflows:agent:native
```

## Coverage Matrix

| Capability / flow | CLI fixed | Agent CLI | Pi single tool | Typed internal | Final answer judge |
|---|---:|---:|---:|---:|---:|
| `search-body` basic | yes | yes | yes | yes | no |
| company name → code | no | optional | yes | yes | no |
| company code → reports | no | optional | yes | yes | no |
| report open / TOC | no | optional | yes | yes | no |
| section retrieval | no | no | yes | yes | maybe |
| no-result handling | yes | yes | yes | yes | maybe |
| validation/recovery from bad input | no | maybe | yes | optional | no |
| realistic research answer | no | no | yes | optional | yes |

## Assertion Policy

Deterministic assertions own objective facts:

- tool/action/command names;
- input keys and normalized values;
- company codes, receipt numbers, viewer URLs, document IDs, and section IDs;
- call ordering and identifier handoff;
- success/failure envelopes, warnings, and no-result item counts;
- whether a final answer cites a concrete reference returned by tool evidence;
- whether a final answer invents filing references after an empty source result.

The LLM judge owns only subjective final-answer quality: whether the answer addresses the business question, cites returned evidence, avoids unsupported claims, distinguishes missing evidence from negative facts, and avoids investment/legal/accounting advice.

## Non-Goals

- Do not reintroduce MCP evals unless MCP becomes an active supported surface again.
- Do not replace deterministic assertions with LLM judges for objective tool-call or JSON-shape checks.
- Do not move colocated implementation tests out of `src/` just to centralize all tests.
- Do not require final-answer judge evals for every low-level tool capability.

## Decisions

- Keep the typed `darty_*` tool surface as an internal diagnostic/control harness. The public reusable surfaces are the neutral toolset API, CLI, and Pi single-tool adapter.
- Keep Pi model evals pointed at the source TypeScript adapter for fast local iteration. Distribution realism is covered by deterministic package export smoke tests; add a packed-package Pi eval only if the packaging seam itself becomes a recurring source of failures.
