import { capabilitySchemaToJsonSchema } from "../types.ts";
import {
  DisclosureTypesRequestSchema,
  DisclosureTypesResultSchema,
} from "./contract.ts";

export const disclosureTypesOperationName = "disclosure-types";

export const disclosureTypesInputJsonSchema = capabilitySchemaToJsonSchema(
  DisclosureTypesRequestSchema,
);

export const disclosureTypesResultJsonSchema = capabilitySchemaToJsonSchema(
  DisclosureTypesResultSchema,
);
