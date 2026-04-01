import {
  describeDsab007ContentsSearchInput,
} from "../../dart/dsab007/contracts.ts";
import type { OperationSpec } from "./types.ts";

const requiredParameterKeys = new Set(["keyword", "startDate", "endDate"]);

const defaultValues = {
  currentPage: "1",
  maxResults: "10",
  maxLinks: "10",
  sort: "DATE",
  sortType: "desc",
} as const satisfies Partial<Record<
  | "currentPage"
  | "maxLinks"
  | "maxResults"
  | "sort"
  | "sortType",
  string
>>;

export const dsab007ContentsOperationSpec = {
  name: "dsab007-contents",
  summary: "Replay DART dsab007 contents search and return structured JSON.",
  description:
    "Low-level read-only replay of DART's dsab007 contents search. The output stays DART-shaped so the same operation metadata can back CLI, MCP, or SDK layers.",
  parameters: describeDsab007ContentsSearchInput()
    .filter((parameter) => parameter.key !== "option")
    .map((parameter) => ({
      key: parameter.key,
      aliases: parameter.aliases,
      cliFlags: parameter.cliFlags,
      valueHint: parameter.valueHint,
      description: parameter.description,
      status: parameter.status,
      required: requiredParameterKeys.has(parameter.key),
      defaultValue:
        parameter.key in defaultValues
          ? defaultValues[parameter.key as keyof typeof defaultValues]
          : undefined,
    })),
  notes: [
    "Semantic aliases are preferred when available; raw DART-shaped aliases remain accepted for debugging.",
    "Status labels show how directly the upstream field meaning is confirmed: observed, inferred, unverified.",
    "The command always prints JSON to stdout and reserves stderr for errors.",
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
      ],
    },
  ],
} as const satisfies OperationSpec;
