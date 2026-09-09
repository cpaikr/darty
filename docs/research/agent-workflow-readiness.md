# Agent workflow readiness evidence

Status: protocol declared; measurement pending. This is diagnostic evidence for
the [readiness plan](../../plans/validate-agent-workflow-readiness.md), not release
signoff or provider approval.

## Declared protocol

The batch will freeze the implementation commit, absolute production executable
path and SHA-256, prompt/scenario source hashes, model settings, and start time
in an ignored manifest before the first live check. Agent and judge both use
`gpt-5.4-mini`; no model substitution or post-failure budget increase is allowed.

Run serially: the three fixed body scenarios, the fixed report workflow including
same-report and two-report deterministic citation checks, one complete body-agent
suite, then three repetitions of the two existing research scenarios (six
outcomes). Keep the original 20250331–20260331 research windows and task intents.
The workflow budget is 18 responses with the last reserved for tool-free
finalization; the body budget is six. The [workflow documentation](../../evals/workflows/README.md#execution-and-diagnostics)
owns budget rationale, neutral onboarding, projection bounds, and scoring.

Provider requests stay serial with SDK pacing, finite deadlines, and no automatic
DART retry. Model requests use the existing bounded transport policy. Persist
only audit metadata under the [provider retention boundary](dart-provider-qualification.md#retention).
All outcomes count; an implementation/prompt change invalidates the mixed batch
and requires a fresh declared batch while retaining the earlier metadata.

## Pre-model diagnostic correction

Batch `5139e00` stopped before any paid call: fixed body checks and the original
four-step workflow passed, but the new deterministic comparison found no periodic
filings on the first unfiltered page (15 of 2,599 results). This was a fixed
selection-script defect, not a DART or model failure. The diagnostic now requests
help-documented A001/A002/A003 disclosure types before its bounded selection;
a fictional subprocess regression covers a first page containing only unrelated
filings. The earlier metadata remains retained; the complete batch is restarted
under a new source identity.

Batch `151cc93` also stopped before paid calls: the narrowed search returned four
periodic filings, but the script anchored comparison to the annual report cover
title, which differs from quarterly/semiannual covers. The diagnostic now
intersects returned TOC titles before reading the pair. The fictional regression
includes differing covers and a later shared section. This was a second fixed
selection defect; both stopped batches remain separate from the model sample.

## Current disposition

The CLI no longer recommends the first ambiguous company. Independent fictional
release-CLI checks cover unique, ambiguous, misleading-first, empty, partial,
and paginated results; unknown pagination has a direct presentation regression.
The fixed research checks reuse the repaired evidence and citation gates.
Measurements, source identity, per-attempt outcomes, and release disposition will
be recorded here after the declared batch. Release tagging, publication, provider
approval, and operator signoff are outside this work.
