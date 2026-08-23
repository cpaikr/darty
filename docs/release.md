# Release

This repo publishes the TypeScript npm package `@sjunepark/darty`. The package
includes the Node-based `darty` CLI through `package.json` `bin`.

Release Please owns normal version bumps, `CHANGELOG.md`, source tags, and
GitHub Releases. The Release workflow validates tagged source and publishes
npm. The retained Rust/Node/CLI candidate is unpublished, is not selected by
the root package, and is outside this release flow. This repo does not yet
publish native packages or standalone OS-native binaries.

## Manual setup

Configure npm trusted publishing for `@sjunepark/darty`:

- Publisher: GitHub Actions
- Organization or user: `sjunepark`
- Repository: `darty`
- Workflow filename: `release.yml`

Configure this secret in this private repository:

- `RELEASE_PLEASE_TOKEN`: token used by `.github/workflows/release-please.yml` to open release PRs and create source tags/releases. Use a fine-grained PAT or GitHub App token, not the default `GITHUB_TOKEN`, so Release Please-created tags trigger `.github/workflows/release.yml`. Grant this repository Contents read/write and Pull requests read/write access.

npm publishing uses OIDC trusted publishing, so no npm publish token is required.

Branch protection is not currently available for this repository. The
repository-controlled release gate therefore runs Release Please from a
successful `CI` `workflow_run`, checks that the CI run's exact commit is still
the head of `main`, and refuses to run when `main` moved. If branch protection
becomes available, require the `CI / validate` check as defense in depth.

The `RELEASE_PLEASE_TOKEN` value is an external prerequisite. A missing,
expired, or under-scoped token blocks Release Please before it can open a PR or
create a source tag; credentials cannot be repaired from this repository.

For changes to CLI tool contracts, workflow behavior, eval harness behavior, or
answer-quality prompts, run the relevant checks before release-readiness
signoff. These are manual, opt-in checks; none is a required CI or npm
publishing dependency.

| Eval | Command | Classification | Readiness use |
| --- | --- | --- | --- |
| Fixed report workflow | `bun run eval:workflow:cli` | Live DART; fixed assertions; manual/opt-in; no hosted model | Run for workflow, CLI contract, or workflow-eval changes. |
| Agent body search | `bun run eval:agent-cli:search-body` | Live DART + hosted model; manual; requires `OPENAI_API_KEY` | Run for CLI contract, eval-harness, or answer-quality changes. |
| Agent research workflow | `bun run eval:workflow:agent` | Live DART + hosted model (including a final-answer judge); manual; requires `OPENAI_API_KEY` | Run for workflow, eval-harness, or answer-quality changes. |

Run `bun run env:check` before the model-assisted checks. Use the default
`OPENAI_MODEL` as the required manual model gate; additional model overrides
are exploratory unless explicitly promoted in [`evals/README.md`](../evals/README.md).
The fixed workflow eval is live but does not use a hosted model. All three
evals remain outside required CI and npm publishing automation because live
DART (and, for the agent evals, hosted-model) availability is not deterministic
for release automation.

## Automated release flow

While the package is pre-1.0, Release Please treats normal `feat:` and `fix:` commits as patch releases and reserves minor bumps for breaking changes. This keeps rapid greenfield feature work on `0.0.x` unless a commit uses `!` or a `BREAKING CHANGE:` footer.

1. Land normal work on `main` using Conventional Commits, especially `feat:`, `fix:`, and `docs:`. Use `!` or a `BREAKING CHANGE:` footer for breaking changes.
2. `.github/workflows/ci.yml` validates pull requests and pushes to `main`
   with the high-severity Bun audit, wire locks, CLI compatibility and
   mutation checks, TypeScript typecheck/tests/build, Rust tests, and candidate
   package acceptance.
3. After a successful `CI` run for a `main` commit,
   `.github/workflows/release-please.yml` verifies that exact commit is still
   `main`, then opens or updates a release PR that bumps `package.json`,
   updates `.release-please-manifest.json`, and writes `CHANGELOG.md`.
4. Merge the release PR after CI passes.
5. Release Please creates the source tag and GitHub Release.
6. The source tag triggers `.github/workflows/release.yml`. Its metadata job
   requires a successful `CI` workflow run for the exact tagged commit before
   the tagged `npm_validation` job runs the high-severity Bun audit, DART wire
   authority check, full CLI v1 judge, mutation proof, typecheck, tests, and
   build. Only then does the publish job run.

The workflow-run gate is the repository-controlled substitute for unavailable
branch protection: a failed CI conclusion cannot create a Release Please tag,
and a manually pushed tag without a successful exact-commit CI run cannot
publish. A concurrent main push can make a gate fail; the subsequent successful
CI run retries the Release Please workflow for the new head.

The source tag must match `package.json` exactly. Version `x.y.z` uses source tag `vx.y.z`.

## Dependency audit policy

`bun audit --audit-level=high` is required in both CI and tagged release validation. The
lockfile uses Bun `overrides` only for vulnerable transitives that are
compatible with the package's Node `>=20.18.1` engine:

| Transitive | Pinned version | Dependency path | High findings addressed |
| --- | ---: | --- | --- |
| `nanoid` | `3.3.18` | `sanitize-html` → `postcss` | [GHSA-28wg-ghj8-5hjv](https://github.com/advisories/GHSA-28wg-ghj8-5hjv), [GHSA-2v37-7h3g-55p8](https://github.com/advisories/GHSA-2v37-7h3g-55p8) |
| `postcss` | `8.5.26` | `sanitize-html` | [GHSA-r28c-9q8g-f849](https://github.com/advisories/GHSA-r28c-9q8g-f849) |
| `undici` | `7.29.0` | `cheerio` | [GHSA-4cwx-7wf7-3272](https://github.com/advisories/GHSA-4cwx-7wf7-3272), [GHSA-vmh5-mc38-953g](https://github.com/advisories/GHSA-vmh5-mc38-953g), [GHSA-vxpw-j846-p89q](https://github.com/advisories/GHSA-vxpw-j846-p89q), [GHSA-hm92-r4w5-c3mj](https://github.com/advisories/GHSA-hm92-r4w5-c3mj) |

The pinned package releases are published as [`nanoid@3.3.18`](https://www.npmjs.com/package/nanoid/v/3.3.18), [`postcss@8.5.26`](https://www.npmjs.com/package/postcss/v/8.5.26), and [`undici@7.29.0`](https://www.npmjs.com/package/undici/v/7.29.0). Keep these overrides narrow; update them when the direct dependency graph or advisory fix versions change.

## Manual fallback

If automation needs to be bypassed, update `package.json` and `.release-please-manifest.json` to the same version, commit the change, ensure that exact commit has a successful `CI` run on `main`, and push a matching source tag:

```sh
git tag vx.y.z
git push origin main refs/tags/vx.y.z
```

The Release workflow checks the tag commit against the successful CI workflow
runs and fails closed when no exact match exists. Creating a Git tag itself
cannot be prevented without GitHub branch/tag protection, so treat this as an
exceptional, auditable fallback.

To republish an existing source tag without moving it, run the `Release` workflow manually with the `tag` input set to the existing tag, for example `v0.2.1`.

The workflow is idempotent. If the npm package version already exists, npm publish is skipped.
