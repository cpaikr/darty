# Improve large report content windows

## Outcome

Very large sections and TOC-less reports have a stable semantic continuation
contract without exposing DART viewer replay parameters.

## Current state

`view-report` already provides bounded content-window behavior needed for
current parity. A broader pagination or chunking design remains unresolved and
was recorded in the legacy `TODO.md`.

## Next action

Evaluate real large-report cases and choose between a stable cursor and an
explicit content window after the Rust rewrite cutover.
