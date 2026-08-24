# Tool foundations

Design a capability before choosing its transport. A useful agent-facing
capability has a narrow intent, semantic and bounded inputs, deterministic
behavior, structured results, stable references, explicit failures, and a
clear next step.

Keep four concerns distinct:

- **core**: domain validation, execution, and result shaping;
- **source adapter**: DART wire behavior, parsing, and source failures;
- **transport**: CLI or SDK-specific invocation and presentation;
- **policy and guidance**: permissions, limits, retries, and usage advice.

The core should not depend on transport syntax. A transport should not become
a second implementation of DART behavior.

For this repository, the shipped TypeScript layering and accepted Rust target
are mapped in [ARCHITECTURE.md](../../ARCHITECTURE.md). Operation boundaries
and transport rules belong in [specs](../specs/README.md).
