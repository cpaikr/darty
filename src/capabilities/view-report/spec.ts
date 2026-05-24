import { JSONSchema } from "effect";

import { capabilitySchemaToJsonSchema } from "../types.ts";
import {
  ViewReportRequestSchema,
  ViewReportResultSchema,
} from "./contract.ts";

export const viewReportOperationName = "view-report";

export const viewReportInputJsonSchema = capabilitySchemaToJsonSchema(
  ViewReportRequestSchema,
);

const viewReportTocNodeJsonSchema: JSONSchema.JsonSchema7 = {
  type: "object",
  required: ["id", "title", "children"],
  properties: {
    id: {
      type: "string",
      description:
        "TOC section ID returned by darty. Use only as a follow-up view-report sectionId for the same receipt/documentId.",
    },
    title: {
      type: "string",
      description: "Section title shown in the DART viewer TOC.",
    },
    children: {
      type: "array",
      description: "Child TOC sections.",
      items: { $ref: "#/$defs/ViewReportTocNode" },
    },
  },
  additionalProperties: false,
};

export const viewReportResultJsonSchema: JSONSchema.JsonSchema7Root = {
  ...capabilitySchemaToJsonSchema(ViewReportResultSchema),
  $defs: {
    ViewReportTocNode: viewReportTocNodeJsonSchema,
  },
};
