import {
  capabilityInputSchemaToJsonSchema,
  type CapabilityManifest,
} from "../types.ts";
import {
  ContentsSearchRequestSchema,
  contentsSearchInputProperties,
} from "./contract.ts";

export const contentsSearchManifest = {
  name: "contents-search",
  summary: "Search DART filing contents and return structured JSON.",
  description:
    "Semantic, read-only access to DART filing contents search backed by an internal dsab007 replay adapter.",
  inputSchema: ContentsSearchRequestSchema,
  inputProperties: contentsSearchInputProperties,
  notes: [
    "The command accepts semantic parameter names only; DART replay field names stay internal.",
    "DART currently controls page size and pager width for this mode, so those knobs are not part of the public capability contract.",
    "The result groups stable public fields, references, and source evidence instead of echoing parser-owned source rows directly.",
    "Warnings report partial source drift such as dropped rows while preserving recoverable results.",
  ],
  examples: [
    {
      description: "Search recent contents matches for a keyword.",
      input: {
        keyword: "배당",
        startDate: "20250331",
        endDate: "20260331",
      },
    },
    {
      description: "Narrow results with observed company-code and presenter filters.",
      input: {
        keyword: "배당",
        startDate: "20250331",
        endDate: "20260331",
        companyCode: "01368637",
        presenterName: "유일에너테크",
        sortBy: "reportName",
      },
    },
  ],
} as const satisfies CapabilityManifest<typeof ContentsSearchRequestSchema>;

export const contentsSearchInputJsonSchema = capabilityInputSchemaToJsonSchema(
  contentsSearchManifest.inputSchema,
);
