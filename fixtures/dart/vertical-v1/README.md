# DART Vertical v1 Fixtures

This corpus is independently fictional, cross-language evidence for
`dart-wire-v1`. It contains no retained live DART response body and is not a
wire or public capability authority.

`manifest.json` matches fixtures by actual method, path, required headers, and
complete form/query values. Body hashes make drift explicit. The MS949 body is
the CP949 encoding of its paired UTF-8 body and contains an extension byte
that strict EUC-KR rejects; the repository check proves WHATWG decoding after
normalizing all three accepted charset aliases. A separate hex-encoded byte
fixture proves malformed-byte replacement. Language-neutral expected
projections make success, empty, partial, and drift outcomes independently
checkable.

Run:

```bash
bun run check:dart-wire
```

The active TypeScript CLI does not gain a fixture transport seam. The retained
Rust candidate will consume this corpus through an injected test transport,
and fixture-backed success and `--agent` cases will enter the black-box judge
before candidate acceptance.
