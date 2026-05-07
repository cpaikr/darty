import { capabilitySchemaToJsonSchema } from "../types.ts";
import { CompanyRssRequestSchema, CompanyRssResultSchema } from "./contract.ts";

export const companyRssOperationName = "company-rss";

export const companyRssInputJsonSchema = capabilitySchemaToJsonSchema(
  CompanyRssRequestSchema,
);

export const companyRssResultJsonSchema = capabilitySchemaToJsonSchema(
  CompanyRssResultSchema,
);
