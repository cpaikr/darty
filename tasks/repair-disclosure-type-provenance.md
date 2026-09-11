# Repair disclosure-type provenance

## Intended outcome

`disclosure-types` returns reachable, immutable provenance for its retained
DART detail-code catalog.

## Current state

The catalog data remains locally retained and tested. **Observed 2026-08-24:**
the immutable
[`sjunepark/open-dart@85e7a07` source URL](https://github.com/sjunepark/open-dart/blob/85e7a07dee1d24cd810c705c1400c4ac3bbf6add/src/docs/pblntf_detail_ty.md)
returns 404. Documentation records the source as unavailable instead of
presenting the link as current evidence.

## Next step

Locate a reachable immutable upstream source for the same code set, compare it
with the retained table, update implementation metadata and affected contracts,
and run the Rust SDK and CLI compatibility checks. If no authoritative source
is recoverable, explicitly adopt the reviewed local catalog as project-owned
data with a documented review procedure.
