# Fictional parity wire corpus

Purpose: independent request and response evidence for body search, company
detail, and RSS under `docs/specs/dart-wire-v1.openapi.yaml` and its HTML/XML
companion. Every company, identifier, and body is invented; no live source body
was copied. Fixtures do not qualify provider access or production approval.

`manifest.json` contains exact complete requests, response SHA-256 hashes,
contract rule IDs, and selected semantic assertions. Expected objects are
partial assertions, not permission to omit other capability fields. Request
matching includes absent/empty values and mirrored body-search fields. Header
names are case-insensitive; user-agent must be present, not a fixed browser
impersonation string. No fixture ID is a substitute for matching wire input.

Body cases cover success, empty results, dropped unsafe links, missing result
structure, mixed empty/data grammar, nondefault page/report-title ordering with
company/presenter/report filters, and mismatched company-code row rejection. Detail covers all optional field labels,
recognized not-found, sparse success, missing table, and missing name label.
RSS covers populated/empty channels, optional fields, date precedence, CDATA,
missing channel link, and a malformed item that invalidates the whole feed.
Separate invalid XML and DTD cases assert the documented Rust safety decision;
they intentionally do not use permissive TypeScript parsing as an oracle.
Generated node-count and byte-cap recipes avoid retaining large filler files.
The byte cap fails before parsing; the node cap bounds parser allocation.

Static disclosure types and report guide need no source fixtures; the independent
CLI acceptance corpus owns their exact outputs. Rust SDK integration tests
consume the complete request corpus; CLI and packaged Node checks compare the
public projections with independently authored expectations.
