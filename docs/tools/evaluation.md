# Evaluation

This document is about evaluating one tool.

## What To Evaluate

Do not stop at unit correctness.

An agent tool should be evaluated on:

- `task success`
  Does it help the agent complete the actual user task?
- `call efficiency`
  How many tool calls and retries are needed?
- `output usability`
  Does the result shape reduce model reasoning burden?
- `failure clarity`
  Can the agent recover when something goes wrong?
- `source faithfulness`
  Are references and extracted facts traceable?
- `latency`
  Is the tool fast enough to actually be preferred?

## Eval Types

### Contract tests

Verify input validation, output shape, and error codes. Keep these near the code that owns the contract, usually colocated `*.test.ts` files.

### Source and fixture tests

For DART-like tools, preserve canonical fixtures and expected outputs for the implemented surface. Current `search-body` coverage focuses on search rows, pagination, warnings, and filing-level references; filing metadata and section retrieval belong to later capabilities.

### Live checks

Use opt-in live checks for source behavior that fixtures cannot prove, such as upstream field handling and source drift. In this repo, those belong under `test/live/`.

### Scenario evals

Use user-like tasks at the capability level. Put scenario-style CLI and model-in-the-loop checks under `evals/` when they exercise live task usefulness or agent/tool wiring rather than narrow unit behavior. Keep scenarios focused on the public CLI subprocess surface unless another transport is explicitly reintroduced.

Current examples:

- run a fixed CLI contents search and assert the stdout envelope has filing references
- ask a model to invoke the structured local CLI runner with keyword, date range, and optional company filter
- run `bun run eval:agent-cli:search-body` as the manual model-in-the-loop readiness check for CLI surface changes

Future retrieval examples:

- "Find Samsung Electronics' latest annual report and return the filing reference."
- "Retrieve the MD&A section from a filing and cite the section pointer."
- "Fetch the PDF and the viewer section for the same filing and show that they map to the same source."

### Adversarial evals

Probe:

- stale identifiers
- filing revisions and amended reports
- source-side HTML changes
- rate-limited or partially unavailable surfaces
- auth-required adjacent-source paths, such as future OpenDART experiments
- section pointers that no longer align with viewer offsets

## Deterministic Assertions vs LLM Judges

Use deterministic assertions for objective facts:

- tool/action/command names
- input keys and normalized values
- company codes, receipt numbers, viewer URLs, document IDs, and section IDs
- call ordering and identifier handoff
- success/failure envelopes, warning presence, and no-result item counts
- whether the final answer invented references after an empty source result

Use an LLM judge only for subjective final-answer quality, such as whether an answer directly addresses the business question, cites returned evidence, distinguishes missing evidence from negative facts, avoids unsupported claims, and avoids investment/legal/accounting advice. Do not replace objective trace checks with a judge. Add judged evals only when there is an active final-answer track to own the rubric and artifacts.

## Measure Agent Burden

A tool can be technically correct and still poor for agents.

Watch for:

- too much raw text
- unclear field naming
- missing references
- outputs that require the model to reconstruct filing structure
- outputs that hide uncertainty

## Recommended Artifact Per Tool

Each future tool or capability eval track should have a compact eval document with:

- target tasks
- success criteria
- representative fixtures
- known failure classes
- benchmark expectations
- version notes when the upstream source changes
