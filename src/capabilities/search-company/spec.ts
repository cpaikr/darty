import { capabilitySchemaToJsonSchema } from "../types.ts";
import {
  SearchCompanyRequestSchema,
  SearchCompanyResultSchema,
} from "./contract.ts";

export const searchCompanyOperationName = "search-company";

export const searchCompanyInputJsonSchema = capabilitySchemaToJsonSchema(
  SearchCompanyRequestSchema,
);

export const searchCompanyResultJsonSchema = capabilitySchemaToJsonSchema(
  SearchCompanyResultSchema,
);
