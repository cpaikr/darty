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
    id: { type: "string" },
    title: { type: "string" },
    children: {
      type: "array",
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
