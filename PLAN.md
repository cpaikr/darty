# Test and Eval Refactor Plan

## Goal

Reorganize tests and evals around one boundary:

- tests verify implementation contracts, source parsing, package integrity, and adapter mechanics;
- evals verify whether agents can use the actual exposed Darty surfaces to complete realistic DART tasks.

The main missing coverage is model-in-the-loop evals for the public Pi single-tool surface, plus final-answer research evals that judge whether an agent can produce useful, cited answers from DART evidence.

## Target Principles

- Keep colocated `src/**/*.test.ts` for implementation-level contracts and parser fixtures.
- Keep opt-in live DART drift checks under `test/live/`.
- Keep package/export smoke checks under `test/package/`.
- Make eval scenarios independent from transport surfaces.
- Treat public surfaces as first-class eval targets: CLI and Pi now; future surfaces only when active.
- Keep deterministic assertions for objective facts: tool names, arguments, identifiers, ordering, envelopes, and no-result behavior.
- Use an LLM judge only for subjective final-answer quality.
- Persist model-eval artifacts so failures can be debugged without rerunning.

## Target Layout

```text
test/
  live/
    dart-source/
      dsab007-contents.test.ts
      dsab007-company-reports.test.ts
      dsaf001-view-report.test.ts
  cli/
    cli-entrypoints.test.ts
    search-body-cli.test.ts
  package/
    package-exports.test.ts
    pi-tool-type-smoke.ts

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
    typed-agent/
      typed-darty-tools.ts
      assertions.ts
    toolset-host/
      toolset-single-tool.ts
      assertions.ts
  judges/
    final-answer-judge.ts
    rubrics.ts
  suites/
    search-body-cli.eval.ts
    search-body-agent-cli.eval.ts
    search-body-pi.eval.ts
    workflow-pi.eval.ts
    workflow-typed-agent.eval.ts
    recovery-pi.eval.ts
    research-answer-pi.eval.ts
```

This is a target shape, not a requirement to move every file in one commit. Prefer staged, passing refactors.

## Phase 1: Preserve Current Behavior While Extracting Shared Eval Harness

1. Create `evals/harness/` for reusable model-loop and reporting code.
2. Move duplicated OpenAI chat calls out of `search-body/agent-cli` and `search-body/agent-native`.
3. Move shared tool execution trace types, truncation, JSON parsing helpers, and model-loop logic into `evals/harness/`.
4. Add artifact writing for every model eval under an ignored path such as `.tmp/evals/<suite>/<timestamp>/<scenario-id>.json`.
5. Keep current suite commands passing during extraction:
   - `bun run eval:search-body:cli`
   - `bun run eval:search-body:agent:cli`
   - `bun run eval:search-body:agent:native`
   - `bun run eval:workflows:agent:native`

Acceptance criteria:

- Existing eval behavior is unchanged.
- Every model-in-the-loop eval emits a concise console summary and a detailed JSON artifact.
- Shared code is no longer semantically owned by `search-body` when it applies to all evals.

## Phase 2: Decouple Scenarios From Surfaces

1. Create `evals/scenarios/` with pure task definitions.
2. Move current search-body scenarios into `evals/scenarios/search-body.ts`.
3. Move current workflow scenarios into `evals/scenarios/filing-workflows.ts`.
4. Keep scenario fields focused on task intent and expected facts, not argv or one specific adapter.
5. Let each surface adapter derive its prompt/tool shape from the same scenario.

Acceptance criteria:

- Search-body CLI, agent CLI, and typed-agent evals can reuse the same semantic scenario definitions.
- Scenario files do not depend on CLI argv unless the scenario is explicitly fixed-CLI-only.

## Phase 3: Make Public Surfaces First-Class

1. Create `evals/surfaces/cli/` for fixed CLI and agent CLI wrappers.
2. Create `evals/surfaces/pi/` for the public Pi single-tool adapter:
   - tool name: `darty`
   - input shape: `action`, `command`, `inputJson`
   - actions: `help`, `command_help`, `validate`, `run`
3. Keep `evals/surfaces/typed-agent/` as a diagnostic/control surface for direct `darty_*` tools.
4. Optionally add `evals/surfaces/toolset-host/` only if external host wrapping of `createDartyToolset()` needs model-in-the-loop coverage.

Acceptance criteria:

- Pi single-tool evals run against `createDartyPiTool()` or the same public adapter path exported by the package.
- Typed-agent evals are clearly documented as internal/reference coverage, not proof that the public Pi surface works.

## Phase 4: Add Pi Single-Tool Evals

Add these suites:

- `evals/suites/search-body-pi.eval.ts`
- `evals/suites/workflow-pi.eval.ts`
- `evals/suites/recovery-pi.eval.ts`

The Pi evals should check that the model can:

- discover operations through `help` or `command_help` when needed;
- use canonical command names such as `search-company-reports` and `view-report`;
- pass valid `inputJson`;
- use `validate` or recover from validation failures when relevant;
- chain identifiers from one result into the next command;
- avoid invented receipt numbers and viewer URLs on no-result paths.

Acceptance criteria:

- At least one Pi eval covers simple `search-body`.
- At least one Pi eval covers company name → company code → company reports → view report.
- At least one Pi eval covers no-result behavior without invented references.
- At least one Pi eval covers validation/recovery behavior.

## Phase 5: Add Realistic Research-Answer Evals

Create `evals/scenarios/research-answers.ts` and `evals/suites/research-answer-pi.eval.ts`.

Initial candidate tasks:

- `삼성전자 최근 사업보고서에서 부문별 매출액 내역을 확인해 주세요.`
- `삼성전자 최근 사업보고서에서 배당 관련 내용을 찾아 출처와 함께 요약해 주세요.`
- A no-result or insufficient-evidence task where the correct answer must say the evidence was not found.

Evaluation should have two layers:

1. Deterministic trace assertions:
   - searched company when given a company name;
   - used returned DART company code;
   - searched relevant filings;
   - opened a returned filing;
   - retrieved TOC, document content, or a section;
   - final answer cites a returned receipt/viewer/section reference.
2. LLM judge only for subjective final-answer quality:
   - answers the user’s business question;
   - cites source evidence;
   - avoids unsupported claims;
   - distinguishes missing evidence from negative facts;
   - does not provide investment, legal, or accounting advice.

Acceptance criteria:

- Research-answer evals fail if the agent only returns a filing URL without answering the task.
- Research-answer evals fail if the answer contains material facts unsupported by retrieved tool evidence.
- Judge prompts and rubrics are versioned in `evals/judges/`.

## Phase 6: Clean Up Scripts and Documentation

Update `package.json` scripts to reflect surface and purpose. Candidate names:

```json
{
  "eval:cli:search-body": "...",
  "eval:agent-cli:search-body": "...",
  "eval:pi:search-body": "...",
  "eval:pi:workflow": "...",
  "eval:pi:recovery": "...",
  "eval:pi:research-answer": "...",
  "eval:typed:workflow": "..."
}
```

Update docs:

- `evals/README.md`: eval architecture, surface matrix, commands, artifact format.
- `docs/tools/evaluation.md`: policy for deterministic assertions vs LLM judges.
- `README.md`: only mention stable user-facing eval commands if appropriate.

Acceptance criteria:

- A new contributor can answer which public surfaces have model-in-the-loop eval coverage.
- Eval docs clearly distinguish tests, fixed CLI evals, agent tool-use evals, and final-answer evals.

## Coverage Matrix Target

| Capability / flow | CLI fixed | Agent CLI | Pi single tool | Typed internal | Final answer judge |
|---|---:|---:|---:|---:|---:|
| `search-body` basic | yes | yes | yes | optional | no |
| company name → code | no | optional | yes | yes | no |
| company code → reports | no | optional | yes | yes | no |
| report open / TOC | no | optional | yes | yes | no |
| section retrieval | no | no | yes | yes | maybe |
| no-result handling | yes | yes | yes | yes | maybe |
| recovery from bad input | no | maybe | yes | optional | no |
| realistic research answer | no | no | yes | optional | yes |

## Non-Goals

- Do not reintroduce MCP evals unless MCP becomes an active supported surface again.
- Do not replace deterministic assertions with LLM judges for objective tool-call or JSON-shape checks.
- Do not move colocated implementation tests out of `src/` just to centralize all tests.
- Do not require final-answer judge evals for every low-level tool capability.

## Open Questions

- Should the typed `darty_*` tool surface become public, or remain only a test/control harness?
- Should Pi evals use the source TypeScript adapter directly or the packed package export for stronger distribution realism?
- Which model families should be tracked as required gates versus exploratory evals?
- What minimum score or pass rule should final-answer judge evals use before they become release gates?
