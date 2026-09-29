# Issue 37: cross-process request pacing

- Scope: 500 ms default shared pacing in the Rust transport; configurable interval
  and local state directory; CLI and Node inherit the SDK policy.
- Base: user authorized fast-forwarding dev to main (4026498), then targeting dev.
- Reproduction: four concurrent fixture CLI processes succeeded with request gaps
  of 0.73, 9.70, and 1.26 ms on Windows. No live DART burst was sent.
- Decision: preserve source_unavailable for connection failures; a reset alone
  does not prove rate limiting. OS file locks release on cancellation/process death.
- Review correction: use a cooldown under the OS lock instead of timestamps;
  expired admissions could otherwise burst after slow setup or task scheduling.
- Local validation: all 90 Rust tests, workspace Clippy, formatting, TypeScript
  typecheck, version agreement, and 14 CLI subprocess checks pass on Windows.
  Four-process request gaps after the fix were approximately 517–522 ms.
- Review: independent code review finding corrected and verified; scoped
  documentation reconciliation complete.
- Limits: Windows CRLF checkout changes fixture hashes (confirmed byte-for-byte
  after CRLF normalization); broad Bun tests include Unix-only assumptions.
  Linux CI must validate those checks and Rust 1.88 compatibility.
- Remaining: PR review, Linux CI, merge, and integrated-state verification.
