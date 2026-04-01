import type { OperationSpec } from "./types.ts";
import { dsab007ContentsInputParameters } from "./dsab007-contents-input.ts";

/**
 * Shared operation contract for the first implemented `dsab007` search mode.
 *
 * The CLI already consumes this spec to build flags, help text, examples, and
 * default reporting. Keeping that metadata here leaves room for later MCP or
 * SDK transports to expose the same semantic operation surface without drifting
 * from the shared resolver.
 */
export const dsab007ContentsOperationSpec = {
  name: "dsab007-contents",
  summary: "Search DART dsab007 contents and return structured JSON.",
  description:
    "Semantic, read-only access to DART's dsab007 contents search. Public inputs stay agent-friendly while the DART replay contract remains internal.",
  parameters: dsab007ContentsInputParameters,
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
