import { JSONSchema, type Schema } from "effect";

/**
 * Exposes a capability-owned Effect schema as JSON Schema for transports or
 * tooling that need a machine-readable contract.
 */
export const capabilitySchemaToJsonSchema = <A, I, R>(
  schema: Schema.Schema<A, I, R>,
): JSONSchema.JsonSchema7Root => ({
  $schema: "https://json-schema.org/draft/2020-12/schema",
  ...JSONSchema.fromAST(schema.ast, {
    definitions: {},
    target: "jsonSchema2020-12",
    topLevelReferenceStrategy: "skip",
  }),
});
