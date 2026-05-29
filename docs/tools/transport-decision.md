# Transport Decision

## Short Answer

Neither `MCP` nor `CLI` is universally better.

The practical default for durable tools is:

- implement a reusable core
- expose a CLI first
- add MCP when the agent runtime or multi-tool ecosystem benefits from standardized discovery and invocation

## Decision Table

### Prefer CLI when

- you want simple local execution
- the capability is naturally command-oriented
- the output can be streamed or piped
- you want easy manual debugging against live DART pages
- you want the tool to work outside agent runtimes too

### Prefer MCP when

- you need standardized discovery across many tools
- the agent platform already speaks MCP well
- the tool benefits from persistent sessions, caching, or managed auth state

### Expose both when

- the capability is important enough to deserve a stable core
- humans and agents both need it
- there is real value in manual debugging plus another justified integration

## Recommendation For This Repo

Adopt `capability core + adapter matrix`.

For each tool, decide which of these adapters are justified:

- `CLI adapter`
- `MCP adapter`
- `Language SDK`
- `Batch/offline runner`

Do not fork logic between adapters. Adapters should mostly validate input, call the core, and serialize output.

Current repo stance: the CLI is the default public adapter, and `@sjunepark/darty/toolset` is the supported in-process adapter for trusted JS/TS server hosts. The CLI subprocess I/O contract is defined in [../specs/cli-transport-v1.md](../specs/cli-transport-v1.md): command success and command failure both emit one JSON envelope to stdout, while help remains human-readable. The package intentionally does not expose Pi or MCP adapters; reintroduce ecosystem-specific adapters only when the core contract and agent-runtime need justify them.

## Why CLI First Often Wins

- easiest to test manually
- easiest to profile and benchmark
- easiest to inspect failure modes
- least coupled to one agent ecosystem
- easiest starting point for later MCP wrapping

## Why MCP Still Matters

MCP gives a clean interop story once the contract is stable. The value is not magic capability; the value is shared protocol, tool discovery, and less custom glue.

## Anti-Patterns

- writing MCP handlers that contain the real domain logic
- designing outputs around human terminal readability only
- forcing agents to chain multiple shell-oriented commands when one semantic call should exist
- using a skill to compensate for a poor tool contract
- returning giant unfiltered dumps because "the model can figure it out"
