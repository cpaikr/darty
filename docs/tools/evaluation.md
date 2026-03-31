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

Verify input validation, output shape, and error codes.

### Golden retrieval tests

For DART-like tools, preserve canonical fixtures and expected outputs for search, filing metadata, and section retrieval.

### Scenario evals

Use user-like tasks:

- "Find Samsung Electronics' latest annual report and return the filing reference."
- "Retrieve the MD&A section from a filing and cite the section pointer."
- "Fetch the PDF and the viewer section for the same filing and show that they map to the same source."

### Adversarial evals

Probe:

- stale identifiers
- filing revisions and amended reports
- source-side HTML changes
- rate-limited or partially unavailable surfaces
- auth-required OpenDART paths
- section pointers that no longer align with viewer offsets

## Measure Agent Burden

A tool can be technically correct and still poor for agents.

Watch for:

- too much raw text
- unclear field naming
- missing references
- outputs that require the model to reconstruct filing structure
- outputs that hide uncertainty

## Recommended Artifact Per Tool

Each future tool should have a compact eval document with:

- target tasks
- success criteria
- representative fixtures
- known failure classes
- benchmark expectations
- version notes when the upstream source changes
