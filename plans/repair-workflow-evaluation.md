# Make workflow evaluation trustworthy

## Outcome

The existing section-citation and related-filings evaluations faithfully expose
CLI behavior and judge supported final evidence. Valid discovery, exploration,
document fallback, and citation formatting cannot produce false product failures;
invented identifiers, unsupported claims, and incomplete tasks still fail.

## Current state

Scheduled, not implemented. Review baseline is `a40b82adc8ce0137ec82afc98c473b40bf94d363`.
The Rust rewrite and the js-yaml audit fix are on main; v0.6.1 is unpublished.
The existing workflow tests pass but omit the cases below.

Observed on 2026-09-09 with the installed candidate and `gpt-5.4-mini`:

- Both original research runs used ten model responses and ended without a final
  answer. One never viewed a report; the other selected two no-TOC documents.
- The harness rejected `darty help`; the real CLI accepts it and `help view-report`.
- A control adding only neutral `--help` onboarding obtained valid section
  evidence in six model responses. Scoring rejected `section:4**` from a bold
  Markdown citation. The answer judge did not run.
- A direct six-call CLI control retrieved matching sections from two related
  filings and passed the unchanged comparison trace check. These observations
  establish harness defects and an available retrieval path, not a model success
  rate or a completed release gate.

The source paths and independent regressions below are sufficient to reproduce
these issues in a fresh checkout; ignored live artifacts are optional diagnostics.

## Next action

Reproduce the confirmed false negatives through the current runner and scoring
entry points using fictional responses, then repair discovery and evidence
scoring without changing the two user-task intents.

## Target and ownership

- Keep the existing CLI subprocess runner and shared model loop. DART semantics
  remain in Rust; evaluation code must not become a second provider conformer.
- Keep both research tasks. Their purpose is evidence retrieval and exact
  citation, not obedience to one search sequence or a preferred prose format.
- `evals/workflows/agent-tools.ts` owns permitted workflow invocations;
  `evals/harness/model-loop.ts` owns bounded execution and termination reporting.
- Workflow evidence collection owns observed receipts, company identity, returned
  TOCs, content scope, retrieval order, and content windows. Citation membership
  and the final prose judge consume that same evidence.
- Preserve raw subprocess outcomes for diagnosis. A failure report must distinguish
  wrapper rejection, CLI/source failure, budget exhaustion, task/provenance
  failure, citation-format failure, and unavailable/failed prose judging.
- Do not turn a no-TOC document into a fabricated section. Preserve the existing
  [view-report contract](../docs/specs/dsaf001-view-report-v1.md) and
  [CLI transport](../docs/specs/cli-transport-v1.md).

## Implementation slices

### Discovery and bounded execution

Inspect both workflow and body-search wrappers so supported help behavior does
not diverge between them. Accept root help and help for each wrapper's permitted
commands, including `help <command>`, `--help`, and `-h` forms supported by the
actual executable. Preserve argv bounds, the operation allowlist, secret-free
child environments, timeout termination, and shell-free execution. Do not enable
unrelated operations merely because the CLI exposes them.

Return an explicit termination reason from the shared loop: final response,
response-budget exhaustion, or a distinct failed request/tool outcome. Preserve
contextual error information without exposing keys. Record consumed responses
and tool calls; multiple calls in one response must remain distinguishable.
Reserve a bounded opportunity to produce a final response after the last tool
result, with tools disabled for that finalization. An admission that evidence is
missing is useful diagnostics, not a successful task answer. Do not add unbounded
retries or convert exhausted/incomplete runs into passes. The next plan calibrates
the declared workflow budget; this slice makes its enforcement observable.

### Scope-aware evidence and supported final citations

Refactor the scoring flow so collection precedes final-evidence selection and
validation. Keep the smallest concrete evidence model needed by the two tasks.

- Classify `content.scope` before collecting section evidence. Document-scope
  fallback is valid retrieval but does not satisfy a required section citation.
  A later successful section retrieval may recover from that exploratory choice.
- Treat search results as candidates. Apply scenario company/date requirements
  to the filings actually used as answer evidence, while checking source results
  against their own request and authoritative identifiers where appropriate.
- Allow narrower or successive searches within the task window. Out-of-window
  final evidence must fail. A different query strategy alone must not fail.
- Allow extra exploratory sections and filings. For comparison, require the
  final selected evidence to include two distinct receipts and matching normalized
  section titles, with each section obtained after its own report's TOC.
- Validate every asserted final citation. Unknown IDs, wrong-company evidence,
  cross-report section pairs, and citations to unseen content must still fail,
  even if another valid pair is also present.
- Recognize ordinary inline-code, bold, italic, link-label, and punctuation
  formatting without broad substring matching or prefix acceptance. IDs remain
  opaque values checked against returned evidence. Distinguish narrative mentions
  of known receipts from citation pairs; an invented identifier or a claimed
  unsupported pairing must not be silently ignored.

Do not replace independent acceptance fixtures with generated expectations.
Retain explicit negatives for wrong ordering, guessed company codes, malformed
successful results, empty section bodies, and absent comparison evidence.

### Evidence-consistent model messages and prose judging

`agent-assertions.ts` currently sends only the first 1,200 section characters to
the judge, while the model may read substantially more. `tool-trace.ts` truncates
stdout text separately. Give the model and judge one explicit, bounded view of
retrieved evidence and record that view in the run artifact.

Preserve receipt/section identity, source references, content scope/window,
warnings, and continuation hints when limiting body text. Do not cut a serialized
JSON envelope mid-field and then represent it as complete. Keep full subprocess
output separate from the model-facing view. The judge must receive the exact
selected windows available to the agent, not an unrelated shorter prefix; claims
outside those windows cannot pass. If evidence cannot fit the declared budget,
report that limitation instead of misclassifying it as unsupported prose.

Keep the existing grounded-answer rubric and deterministic citation gate. Treat
retrieved content and the agent answer as untrusted data. Judge unavailability,
invalid output, skipped judging, and a completed negative judgment are distinct;
none is a pass. Avoid a new general-purpose eval framework or a second judge path.

## Acceptance and validation

| Regression | Required result |
|---|---|
| Supported help invoked through the real wrapper | Same help outcome as direct CLI; forbidden commands remain rejected |
| TOC-less document followed by successful section recovery | Document is not malformed; final section evidence can pass |
| Document-only evidence for a section task | Task fails for missing required section evidence |
| Valid pair rendered in supported Markdown formats | Same returned receipt/section identity is recognized |
| Narrative known receipt plus a valid citation | No false unpaired-citation failure |
| Invented, prefix-only, or cross-report citation | Fails even alongside valid citations |
| Narrower eligible searches and extra exploratory reads | Valid final evidence can pass |
| Cited out-of-window/wrong-company filing or unrelated section titles | Fails |
| Exhausted loop, last-turn tool output, multi-call response | Explicit bounded termination; no fabricated completion |
| Claim supported after character 1,200 in an observed window | Judge sees the same evidence; no artificial prefix-only rejection |
| Truncated model view or unavailable judge | Limitation is explicit; never silently passes |

Start with `bun test evals/workflows` and relevant harness tests. Extend the
existing independent fixtures and use a deterministic fake model transport for
loop/finalization cases. Run `bun run typecheck`, `bun test`, and the repository's
required CI checks. Use real installed-CLI help calls for discovery regressions.
No hosted-model calls are needed to prove these deterministic fixes.

## Completion

All listed regression pairs are covered and pass; original false negatives are
reproduced before repair; failure categories and observed-evidence boundaries are
explicit; existing meaningful negative checks remain effective. Update
[eval documentation](../evals/README.md) and
[workflow documentation](../evals/workflows/README.md) to describe implemented
behavior, without claiming model readiness. Complete bounded code review and
scoped documentation harmonization. Proceed to the next scheduled plan only
under the executing goal's contract.
