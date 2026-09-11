# Automatic invocation evaluation

On 2026-09-11, the user requested implicit invocation for the consumer skill.
The revision enables the Codex adapter policy and replaces the explicit-only
description with DART retrieval triggers. Runtime instructions are unchanged
from the [previous evaluation](evaluation.md); behavior trials were not repeated.
README now describes automatic selection after installation and retains explicit
invocation as an option. No installation or publication was performed.

## Synthetic trigger assessment

Expected classifications were fixed before one independent reviewer assessed
the candidate. This was a descriptive assessment in one fresh worker, not
isolated per-prompt host activation trials. Every classification matched:

| Request | Expected and assessed |
| --- | --- |
| `$darty find Samsung filings` | Activate: explicit invocation |
| Find Samsung DART filings from 2025 | Activate: filing list |
| Search Korean disclosures mentioning a factory closure | Activate: body search |
| Retrieve the auditor section from this DART viewer URL | Activate: section retrieval |
| Integrate Darty Node SDK | Do not activate: SDK work |
| Fix Darty Rust parser | Do not activate: development |
| Explain depreciation generally | Do not activate: no DART evidence needed |
| Get Samsung stock price on KRX | Do not activate: market data |
| Find Samsung reports | Ambiguous: insufficient context to force DART selection |

## Validation and limits

YAML parsing, adapter/description consistency, direct resource links, and
`git diff --check` passed. The bounded independent code review found no
actionable issue; changed metadata passed the authoring and portability review.
The affected README and historical evaluation were reconciled with the policy.

The source change is complete. Actual installed-host selection and trigger
reliability remain unverified; the descriptive assessment does not establish
an empirical activation rate. The historical manual-only trigger results apply
only to the previous candidate. No executable, SDK, or CLI contract changed.
