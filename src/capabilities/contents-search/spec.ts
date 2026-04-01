import type { CapabilitySpec } from "../types.ts";
import { contentsSearchParameters } from "./contract.ts";

export const contentsSearchCapability = {
  name: "contents-search",
  summary: "Search DART filing contents and return structured JSON.",
  description:
    "Semantic, read-only access to DART filing contents search backed by an internal dsab007 replay adapter.",
  parameters: contentsSearchParameters,
  notes: [
    "The command accepts semantic parameter names only; DART replay field names stay internal.",
    "DART currently controls page size and pager width for this mode, so those knobs are not part of the public capability contract.",
    "The result groups stable public fields, references, and source evidence instead of echoing parser-owned source rows directly.",
    "Warnings report partial source drift such as dropped rows while preserving recoverable results.",
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
      ],
    },
    {
      description: "Narrow results with observed company-code and presenter filters.",
      argv: [
        "--keyword",
        "배당",
        "--start-date",
        "20250331",
        "--end-date",
        "20260331",
        "--company-code",
        "01368637",
        "--presenter-name",
        "유일에너테크",
        "--sort-by",
        "reportName",
      ],
    },
  ],
} as const satisfies CapabilitySpec;
