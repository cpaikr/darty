# Darty consumer skill evaluation

Historical baseline; the [automatic-invocation revision](invocation-2026-09-11.md)
supersedes its activation policy.

Evaluated 2026-09-10. Scope: the explicit-invocation CLI consumer package in
[`skill/darty`](../../skill/darty/SKILL.md), separate from maintainer skills,
SDK integration, installation registration, and release publication.

## Contract and sources

- Reusable outcome: resolve a disclosure request into bounded CLI queries and
  verifiable company, filing, or section evidence.
- Distinctive help: preserve attachment URLs and scoped IDs, distinguish filing
  dates from accounting periods, and interpret corrections, pagination, body
  windows, and failures without overstating evidence.
- Expected reuse: company lookup, filing research, report comparisons, and
  disclosure-code selection by agents using an installed executable.
- Source baseline: Darty `d306cab1804d68f0961d6c599b50fcc329cc9728`, its CLI v1
  specs/independent fixtures, and the installed CLI's help and offline outputs.
  `darty --version` failed; `darty --help` succeeded. Installed executable
  identity was not inferred from checkout version.
- Mytech: local `/Users/sejunpark/IT/mytech` at
  `a26e343365d2e9411026d67492e0a996986429a2`, clean consulted files. Read README,
  accepted [CLI consumer skills](https://github.com/sjunepark/mytech/blob/a26e343365d2e9411026d67492e0a996986429a2/practices/cli-consumer-skills.md)
  and [installation guides](https://github.com/sjunepark/mytech/blob/a26e343365d2e9411026d67492e0a996986429a2/practices/cli-installation-guides.md).
  No refresh or remote-freshness claim. The package follows these defaults;
  its installation reference links the canonical README rather than copying it.

## Frozen cases and results

[Cases and critical assertions](cases.json) were fixed before scoring.
All applicable assertions and concrete valid next actions were required.
Two fresh workers per condition answered the same five synthetic scenarios;
each worker handled a bundle, so cases within a bundle shared context.
The history case was reserved from tuning. Baseline had the same installed-help
snapshots and scenario evidence without the skill. No live requests, installer
runs, or separate paid model-evaluation service were used.

| Decision case | Without skill | Candidate |
| --- | --- | --- |
| Working CLI: preserve attachment URL and verify body context | 2/2 pass | 2/2 pass |
| Long section: returned byte cursor and terminal window | 2/2 pass | 2/2 pass |
| Missing executable and inaccessible installation authority | 2/2 pass | 2/2 pass |
| Nonretryable source failure versus zero matches | 2/2 pass | 2/2 pass |
| Holdout: original/corrected filings across long paginated history | 2/2 pass | 2/2 pass |

The candidate preserved correctness; these cases do not demonstrate a general
accuracy improvement. Candidate workers reported loading installation only for
the missing-executable case; baseline workers read the full README for provider
failure diagnosis. These are worker-reported file traces, not independently
instrumented context measurements. Candidate outputs were larger (9,285/9,450
UTF-8 bytes versus 6,965/6,601); no overall efficiency gain is claimed.

Eight separate fresh-context [metadata-selection simulations](triggers.json)
accepted all three explicit positives and rejected all five uninvoked,
out-of-scope, ambiguous, or unrelated cases. Adapter policy and description
agree. This does not test discovery in an installed agent host.

## Review correction and final validation

One bounded independent `code-review` pass found a completion rule that required
filing metadata even for company profiles and static lookups. The final rule
uses operation-appropriate identifiers/provenance and requires filing evidence
only for filing tasks. No other actionable findings were reported.

Fresh workers then executed the offline disclosure-type lookup using the prior
and revised candidates from outside the repository. Both returned
`A001 — 사업보고서` and completed without a company/filing query; the revised
candidate skipped installation material. The prior worker first used a shell
without Darty on PATH, then succeeded in a login shell. That environment
difference precludes attributing its extra setup read to the wording change.
The correction resolves the static contradiction; no empirical regression was
observed. Earlier filing assertions remain applicable and unchanged.

Validation passed: Skill Creator's frontmatter validator, direct resource links
and package closure in a detached copy, absence of external symlinks, installed
CLI help from that copy, offline JSON/text successes and JSON validation failures,
and whitespace checks. The canonical remote README's installation anchor was
verified through `gh`. README and eval navigation were harmonized within this
change's scope. Rust/tooling suites were not run because executable behavior,
build scripts, and contracts were unchanged.

Authoring rubric: scope, trigger metadata, entry point, progressive loading,
specificity, workflow/completion, failure handling, portability, and pruning
pass after the correction. Evaluation passes for the bounded offline decision
and static-execution scope; live retrieval, actual host activation, clean release
installation, and statistical reliability remain unverified. Scripts, copied
third-party material, migrations, and predecessor removal are not applicable.

Raw outputs and input snapshots are preserved locally under
`.tmp/evals/skill/2026-09-10/`, following the eval artifact convention. Candidate
hashes use SHA-256 over sorted package-relative paths prefixed with `darty/`
and file bytes:

- Initial: `bc735b8a159396e415b818869c06c4856e1ffc004e0f9484d15ccf24d5342e51`
- Final: `8565c80790e61961f20480368053d6c062d57606074b5e6f8c97b13c7e57cee2`

Disposition: retain the requested source candidate for explicit use and future
real-task feedback. No registration, installation, publication, or removals
were performed. The scoped check does not assess the rest of Darty against
mytech preferences or certify a release.
