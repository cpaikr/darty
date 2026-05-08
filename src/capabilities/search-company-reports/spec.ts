import { capabilitySchemaToJsonSchema } from "../types.ts";
import {
  SearchCompanyReportsRequestSchema,
  SearchCompanyReportsResultSchema,
} from "./contract.ts";

export const searchCompanyReportsOperationName = "search-company-reports";

export const searchCompanyReportsInputJsonSchema = capabilitySchemaToJsonSchema(
  SearchCompanyReportsRequestSchema,
);

export const searchCompanyReportsResultJsonSchema = capabilitySchemaToJsonSchema(
  SearchCompanyReportsResultSchema,
);
