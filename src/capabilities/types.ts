import { JSONSchema, Option, SchemaAST, type Schema } from "effect";

type CliFlag = `--${string}`;

export type CapabilityParameterStatus =
  | "observed"
  | "inferred"
  | "unverified";

export type CapabilityInputPropertyType =
  | "string"
  | "number"
  | "integer"
  | "boolean";

export type CapabilityExampleValue = string | number | boolean;

export type CapabilityInputMetadata = {
  readonly description: string;
  readonly aliases?: readonly string[];
  readonly cliValueHint?: string | undefined;
  readonly status?: CapabilityParameterStatus | undefined;
  readonly defaultValue?: CapabilityExampleValue | undefined;
};

export type CapabilityInputProperty = CapabilityInputMetadata & {
  readonly key: string;
  readonly aliases: readonly string[];
  readonly cliFlags: readonly CliFlag[];
  readonly status: CapabilityParameterStatus;
  readonly required: boolean;
  readonly type: CapabilityInputPropertyType;
  readonly defaultValue?: CapabilityExampleValue | undefined;
  readonly enumValues?: readonly CapabilityExampleValue[] | undefined;
  readonly minimum?: number | undefined;
  readonly maximum?: number | undefined;
  readonly minLength?: number | undefined;
  readonly pattern?: string | undefined;
};

export type CapabilityExampleInput<
  InputSchema extends Schema.Schema<any, any, any>,
> = Readonly<Schema.Schema.Encoded<InputSchema>>;

export type CapabilityExample<
  InputSchema extends Schema.Schema<any, any, any>,
> = {
  readonly description: string;
  readonly input: CapabilityExampleInput<InputSchema>;
};

export type CapabilityManifest<
  InputSchema extends Schema.Schema<any, any, any>,
> = {
  readonly name: string;
  readonly summary: string;
  readonly description: string;
  readonly inputSchema: InputSchema;
  readonly inputProperties: readonly CapabilityInputProperty[];
  readonly notes: readonly string[];
  readonly examples: readonly CapabilityExample<InputSchema>[];
};

const capabilityInputMetadataAnnotationId = Symbol.for(
  "darty/capabilities/inputMetadata",
);

type AnnotatableSchema<S> = S & {
  annotations: (
    annotations: Record<PropertyKey, unknown>,
  ) => S;
};

type CapabilityConstraintSummary = {
  readonly type?: CapabilityInputPropertyType | undefined;
  readonly defaultValue?: CapabilityExampleValue | undefined;
  readonly enumValues?: readonly CapabilityExampleValue[] | undefined;
  readonly minimum?: number | undefined;
  readonly maximum?: number | undefined;
  readonly minLength?: number | undefined;
  readonly pattern?: string | undefined;
};

type MutableCapabilityConstraintSummary = {
  type?: CapabilityInputPropertyType | undefined;
  defaultValue?: CapabilityExampleValue | undefined;
  enumValues?: readonly CapabilityExampleValue[] | undefined;
  minimum?: number | undefined;
  maximum?: number | undefined;
  minLength?: number | undefined;
  pattern?: string | undefined;
};

const getCapabilityInputMetadata = (
  annotated: SchemaAST.Annotated,
): CapabilityInputMetadata | undefined =>
  Option.getOrUndefined(
    SchemaAST.getAnnotation<CapabilityInputMetadata>(
      annotated,
      capabilityInputMetadataAnnotationId,
    ),
  );

const getPropertyDescription = (property: SchemaAST.PropertySignature): string =>
  Option.getOrElse(
    SchemaAST.getDescriptionAnnotation(property),
    () =>
      Option.getOrElse(
        SchemaAST.getDescriptionAnnotation(property.type),
        () => "Undocumented input property.",
      ),
  );

const getScalarCapabilityExampleValue = (
  value: unknown,
): CapabilityExampleValue | undefined => {
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  return undefined;
};

const getCapabilityInputTypeFromValue = (
  value: CapabilityExampleValue,
): CapabilityInputPropertyType =>
  typeof value === "string"
    ? "string"
    : typeof value === "boolean"
      ? "boolean"
      : "number";

const mergeConstraintSummaries = (
  base: CapabilityConstraintSummary,
  overrides: CapabilityConstraintSummary,
): CapabilityConstraintSummary => ({
  ...base,
  ...overrides,
});

const getJsonSchemaConstraintSummary = (
  annotated: SchemaAST.Annotated,
): CapabilityConstraintSummary => {
  const jsonSchema = Option.getOrUndefined(
    SchemaAST.getJSONSchemaAnnotation(annotated),
  );

  if (jsonSchema === undefined || typeof jsonSchema !== "object") {
    return {};
  }

  const summary: MutableCapabilityConstraintSummary = {};

  if (
    "type" in jsonSchema &&
    (jsonSchema.type === "string" ||
      jsonSchema.type === "number" ||
      jsonSchema.type === "integer" ||
      jsonSchema.type === "boolean")
  ) {
    summary.type = jsonSchema.type;
  }

  if ("enum" in jsonSchema && Array.isArray(jsonSchema.enum)) {
    const enumValues = jsonSchema.enum
      .map(getScalarCapabilityExampleValue)
      .filter((value) => value !== undefined);

    if (enumValues.length === jsonSchema.enum.length) {
      summary.enumValues = enumValues;
    }
  }

  if ("default" in jsonSchema) {
    summary.defaultValue = getScalarCapabilityExampleValue(jsonSchema.default);
  }

  if ("minimum" in jsonSchema && typeof jsonSchema.minimum === "number") {
    summary.minimum = jsonSchema.minimum;
  }

  if ("maximum" in jsonSchema && typeof jsonSchema.maximum === "number") {
    summary.maximum = jsonSchema.maximum;
  }

  if ("minLength" in jsonSchema && typeof jsonSchema.minLength === "number") {
    summary.minLength = jsonSchema.minLength;
  }

  if ("pattern" in jsonSchema && typeof jsonSchema.pattern === "string") {
    summary.pattern = jsonSchema.pattern;
  }

  return summary;
};

const getConstraintSummaryFromLiteralUnion = (
  ast: SchemaAST.Union,
): CapabilityConstraintSummary | undefined => {
  const values = ast.types
    .filter((member) => member._tag !== "UndefinedKeyword")
    .map((member) =>
      member._tag === "Literal"
        ? getScalarCapabilityExampleValue(member.literal)
        : undefined,
    );

  if (values.length === 0 || values.some((value) => value === undefined)) {
    return undefined;
  }

  const enumValues = values as readonly CapabilityExampleValue[];
  const [firstValue] = enumValues;

  if (firstValue === undefined) {
    return undefined;
  }

  return {
    type: getCapabilityInputTypeFromValue(firstValue),
    enumValues,
  };
};

const summarizeCapabilityInputAst = (
  ast: SchemaAST.AST,
): CapabilityConstraintSummary => {
  const surrogate = Option.getOrUndefined(SchemaAST.getSurrogateAnnotation(ast));

  if (surrogate !== undefined) {
    return summarizeCapabilityInputAst(surrogate);
  }

  switch (ast._tag) {
    case "StringKeyword":
      return { type: "string" };
    case "NumberKeyword":
      return { type: "number" };
    case "BooleanKeyword":
      return { type: "boolean" };
    case "Literal": {
      const value = getScalarCapabilityExampleValue(ast.literal);

      if (value === undefined) {
        throw new Error(
          "Capability input literals must be string, number, or boolean.",
        );
      }

      return {
        type: getCapabilityInputTypeFromValue(value),
        enumValues: [value],
      };
    }
    case "Refinement":
      return mergeConstraintSummaries(
        summarizeCapabilityInputAst(ast.from),
        getJsonSchemaConstraintSummary(ast),
      );
    case "Suspend":
      return summarizeCapabilityInputAst(ast.f());
    case "Transformation":
      return mergeConstraintSummaries(
        summarizeCapabilityInputAst(ast.from),
        getJsonSchemaConstraintSummary(ast),
      );
    case "TemplateLiteral":
      return {
        type: "string",
        pattern: SchemaAST.getTemplateLiteralRegExp(ast).source,
      };
    case "Union": {
      const literalUnionSummary = getConstraintSummaryFromLiteralUnion(ast);

      if (literalUnionSummary !== undefined) {
        return mergeConstraintSummaries(
          literalUnionSummary,
          getJsonSchemaConstraintSummary(ast),
        );
      }

      const members = ast.types.filter(
        (member) => member._tag !== "UndefinedKeyword",
      );

      if (members.length === 1) {
        return mergeConstraintSummaries(
          summarizeCapabilityInputAst(members[0]!),
          getJsonSchemaConstraintSummary(ast),
        );
      }

      break;
    }
  }

  const annotationSummary = getJsonSchemaConstraintSummary(ast);

  if (annotationSummary.type !== undefined) {
    return annotationSummary;
  }

  throw new Error(`Unsupported capability input schema node: ${ast._tag}.`);
};

const buildCapabilityJsonSchema = (
  schema: Schema.Schema<unknown, unknown, never>,
): JSONSchema.JsonSchema7Root => ({
  $schema: "https://json-schema.org/draft/2020-12/schema",
  ...JSONSchema.fromAST(schema.ast, {
    definitions: {},
    target: "jsonSchema2020-12",
    topLevelReferenceStrategy: "skip",
  }),
});

export const annotateCapabilityInput = <S>(
  schema: S,
  metadata: CapabilityInputMetadata,
): S =>
  (schema as AnnotatableSchema<S>).annotations({
    description: metadata.description,
    ...(metadata.defaultValue === undefined
      ? {}
      : { default: metadata.defaultValue }),
    [capabilityInputMetadataAnnotationId]: metadata,
  }) as S;

export const describeCapabilityInput = <A, I, R>(
  schema: Schema.Schema<A, I, R>,
): readonly CapabilityInputProperty[] => {
  const propertySignatures = SchemaAST.getPropertySignatures(schema.ast);

  return propertySignatures.map((property) => {
    const metadata =
      getCapabilityInputMetadata(property) ??
      getCapabilityInputMetadata(property.type);

    if (metadata === undefined) {
      throw new Error(
        `Missing capability input metadata for "${String(property.name)}".`,
      );
    }

    const defaultValue =
      getScalarCapabilityExampleValue(
        Option.getOrUndefined(SchemaAST.getDefaultAnnotation(property)),
      ) ??
      getScalarCapabilityExampleValue(
        Option.getOrUndefined(SchemaAST.getDefaultAnnotation(property.type)),
      );
    const constraints = mergeConstraintSummaries(
      summarizeCapabilityInputAst(property.type),
      defaultValue === undefined ? {} : { defaultValue },
    );

    if (constraints.type === undefined) {
      throw new Error(
        `Missing capability input type for "${String(property.name)}".`,
      );
    }

    return {
      ...metadata,
      key: String(property.name),
      aliases: metadata.aliases ?? [],
      cliFlags: (metadata.aliases ?? []).map((alias) => `--${alias}` as const),
      description: getPropertyDescription(property),
      status: metadata.status ?? "observed",
      required: !property.isOptional && constraints.defaultValue === undefined,
      type: constraints.type,
      defaultValue: constraints.defaultValue,
      enumValues: constraints.enumValues,
      minimum: constraints.minimum,
      maximum: constraints.maximum,
      minLength: constraints.minLength,
      pattern: constraints.pattern,
    };
  });
};

export const capabilityInputPropertyToCliValueHint = (
  property: CapabilityInputProperty,
): string => {
  if (property.cliValueHint !== undefined) {
    return property.cliValueHint;
  }

  if (property.enumValues !== undefined) {
    return `<${property.enumValues.join("|")}>`;
  }

  switch (property.type) {
    case "integer":
      return "<number>";
    case "boolean":
      return "<true|false>";
    default:
      return "<text>";
  }
};

export const capabilityExampleToArgv = (
  properties: readonly CapabilityInputProperty[],
  input: Record<string, unknown>,
): string[] => {
  const argv: string[] = [];

  for (const property of properties) {
    const value = input[property.key];

    if (value === undefined) {
      continue;
    }

    const [primaryFlag] = property.cliFlags;

    if (primaryFlag === undefined) {
      continue;
    }

    argv.push(primaryFlag, String(value));
  }

  return argv;
};

export const capabilityInputSchemaToJsonSchema = <A, I, R>(
  schema: Schema.Schema<A, I, R>,
): JSONSchema.JsonSchema7Root =>
  buildCapabilityJsonSchema(schema as Schema.Schema<unknown, unknown, never>);
