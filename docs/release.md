# Release

This repository publishes the shipped TypeScript npm package
`@sjunepark/darty`, including its Node-based `darty` CLI. Release Please owns
normal version bumps, `CHANGELOG.md`, source tags, and GitHub Releases; the
tagged Release workflow publishes npm. The retained Rust/Node/CLI candidate is
unpublished and outside this flow.

## Manual prerequisites

Configure npm trusted publishing for `@sjunepark/darty` with GitHub Actions,
repository `cpaikr/darty`, and workflow `release.yml`. Publishing uses OIDC,
so no npm token is required.

Configure `RELEASE_PLEASE_TOKEN` as a fine-grained PAT or GitHub App token with
repository Contents and Pull requests read/write access. The default
`GITHUB_TOKEN` is insufficient because its generated tags do not trigger the
Release workflow. Missing, expired, or under-scoped credentials require a
repository owner; track current repair work in
[`tasks/repair-release-please-token.md`](../tasks/repair-release-please-token.md).

Branch protection/rulesets are unavailable for the current private-repository
account plan. Repository workflows therefore enforce exact-commit gates:
Release Please runs only after successful `CI` for the current `main` head, and
tagged publication requires successful `CI` for the exact tag commit. If
branch protection becomes available, require `CI / validate` as defense in
depth.

## Manual release-readiness evals

Run checks relevant to changes in CLI contracts, workflows, eval harnesses, or
answer-quality prompts. These are opt-in readiness evidence, not required CI or
npm publication dependencies.

| Eval | Command | Use |
|---|---|---|
| Fixed report workflow | `bun run eval:workflow:cli` | Live DART workflow and CLI contract changes |
| Agent body search | `bun run eval:agent-cli:search-body` | CLI, invocation-harness, or prompt changes; requires `OPENAI_API_KEY` |
| Agent research workflow | `bun run eval:workflow:agent` | Workflow, citation, or answer-quality changes; requires `OPENAI_API_KEY` and a final-answer judge |

Run `bun run env:check` before hosted-model checks. The default
`OPENAI_MODEL` is the readiness baseline; overrides are exploratory unless
[`evals/README.md`](../evals/README.md) promotes them.

## Automated flow

1. Land Conventional Commits on `main`. Within the current pre-1.0 minor line,
   normal `feat:` and `fix:` commits create patch releases; `!` or a
   `BREAKING CHANGE:` footer creates a minor release.
2. `CI` runs the high-severity dependency audit, wire locks, CLI compatibility
   and mutation proof, TypeScript validation, Rust validation, and candidate
   package acceptance.
3. After successful `CI`, Release Please verifies that the exact commit remains
   the `main` head and opens or updates the release PR.
4. Merge the release PR after CI passes. Release Please creates the source tag
   and GitHub Release.
5. The source tag triggers `release.yml`. Its metadata job requires successful
   `CI` for the exact tagged commit before tagged validation and npm publish.

Version `x.y.z` uses source tag `vx.y.z`, and the tag must match
`package.json`. A concurrent `main` push may close an exact-head window; the
next successful CI run evaluates the new head.

## Dependency audit policy

`bun audit --audit-level=high` is required in CI and tagged validation.
`package.json` may use narrow Bun `overrides` for vulnerable transitives only
when the selected releases are compatible with the supported Node engine.
Treat `package.json` and the lockfile as the exact version authority. Remove or
update an override when the direct dependency graph incorporates the fix, and
verify frozen installation plus the audit after every change.

## Manual fallback

If automation must be bypassed, update `package.json` and
`.release-please-manifest.json` to the same version, commit the change, confirm
successful `CI` for that exact `main` commit, and push the matching tag:

```sh
git tag vx.y.z
git push origin main refs/tags/vx.y.z
```

The Release workflow fails closed without exact-commit CI evidence. GitHub
cannot prevent creation of an arbitrary tag under the current account limits,
so this is an exceptional, auditable fallback.

To republish an existing source tag without moving it, run the `Release`
workflow manually with that tag as the `tag` input. The workflow skips npm
publish when the package version already exists.
