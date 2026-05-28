# Workflow Evals

Multi-step workflow evals are not part of the active CLI-only public surface yet.
The previous typed-tool and Pi workflow runners remain in the tree as historical
scaffolding, but their package scripts are removed and they should not be used as
release gates.

Reintroduce workflow evals through the CLI subprocess surface when the project
needs model-in-the-loop coverage for company lookup, filing search, report
opening, TOC selection, and section retrieval.
