# Goal: Retire Release Please

Status: complete
Planning scope: ROADMAP.md

## Original contract

Goal contract

- Outcome: Retire Release Please and replace it with one fail-closed, tag-driven path that publishes the shipped npm package through OIDC and idempotently creates or verifies its GitHub Release.
- Goal state: goals/retire-release-please.md
- Included results and sources (semantic results define scope; paths supply detail):
  - Release authority replacement — plans/retire-release-please.md, docs/release.md, .github/workflows/release.yml, .github/workflows/release-please.yml, release-please-config.json, .release-please-manifest.json
  - Ownership and planning reconciliation — AGENTS.md, ROADMAP.md, plans/rust-sdk-node-sdk-cli-rewrite.md, tasks/repair-release-please-token.md
  - Release-safety validation — plans/retire-release-please.md, docs/release.md, package.json
- Complete when: Every included result achieves its cited outcome and applicable completion criteria within its named semantic boundary; repository-required validation and review pass; planning is truthful; no release, tag, publication, secret deletion, or repository-setting mutation occurs; Delivery finishes.
- Excluded: Phase 4 native packages, release assets, installers, target-matrix selection, and Rust-backed distribution cutover.
- Authority: Execute only included results and necessary supporting work; resolve remaining decisions within that closed outcome using best judgment; record anything else and ask before scope expansion or external authority.
- Resume: Initialize this contract with $progress goal mode before work; recover it before every resume, continuation, compaction, or handoff; stop if recovery fails.
- Delivery: PR delivery — use $progress's PR lifecycle and the fewest sequential reviewable PRs; finish each through $create-pr and $address-pr-feedback before starting the next, including the final implementation slice.

## Authorized amendments

_None._

## Execution status

### Completed included results

- Release authority replacement.
- Ownership and planning reconciliation.
- Release-safety validation.

### Current in-scope result

_None — goal complete._

### Next in-scope action

_None — goal complete._

### Evidence

- Boundary classification: release authority replacement is included; durable goal initialization and a temporary integration branch are necessary for the required PR lifecycle.
- GitHub immutable releases remain unchanged and outside this goal's external authority. The replacement will refuse to overwrite an existing release and recheck tag-to-source identity immediately before idempotent release creation or verification.
- The merged implementation retires the credential-based authority and adds tested create-or-verify completion after OIDC npm publication; no release side effects ran.
- Review decision: existing npm versions must match the validated source pack's registry integrity; version-string presence alone is insufficient to bind the source tag and GitHub Release to an npm artifact.
- Validation passes: frozen install, npm audit, wire checks, 24 focused release tests, typecheck, 436 full-suite tests (23 opt-in live skips), build, 31 CLI compatibility scenarios, mutation proof, workflow YAML syntax, and diff checks. Independent security review findings were fixed; no local review finding remains.
- Delivery completed in [PR #24](https://github.com/cpaikr/darty/pull/24), merged to the temporary integration branch as `f299aecd004d24fea2b92309e7db31d23825ac12` with individual commits preserved.
- Codex review completed with no findings. CodeRabbit's sole documentation finding was fixed, confirmed, and resolved; exact-head CI passed TypeScript validation, the Rust candidate suite and dependency audit, and unpublished candidate-package acceptance.
- No release workflow ran and no release, tag, npm publication, GitHub Release, secret deletion, or repository-setting mutation occurred.
