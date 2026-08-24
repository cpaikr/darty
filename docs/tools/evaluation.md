# Tool evaluation

Use the cheapest reliable evidence for each claim:

- contract and parser tests for deterministic validation and source shapes;
- fictional fixtures for reproducible DART behavior;
- the black-box CLI judge for process compatibility;
- SDK and package acceptance for public-consumer behavior;
- opt-in live checks for upstream drift that fixtures cannot prove;
- scenario evals for realistic multi-step usefulness and agent invocation.

Objective facts—arguments, identifiers, call order, output envelopes, exit
status, and empty-result behavior—belong in deterministic assertions. The
agent research workflow separately uses an LLM judge for grounded final-answer
quality after its deterministic trace and citation gates pass.

Evaluate task success, call efficiency, reference fidelity, failure recovery,
output size, and latency. Keep live/model-dependent checks outside required CI
unless the project explicitly promotes them.

See [evals/README.md](../../evals/README.md) for the current runners and gate
policy, and [the vertical fixture README](../../fixtures/dart/vertical-v1/README.md)
for the canonical wire evidence boundary.
