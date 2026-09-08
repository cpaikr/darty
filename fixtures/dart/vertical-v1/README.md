# DART Vertical v1 Fixtures

This corpus is independently fictional, cross-language evidence for
`dart-wire-v1`. It contains no retained live DART response body and is not a
wire or public capability authority. HTTP fields and routes are canonical in
[`dart-wire-v1.openapi.yaml`](../../../docs/specs/dart-wire-v1.openapi.yaml);
decoding and HTML/viewer grammar are canonical in the
[`dart-html-viewer-v1` companion](../../../docs/specs/dart-html-viewer-v1.md).

`manifest.json` matches fixtures by actual method, path, required headers, and
complete form/query values. Body hashes make drift explicit. The MS949 body is
the CP949 encoding of its paired UTF-8 body and contains an extension byte
that strict EUC-KR rejects; the repository check proves WHATWG decoding after
normalizing all three accepted charset aliases. A separate hex-encoded byte
fixture proves malformed-byte replacement. Language-neutral expected
projections make success, empty, partial, and drift outcomes independently
checkable. Fault recipes model redirects, media-type drift, oversized bodies,
decode failures, timeouts, and truncated streams without depending on the live
provider.

Run:

```bash
bun run check:dart-wire
```

The Rust SDK consumes this corpus through an injected transport for SDK,
CLI, `--agent`, and package acceptance checks. Fast injected deadline cases are
transport-failure equivalents, not proof of production timing; Rust transport
tests separately assert configured deadlines. Fixture-only features are not
production behavior or provider qualification.
