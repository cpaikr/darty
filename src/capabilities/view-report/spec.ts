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
        "darty가 반환한 목차 섹션 ID. 같은 receipt/documentId의 후속 view-report sectionId로만 사용하세요.",
    },
    title: {
      type: "string",
      description: "DART viewer 목차에 표시된 섹션 제목.",
    },
    children: {
      type: "array",
      description: "하위 목차 섹션.",
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
