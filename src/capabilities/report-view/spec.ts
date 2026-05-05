import { JSONSchema } from "effect";

import { capabilitySchemaToJsonSchema } from "../types.ts";
import {
  ReportViewRequestSchema,
  ReportViewResultSchema,
} from "./contract.ts";

export const reportViewOperationName = "report-view";

export const reportViewInputJsonSchema = capabilitySchemaToJsonSchema(
  ReportViewRequestSchema,
);

const reportViewTocNodeJsonSchema: JSONSchema.JsonSchema7 = {
  type: "object",
  required: ["id", "title", "children"],
  properties: {
    id: { type: "string" },
    title: { type: "string" },
    children: {
      type: "array",
      items: { $ref: "#/$defs/ReportViewTocNode" },
    },
  },
  additionalProperties: false,
};

export const reportViewResultJsonSchema: JSONSchema.JsonSchema7Root = {
  ...capabilitySchemaToJsonSchema(ReportViewResultSchema),
  $defs: {
    ReportViewTocNode: reportViewTocNodeJsonSchema,
  },
};
