import { capabilitySchemaToJsonSchema } from "../types.ts";
import {
  CompanyDetailRequestSchema,
  CompanyDetailResultSchema,
} from "./contract.ts";

export const companyDetailOperationName = "company-detail";

export const companyDetailInputJsonSchema = capabilitySchemaToJsonSchema(
  CompanyDetailRequestSchema,
);

export const companyDetailResultJsonSchema = capabilitySchemaToJsonSchema(
  CompanyDetailResultSchema,
);
