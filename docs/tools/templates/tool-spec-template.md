# Tool Spec Template

Use this for each future tool or tool family. Fill it alongside [../contracts.md](../contracts.md), [../transport-decision.md](../transport-decision.md), and [../evaluation.md](../evaluation.md), not instead of them.

Only promote a document into `docs/specs/` when it is an evidence-backed implementation target. Keep exploratory source notes in `docs/research/` and product direction in the repo-root vision docs.

## 1. Identity

- `name`
- `owner`
- `status`
- `domain`
- `users`

## 2. Problem

- What user task does this tool solve?
- Why are generic tools insufficient?
- Why is this capability worth standardizing?

## 3. Capability Boundary

- What the tool does
- What the tool explicitly does not do
- What upstream systems it depends on

## 4. Domain Model

- Primary entities
- Stable identifiers
- Important relationships
- Reference model for traceability

## 5. Operations

For each operation:

- `name`
- `purpose`
- `inputs`
- `output`
- `error cases`
- `safety class`

## 6. Transport Adapters

- CLI: yes or no, and why
- MCP: yes or no, and why
- SDK: yes or no, and why

## 7. Output Modes

- summary
- structured
- raw

## 8. Safety Model

- read-only vs mutating operations
- approval boundaries
- auth and secret handling
- rate-limit strategy
- audit logging

## 9. Evaluation Plan

- target scenarios
- fixtures
- success criteria
- adversarial cases
- latency budget

## 10. Open Questions

- source instability risks
- unresolved contract decisions
- likely future extensions

Keep this section short. If an open question requires live investigation or source evidence, link to the research note instead of turning the spec into an investigation log.
