# Agent workflow readiness evidence

Observed on 2026-09-09: fixed CLI checks passed in both complete batches. The
baseline passed body invocation 2/3 and research 1/6; the required post-review
batch passed body invocation 3/3 and research 2/6. **Release readiness remains
on hold.** These small diagnostic samples do not establish a reliability rate,
provider approval, or operator signoff. [The readiness plan](../../plans/validate-agent-workflow-readiness.md)
owns delivery; the [release runbook](../release.md) owns the remaining gates.

## Baseline source and shared protocol

- Implementation: `a25fc90db2fefb05eea7774d500443239ed8a670`.
- Production CLI: version 0.6.1, Rust 1.88.0, local macOS ARM64. Installed through
  the checksum-verifying archive installer at
  `.tmp/evals/readiness-5139e00/installed/darty`; every command used its absolute
  path via `DARTY_CLI`. This local run does not establish Linux CI or other-platform
  certification. Subsequent fixes changed only the diagnostic script, so the
  production executable remained identical.
- Executable SHA-256:
  `109135f4f60371ba0862c91464c878806883e3e65859fb3220721bcd7e590a59`.
- Frozen manifest: `.tmp/evals/readiness-a25fc90/protocol.json`, SHA-256
  `b6b82348e43aa09e2dc002ddb953b77e51b16c590c5144a4df2dd0c8e68b7fb2`.
  It records the source, executable, all eval source hashes including prompts,
  tools and scenarios, model settings, budgets, order, and declaration time.
  Hashes were rechecked after the complete sample; no eval source changed.
- Agent and judge: `gpt-5.4-mini`. Research allows 18 responses, body invocation
  six; each reserves the last for tool-free finalization. Counts below exclude
  the separate judge request. [Workflow execution policy](../../evals/workflows/README.md#execution-and-diagnostics)
  owns the budget rationale and neutral help/identity/recovery onboarding.
- Order: fixed body suite; original fixed report workflow plus deterministic
  same-report/comparison checks; one body-agent suite; three repetitions of the
  two original research tasks, preserving their 20250331–20260331 windows.
  All requests were serial under the existing finite provider deadlines and SDK
  pacing, with no automatic DART retry. No model substitution or budget escalation
  occurred during the paid sample.
- Ignored audit index: `.tmp/evals/readiness-a25fc90/outcomes.json`. It links and
  hashes all nine model artifacts. Public locators, dates, byte windows, counts,
  fingerprints, gate outcomes and structured diagnostics are retained; live
  bodies and free-form model/provider/judge prose remain in memory under the
  [provider retention boundary](dart-provider-qualification.md#retention).

## Fixed CLI and guidance evidence

All three fixed body scenarios and the original company → filings → TOC → section
workflow passed. The repaired scorer also passed both deterministic research
paths through the installed CLI, using returned identifiers:

| Path | Receipt / section | Returned UTF-8 window |
|---|---|---|
| Same-report citation | `20260310002820` / `section:2` | `[0,323)`, complete |
| Two-report comparison | `20260310002820` / `section:2`; `20251114002447` / `section:2` | `[0,323)`; `[0,311)`, complete |

Both use `document:body:1`; provenance and citation membership passed. These
scripted checks do not judge prose or count as model successes. The diagnostic
selects public-help periodic disclosure types and intersects returned TOCs;
its selection strategy is not injected into the agent prompt.

The CLI preserves candidate order and SDK semantics while requiring identity
selection unless complete singleton pagination proves one candidate. Independent
fictional release-CLI cases cover unique, ambiguous, misleading-first, empty,
partial, and paginated results; a direct presentation regression covers unknown
pagination in both output modes. CLI compatibility passed 69 scenarios. Rust
workspace tests, Clippy, release build, wire/version checks, typecheck, and 112
Bun tests passed locally before the baseline; the feedback regression increases
the passing Bun suite to 113 tests. Bounded independent review and scoped documentation
reconciliation completed before measurement.

Two pre-model diagnostic batches were retained and invalidated, with zero paid
calls. `5139e00` filtered only the first unfiltered page (15 of 2,599 results)
and found no periodic filings. `151cc93` narrowed correctly but anchored the
comparison to the annual cover title, which differed from quarterly/semiannual
covers. Explicit periodic filters and TOC intersection fixed these script defects;
a fictional subprocess regression covers both triggers. The complete batch was
then restarted at `a25fc90`.

## Baseline model outcomes

Every loop ended with a final response. The failed populated body scenario used
its reserved finalization response; all research attempts stopped before the
18-response limit. A completed loop alone is not task success.

| Body scenario | Result | Responses / tools | Disposition |
|---|---|---:|---|
| Populated search | Fail | 6 / 5 | Model discovery/planning failure: wrapper rejection and invalid requests, then help reads without a successful matching search. |
| Explicit no-result search | Pass | 5 / 4 | Successful matching invocation; final prose is outside this track. |
| Company-code filtered search | Pass | 5 / 4 | Successful matching invocation; final prose is outside this track. |

| Research repetition / task | Result | Responses / tools | Provenance / citations | Prose judge | Disposition |
|---|---|---:|---|---|---|
| 1 / exact citation | Fail | 5 / 5 | Fail / fail | Skipped | Model recovery/task failure: stopped after a document-scope fallback, without TOC/section evidence. |
| 1 / comparison | Fail | 9 / 10 | Fail / fail | Skipped | Model task/citation failure: read sections from two filings but cited only one receipt twice; did not complete the required comparable pair. |
| 2 / exact citation | Pass | 7 / 7 | Pass / pass | Completed, 4/5 | Returned section evidence and exact same-report citation passed all gates. |
| 2 / comparison | Fail | 5 / 5 | Fail / fail | Skipped | Model recovery/task failure: two document-scope fallbacks, no section evidence. |
| 3 / exact citation | Fail | 6 / 5 | Pass / fail | Skipped | Final-answer citation/format failure despite valid selected evidence; see diagnostic limit below. |
| 3 / comparison | Fail | 5 / 5 | Fail / fail | Skipped | Model recovery/task failure: two document-scope fallbacks, no section evidence. |

Selected and exploratory evidence explains those dispositions:

- Exact 1 read document-scope `20260319801333`; no section citation was selected.
- Comparison 1 selected `20260318001203` / `section:2`, window `[0,8354)`.
  It also read `20260310002820` / `section:7`, window `[0,39256)`, but did not
  cite that second report. That exploratory body hit the 12,000-character model
  projection limit; the recorded comparison failure is not evidence that a
  larger context would fix the missing two-report citation requirement.
- Exact 2 and exact 3 selected `20260331000460` / `section:3`, window `[0,1425)`;
  both retrieved the same 1,089-character body fingerprint. All selected sections
  above use `document:body:1` and complete source windows.
- Comparisons 2 and 3 read only document-scope `20260319801333` and
  `20260318801867`. Their lack of sections is an expected source shape; other
  returned filings were available, as the fixed paths demonstrate.

**Diagnostic limit:** exact 3 retained a valid receipt/section pair and passing
provenance, but failed citation membership. Given the validator's branches and
one selected document, the remaining failure is an additional unpaired locator
(inferred). The body-free audit does not distinguish an orphan section mention
from a malformed labelled locator. It does not justify claiming a newly proven
parser defect or waiving the failed gate; exact prose was intentionally not
retained. Fictional regressions cover unpaired, malformed, Markdown, cross-report,
and ambiguous-document citation behavior.

## Required post-review batch

PR #35 feedback identified that a duplicated filing with a successful empty TOC
could be inspected twice. `0a92e39d6abdda7ca0f151b002023c9d46c5c93a` records
receipts before inspection and makes the regression independent of the launch
directory. Successful no-TOC recovery still proceeds; actual CLI/source errors
remain fatal, with a fictional regression proving both boundaries. Independent
review passed and CodeRabbit accepted the correction, withdrawing its suggestion
to ignore actual inspection errors.

The plan required a fresh complete batch after this diagnostic implementation
change. The production executable, agent/judge models, prompts, budgets, task
windows, and scoring were unchanged. The first complete baseline above remains
retained; the following results do not replace its failures.

- Frozen source: `0a92e39d6abdda7ca0f151b002023c9d46c5c93a`.
- Manifest: `.tmp/evals/readiness-0a92e39/protocol.json`, SHA-256
  `4d036a65d95542c53bf1a182d0bcf4a84198b5838091dc6e04643d1ebd724da2`.
- Audit index: `.tmp/evals/readiness-0a92e39/outcomes.json`, preserving all nine
  new outcomes and their hashes. Frozen eval-source and executable hashes were
  verified after completion. No additional unreported attempts were made.
- Fixed body 3/3, original workflow, and both deterministic research checks
  passed with the same public locators and windows listed above.

| Body scenario | Result | Responses / tools | Disposition |
|---|---|---:|---|
| Populated search | Pass | 5 / 4 | Successful matching invocation. |
| Explicit no-result search | Pass | 5 / 4 | Successful matching invocation. |
| Company-code filtered search | Pass | 3 / 2 | Successful matching invocation. |

| Research repetition / task | Result | Responses / tools | Provenance / citations | Prose judge | Disposition |
|---|---|---:|---|---|---|
| 1 / exact citation | Fail | 7 / 6 | Pass / fail | Skipped | Final-answer citation/format failure; additional unpaired locator inferred as in baseline exact 3. |
| 1 / comparison | Fail | 5 / 6 | Fail / fail | Skipped | Model recovery/task failure: two document-scope fallbacks, no section evidence. |
| 2 / exact citation | Pass | 6 / 6 | Pass / pass | Completed, 5/5 | All evidence, citation, and prose gates passed. |
| 2 / comparison | Fail | 5 / 6 | Fail / fail | Skipped | Model recovery/task failure: two document-scope fallbacks, no section evidence. |
| 3 / exact citation | Pass | 8 / 7 | Pass / pass | Completed, 5/5 | All evidence, citation, and prose gates passed. |
| 3 / comparison | Fail | 5 / 5 | Fail / fail | Skipped | Model recovery/task failure: two document-scope fallbacks, no section evidence. |

All new loops ended with a final response before reserved finalization. Each
exact attempt selected `20260331000460` / `section:3`, `document:body:1`, complete
window `[0,1425)`, with the same 1,089-character body fingerprint as the baseline.
Every comparison read only document-scope `20260319801333` and `20260318801867`.
No model evidence-projection limit was recorded in the new batch. The diagnostic
limit for an unpaired locator also applies to new exact 1; no prose was retained
to distinguish its specific formatting shape.

## Release disposition

No CLI/SDK source failure, model-request failure, or judge-service failure was
observed in either research sample. The selection defects were repaired before
the baseline; the later duplicate-inspection correction passed a fresh batch. The remaining observed failures concern
model planning/recovery and final-answer citation requirements, with the explicit
unpaired-locator diagnostic limit above. They must not be relabelled as successful research.

The research gate remains unresolved for the release operator. The body track
passed the current batch, but its earlier failed outcome remains part of this
evidence.
This work supplies truthful measurements and the specified guidance repair; it
neither guarantees stochastic model success nor authorizes release tagging,
publication, or provider signoff. Broader recovery scenarios remain in the task
pool. Further prompt/model experiments require a separately declared scope and
must preserve this baseline rather than replacing failed outcomes.
