import { capabilitySchemaToJsonSchema } from "../types.ts";
import {
  ContentsSearchRequestSchema,
  ContentsSearchResultSchema,
} from "./contract.ts";

export const contentsSearchOperationName = "contents-search";

export const contentsSearchInputJsonSchema = capabilitySchemaToJsonSchema(
  ContentsSearchRequestSchema,
);

export const contentsSearchResultJsonSchema = capabilitySchemaToJsonSchema(
  ContentsSearchResultSchema,
);
