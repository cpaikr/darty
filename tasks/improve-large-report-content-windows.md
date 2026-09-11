# Improve large report content windows

## Intended outcome

Very large sections and TOC-less reports have a stable semantic continuation
contract without exposing DART viewer replay parameters.

## Current state

`view-report` already provides bounded content-window behavior needed for
current parity. A broader pagination or chunking design remains unresolved and
remains intentionally unscheduled.

## Next action

Evaluate real large-report cases and choose between a stable cursor and an
explicit content window when this task is scheduled.
