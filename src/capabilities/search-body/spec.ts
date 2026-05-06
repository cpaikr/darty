import { capabilitySchemaToJsonSchema } from "../types.ts";
import {
  SearchBodyRequestSchema,
  SearchBodyResultSchema,
} from "./contract.ts";

export const searchBodyOperationName = "search-body";

export const searchBodyInputJsonSchema = capabilitySchemaToJsonSchema(
  SearchBodyRequestSchema,
);

export const searchBodyResultJsonSchema = capabilitySchemaToJsonSchema(
  SearchBodyResultSchema,
);
