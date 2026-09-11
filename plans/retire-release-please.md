# Retire Release Please

Status: complete in [PR #24](https://github.com/cpaikr/darty/pull/24). This record
covers the historical TypeScript/npm release workflow. Standalone delivery and
the Rust rewrite later superseded that distribution path; the
[release runbook](../docs/release.md) owns the current public GitHub Release
workflow, manual Actions policy, and version rules.

## Delivered outcome

The implementation removed the Release Please workflow, configuration,
manifest, credential dependency, and active ownership references. It retained
one explicit source-tag authority, reconciled tag/version/source identity,
required CI for the exact source commit, and provided OIDC publication of the
then-shipped npm package followed by creation or verification of the same
version's GitHub Release.

[The original goal](../goals/retire-release-please.md) preserves the authorized
contract. Release tags, publication, remote secret deletion, repository-setting
changes, and the later native distribution cutover were outside that delivery.
None of those external actions occurred as part of PR #24.

## Decisions retained

- Remove Release Please rather than rotate or broaden its retained credential.
- Keep `package.json` as version authority, reviewed version commits, explicit
  immutable source tags, exact-source CI, and a single release line.
- Retain `CHANGELOG.md` as history through v0.5.0. GitHub generated release notes
  own subsequent summaries; no second synchronized changelog is maintained.
- Fail closed on ambiguous lookup results and mismatched existing artifacts.
  For the historical npm projection, an existing version was accepted only when
  its registry integrity matched the validated source pack; version presence
  alone was insufficient.
- Recheck tag/source identity before release completion and refuse to overwrite
  a release. GitHub immutable releases were disabled as observed on 2026-08-24;
  the workflow did not claim to prevent administrators changing records outside
  it or change repository settings.
- Treat unused remote-secret removal as separate owner administration, not an
  implementation completion dependency.

The original commit-prefix version policy and npm/OIDC projection are historical.
Current version selection, artifacts, idempotency, and approvals are specified
only in the release runbook.

## Completion evidence

Frozen installation, dependency audit, wire authority, release-safety tests,
typechecking, the TypeScript suite/build, CLI compatibility, mutation proof,
workflow YAML syntax, and diff checks passed. Security review findings for
prerelease tags, uncertain npm lookups, and existing-version artifact identity
were resolved. Codex found no issue; CodeRabbit's documentation finding was
fixed and confirmed, all review threads were resolved, and exact-head CI passed.

No action remains in this completed plan.
