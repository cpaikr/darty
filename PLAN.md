# PLAN: Fix the Contents Search Test and Eval Boundaries

## Execution Status

Completed.

- Rewrote the contents-search Promptfoo scenarios as MCP agent tool-use evals.
- Removed final-answer and LLM-rubric expectations from the MCP tool-use track.
- Added deterministic JavaScript assertions for MCP tool invocation and structured result shape.
- Fixed Promptfoo JavaScript assertion return values to include `score`.
- Added fixed-command live CLI scenario evals for stdout JSON envelopes.
- Added an agentic CLI invocation eval runner where a model receives a structured local darty CLI runner and calls it with arguments that match the user request.
- Updated eval documentation to separate direct tool/API tests, CLI scenario evals, MCP contract tests, agent tool-use evals, and future final-answer evals.

Verification run:

- `bun run typecheck`
- `bun test`
- `bun run eval:contents:cli`
- `bun run eval:contents:agent:cli`
- `bun run eval:contents:agent:mcp -- --no-progress-bar`

## Goal

Rewrite the current contents-search verification setup so each test answers one clear question:

1. Does the DART contents-search tool work against the real upstream API?
2. Is the MCP tool exposed and callable with the expected schema?
3. Can an LLM-backed agent invoke the MCP tool and receive the expected structured result?
4. Can an LLM-backed agent use a structured local CLI runner with appropriate arguments for the user request?

The immediate issue is not that DART search is broken. The current Promptfoo eval mixes tool transport, agent tool-use, and final-answer quality. That makes failures hard to interpret and caused a valid tool result to fail because Promptfoo returned a raw `MCP Tool Result (...)` wrapper instead of a final prose answer.

## Current Problem

The current eval is written as if it is testing final agent answers:

- the scenario says the agent should write a normal user-facing answer;
- it says not to paste `MCP Tool Result` wrappers;
- it uses an `llm-rubric` judge to grade faithfulness and citation behavior.

But the observed Promptfoo MCP flow returns the raw tool result as the provider output:

```text
MCP Tool Result (contents-search): ...structured JSON...
```

That output is useful for testing whether the model/tool path invoked `contents-search`, but it is not a final user-facing answer. The eval therefore has an unclear contract.

There is also a Promptfoo assertion-shape bug: JavaScript assertions currently return `{ pass, reason }`, but this Promptfoo version rejects that. They should return a supported grading result, including `score`.

## Target Test Matrix

### 1. Direct live tool/API tests

Purpose: prove the DART adapter and contents-search capability work against live DART.

Existing home:

- `test/live/dsab007-contents.test.ts`
- capability/operation tests under `src/capabilities/contents-search/`

Keep these deterministic and agent-free. They should call the source/capability path directly and assert structured data:

- populated keyword returns `totalCount > 0` and at least one item;
- no-result keyword returns `totalCount === 0` and `items.length === 0`;
- returned filing references have expected DART viewer URL prefixes;
- source behavior fields stay accurate, such as fixed page size and pagination behavior.

These tests should not use Promptfoo or an LLM.

### 2. MCP contract tests

Purpose: prove the local MCP server exposes and executes `contents-search` correctly.

Existing home:

- `src/mcp/server.test.ts`

Keep these deterministic and mostly mocked. They should verify:

- tool name, description, annotations, input schema, and output schema;
- valid MCP calls execute the shared contents-search operation;
- invalid MCP calls fail as MCP tool errors, outside the success schema;
- CLI and MCP return the same shared success envelope.

These tests should not use an LLM.

### 3. Agent tool-use evals

Purpose: prove an LLM-backed agent can invoke `contents-search` through MCP and receive valid tool output.

Existing home:

- `evals/contents-search/promptfooconfig.agent.mcp.yaml`
- `evals/contents-search/scenarios.agent.mcp.yaml`

Rewrite this track as a tool-use eval, not a final-answer eval.

The eval should pass if:

- the MCP tool was actually invoked;
- the output contains the expected structured envelope;
- populated scenarios include non-empty filing data and at least one concrete reference;
- no-result scenarios return an empty result and do not include invented filing references.

Use deterministic JavaScript assertions first. Avoid `llm-rubric` for this track unless there is a specific subjective final-answer behavior to judge.

Expected assertion style:

```js
const pass = /* deterministic check */;

return {
  pass,
  score: pass ? 1 : 0,
  reason: 'explain the check result',
};
```

Do not fail this eval merely because the output contains `MCP Tool Result` if this track is explicitly testing tool invocation and returned structure.

### 4. Optional final-answer evals

Purpose: prove an agent can transform tool output into a good user-facing answer.

This should be a separate future track, not mixed into the tool-use eval.

Only add this when the runner actually performs a full agent loop:

```text
user task -> model requests tool -> MCP tool result -> model writes final answer
```

If Promptfoo cannot do the second model pass with local MCP in the required way, implement a small custom provider or runner that owns that loop. Then grade the final prose answer separately.

This track may use an LLM judge because clarity, faithfulness, and overclaiming are subjective. It should still keep deterministic checks for hard requirements such as viewer URL prefix and receipt number presence/absence.

## Rewrite Steps

1. Update eval documentation.
   - Make `evals/README.md` distinguish deterministic tests from model-in-the-loop evals.
   - Update `evals/contents-search/README.md` so the current Promptfoo track is described as an agent tool-use eval, not final-answer quality eval.
   - Document final-answer evals as future/optional unless the runner performs the full second model pass.

2. Rewrite `scenarios.agent.mcp.yaml` around structured tool output.
   - Remove requirements that the current runner cannot satisfy, especially final prose answer rules.
   - Remove or disable `llm-rubric` for the tool-use track.
   - Add deterministic assertions that parse the output where possible and check the structured result envelope.
   - Fix every JavaScript assertion to return `{ pass, score, reason }`.

3. Keep direct live tests as the source of truth for DART behavior.
   - Do not duplicate all live DART contract coverage in Promptfoo.
   - Promptfoo should verify agent/tool wiring, not rediscover every upstream field behavior.

4. Keep MCP tests as the source of truth for transport/schema behavior.
   - Continue testing MCP with in-memory transports and mocked providers.
   - Avoid depending on LLMs for schema or transport correctness.

5. Add a final-answer eval only after the agent loop is real.
   - First prove that the runner can feed the MCP result back into the model.
   - Then assert that the returned output is final assistant prose, not a tool wrapper.
   - Use an LLM judge only for prose quality and faithfulness.

## Success Criteria

After the rewrite:

- `bun test` covers deterministic unit, contract, CLI, and MCP behavior.
- `bun run test:live` covers live DART behavior without an LLM.
- `bun run eval:contents:agent:mcp` answers one clear question: can the configured model invoke `contents-search` through MCP and receive valid structured output?
- Promptfoo failures identify agent/tool wiring issues, not unrelated final-answer formatting requirements.
- Any future final-answer eval is separate and only runs against a runner that actually produces final prose answers.

## Non-Goals

- Do not use LLM judges for checks that can be expressed deterministically.
- Do not weaken direct tool/API tests just because the agent eval exists.
- Do not treat raw `MCP Tool Result` output as bad in a tool-use eval.
- Do not add broad compatibility layers or fallback eval paths unless there is a real runner constraint.
