import type { OperationSpec } from "./types.ts";
import { contentsSearchInputParameters } from "./contents-search-input.ts";

/**
 * Shared operation contract for the first implemented contents-search capability.
 *
 * The CLI already consumes this spec to build flags, help text, examples, and
 * default reporting. Keeping that metadata here leaves room for later MCP or
 * SDK transports to expose the same semantic operation surface without drifting
 * from the shared resolver.
 */
export const contentsSearchOperationSpec = {
  name: "contents-search",
  summary: "Search DART filing contents and return structured JSON.",
  description:
    "Semantic, read-only access to DART filing contents search backed by dsab007. Public inputs stay agent-friendly while the DART replay contract remains internal.",
  parameters: contentsSearchInputParameters,
  notes: [
    "The command accepts semantic parameter names only; DART replay field names stay internal.",
    "Status labels show how directly the upstream field meaning is confirmed: observed, inferred, unverified.",
    "The command always prints JSON to stdout and reserves stderr for errors.",
    "The echoed request payload uses resolved semantic parameter names.",
  ],
  examples: [
    {
      description: "Search recent contents matches for a keyword.",
      argv: [
        "--keyword",
        "배당",
        "--start-date",
        "20250331",
        "--end-date",
        "20260331",
        "--sort-by",
        "date",
      ],
    },
    {
      description: "Narrow results with an observed presenter filter.",
      argv: [
        "--keyword",
        "배당",
        "--start-date",
        "20250331",
        "--end-date",
        "20260331",
        "--presenter-name",
        "IR",
        "--sort-direction",
        "asc",
      ],
    },
  ],
} as const satisfies OperationSpec;
