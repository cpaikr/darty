# Rust vertical workflow feasibility

Status: completed and discarded on 2026-08-22.

This record tests whether a bounded async Rust implementation can satisfy the
reviewed company-search → filing-search → report-viewing wire contract. It is
feasibility evidence, not a retained candidate, dependency policy, public API,
MSRV promise, platform-support claim, or release authorization.

## Decision

Proceed to the retained three-operation Rust SDK candidate. No blocker was
found in the representative default request serialization exercised by the
four-request workflow, streamed response limits, DART charset decoding, the
three parser boundaries, the identifier handoff, or async timeout and
cancellation control. Complete OpenAPI request serialization, including
advanced filters and repeated `publicType`, remains candidate-owned work.

The probe and all Cargo artifacts were deleted after validation. The repository
contains no Rust source, `Cargo.toml`, `Cargo.lock`, or `target` directory from
this experiment.

## Boundary and inputs

- Host: `aarch64-apple-darwin`, macOS; `rustc 1.92.0`, `cargo 1.92.0`.
- Isolation: one private `publish = false` Cargo crate created under the OS
  temporary directory, outside the repository.
- Upstream: a local Axum fake; no live DART response body was fetched or
  retained by the Rust probe.
- Authority: `dart-wire-v1.openapi.yaml` SHA-256
  `484edfdafb0892b4a77756a39111eb2e26a60f26f7ef02e5e482e30b36468293`.
- Companion: `dart-html-viewer-v1.md` SHA-256
  `dc0150c3a54b001d42eed17f84871f689d2286e50401a9dd47fb30cb0d226bb1`.
- Fixture manifest: SHA-256
  `90e8561b2fd78e24d774c2f21c3967b459767d12826a088db6de2aeec15b6dad`.
- Authority lock: SHA-256
  `1a6657aa808cd8130b2884c27bad74e87c11ba2b19b90ea8c94de1c1a4507900`.

## Disposable dependency resolution

The private crate resolved the following direct versions. They demonstrate a
working combination on this host; the retained candidate must choose and
review its own dependency set.

| Role | Resolved crate |
|---|---|
| HTTP and streaming | `reqwest 0.13.4`, `default-features = false`, features `form`, `rustls`, `stream` |
| Async runtime and cancellation | `tokio 1.53.1`, `tokio-util 0.7.19`, `futures-util 0.3.34` |
| DART charset decoding | `encoding_rs 0.8.35` |
| Fictional HTML parsing | `scraper 0.25.0`, `regex 1.13.1` |
| Query serialization | `url 2.5.8` |
| Test-only fake origin | `axum 0.8.9` |

The discarded `Cargo.lock` SHA-256 was
`6c14b74577fd4a97ab5043d8f8230a2c3e6835f271c13cd79139bdcd7370b59a`.

## Deterministic proof matrix

| Proof | Result |
|---|---|
| Default company/report POSTs with the tested `User-Agent`, `Referer`, and UTF-8 form content type; repeated `corpType`; company name; company code; absent `publicType`; exact shell and viewer query replay | passed |
| Company populated, empty, and changed fragments | passed |
| Filing populated, empty, and changed fragments | passed |
| TOC, no-TOC, no-`selected` fallback, and changed report shells | passed |
| Company code → receipt number → shell locator → report content handoff through one fake four-request workflow | passed |
| UTF-8 plus `MS949`, `EUC-KR`, and `KS_C_5601-1987` normalization through WHATWG EUC-KR | passed |
| CP949-only extension bytes and malformed-byte replacement | passed |
| HTTP 503, redirect rejection, wrong media type, and unsupported charset classification | passed |
| Pre-decode 8 MiB search, 16 MiB shell, and 64 MiB content limits at cap + 1 | passed |
| Configured total deadline, idle stalled-body timeout, and cancellation selection | passed |

`cargo fmt --check`, `cargo clippy --all-targets -- -D warnings`, and
`cargo test --locked` passed. The locked suite ran five integration tests with
no failures; the final test run completed in 0.11 seconds after compilation.

The async control cases used these deterministic configurations and asserted
the resulting classification:

| Case | Client configuration | Fake-origin behavior | Asserted result |
|---|---|---|---|
| Total response deadline | 40 ms total, 1 s idle | delayed the response by 150 ms | `SourceUnavailable` |
| Idle body deadline | 2 s total, 40 ms idle | emitted `<p>` and then never completed the body | `SourceUnavailable` |
| Cancellation | 2 s total, 40 ms idle | delayed the response by 150 ms; cancellation triggered after 20 ms | `Cancelled` |

The probe did not retain an independent elapsed-latency measurement for these
cases. The 0.11-second figure is the duration of the complete five-test suite,
not a timeout or cancellation service-level objective.

## Retained-candidate implications

- Keep redirects disabled and stream into the operation-specific raw-byte cap
  before decoding.
- Normalize only the reviewed charset aliases and reject every other declared
  charset.
- Preserve a cancellation token below the public SDK surfaces; choose the
  caller-facing Node and Rust cancellation projections during retained API
  design.
- Use the fictional corpus through an injected transport and add its vertical
  success cases to the black-box CLI judge before acceptance.
- Validate every canonical request instance and the complete OpenAPI form
  surface, including advanced filters and repeated `publicType`; the
  disposable probe covered only the representative default workflow.
- Treat the parser code in this probe as disposable evidence. The retained
  parser must implement the complete companion and public capability contracts,
  including partial-row evidence and stable error projections.

## Not proven

This experiment did not prove complete OpenAPI request serialization beyond
the representative default workflow, including advanced filters or repeated
`publicType`. It also did not decide SDK types, Node FFI mechanics, Clap
structure, npm native-package layout, Markdown conversion, HTML sanitization,
public content windows, production observability, broad live-DART resilience,
performance targets, an MSRV, or support beyond the single host. Those remain
owned by the retained candidate and its acceptance review.
