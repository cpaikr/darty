# Tool Surface Validation Scripts

`validate-tool-surface.mjs` is a dependency-free smoke checker for packages that follow the reusable tool package surface spec.

Run it after the target package has been built:

```bash
node temp-skill/scripts/validate-tool-surface.mjs /path/to/package
```

Useful options:

```bash
node temp-skill/scripts/validate-tool-surface.mjs . --id darty
node temp-skill/scripts/validate-tool-surface.mjs . --toolset-factory createDartyToolset --pi-factory createDartyPiTool
node temp-skill/scripts/validate-tool-surface.mjs . --run-cli
```

The script checks package shape, imports `./toolset` and `./pi`, validates operation metadata, verifies kebab-case operation names, checks retryable validation failures for recovery metadata, checks example inputs when provided, exercises Pi `help`/`command_help`, and optionally runs CLI help/invalid-command smoke checks.

It intentionally does **not** execute normal operations by default. That keeps the check safe for read-only, network-backed, or potentially expensive tools.
