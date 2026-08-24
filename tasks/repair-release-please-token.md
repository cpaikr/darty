# Repair the Release Please credential

## Outcome

Release Please can open release pull requests and create source tags/releases
through the repository's exact-commit release gates.

## Current state

The `RELEASE_PLEASE_TOKEN` secret exists. **Observed 2026-08-22:** Release
Please workflow run
[`32559940325`](https://github.com/cpaikr/darty/actions/runs/32559940325)
failed with `Bad credentials`. The credential is external repository
administration and cannot be repaired from the codebase. This blocks automated
release administration, not local rewrite work.

## Next step

A repository owner rotates or replaces the token with the permissions required
by [the release runbook](../docs/release.md), then verifies that Release Please
succeeds for the exact successful `main` SHA. Do not weaken the SHA, tag,
audit, compatibility, or mutation gates to work around the credential failure.
