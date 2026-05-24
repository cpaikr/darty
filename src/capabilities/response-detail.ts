import { Schema } from "effect";

export const responseDetailValues = ["concise", "detailed", "raw"] as const;
export type ResponseDetail = (typeof responseDetailValues)[number];

export const ResponseDetailSchema = Schema.Literal(...responseDetailValues);

export const responseDetailFieldSpec = {
  kind: "enum",
  enumValues: responseDetailValues,
  defaultValue: "concise",
  schema: ResponseDetailSchema,
  description:
    "[default: concise] Supplemental field level included in the response. This does not change source retrieval or body rendering. concise keeps follow-up references only; detailed/raw include source evidence or locators. raw still does not return full DART source HTML/XML.",
  examples: ["concise", "detailed", "raw"],
} as const;

export const responseDetailCliDescriptions = {
  sourceEvidence:
    "[default: concise] Source evidence detail level. evidence contains parser-check fields such as raw DART row text or snippet HTML. concise omits it; detailed/raw include it. raw still does not return full DART source HTML. Use --verbose with the CLI to see evidence.",
  viewReport:
    "[default: concise] Supplemental locator detail level. Locators are documents/toc identifier lists used for follow-up retrieval. This does not change content.body rendering or windows. For sectionId requests, concise omits documents/toc; detailed/raw include them.",
  companyRss:
    "[default: concise] Supplemental RSS field detail level. concise returns channel title/link and key item fields; detailed/raw include channel description/language/publishedAt and item guid. raw still does not return full RSS XML.",
} as const;

export const normalizeResponseDetail = (
  detail: ResponseDetail | undefined,
): ResponseDetail => detail ?? "concise";

export const includesSourceEvidence = (
  detail: ResponseDetail | undefined,
): boolean => normalizeResponseDetail(detail) !== "concise";
