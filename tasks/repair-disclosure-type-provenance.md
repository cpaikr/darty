# Repair disclosure-type provenance

## Outcome

`disclosure-types` returns reachable, immutable provenance for its retained
DART detail-code catalog.

## Current state

The catalog data remains locally retained and tested, but the pinned
`sjunepark/open-dart` GitHub repository/commit URL in
`src/capabilities/disclosure-types/data.ts` returns 404. Documentation records
the source as unavailable instead of presenting the link as current evidence.

## Next step

Locate a reachable immutable upstream source for the same code set, compare it
with the retained table, update implementation metadata and affected contracts,
and run the TypeScript and CLI compatibility checks. If no authoritative source
is recoverable, explicitly adopt the reviewed local catalog as project-owned
data with a documented review procedure.
