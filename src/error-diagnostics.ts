import { Schema } from "effect";

export const DartyErrorCauseDiagnosticsSchema = Schema.Struct({
  name: Schema.optional(Schema.String),
  message: Schema.optional(Schema.String),
  code: Schema.optional(Schema.String),
  retryable: Schema.optional(Schema.Boolean),
});

export const DartyErrorDiagnosticsSchema = Schema.Struct({
  providerId: Schema.optional(Schema.String),
  providerCode: Schema.optional(Schema.String),
  sourceUrl: Schema.optional(Schema.String),
  httpStatus: Schema.optional(Schema.Number),
  httpContentType: Schema.optional(Schema.String),
  httpResponseLength: Schema.optional(Schema.Number),
  parseReason: Schema.optional(Schema.String),
  cause: Schema.optional(DartyErrorCauseDiagnosticsSchema),
});

export type DartyErrorCauseDiagnostics = Schema.Schema.Type<
  typeof DartyErrorCauseDiagnosticsSchema
>;

export type DartyErrorDiagnostics = Schema.Schema.Type<
  typeof DartyErrorDiagnosticsSchema
>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const compactObject = <T extends Record<string, unknown>>(value: T): Partial<T> =>
  Object.fromEntries(
    Object.entries(value).filter(([, field]) => field !== undefined),
  ) as Partial<T>;

const hasDiagnostics = (diagnostics: DartyErrorDiagnostics): boolean =>
  Object.keys(diagnostics).length > 0;

export const toErrorCauseDiagnostics = (
  cause: unknown,
): DartyErrorCauseDiagnostics | undefined => {
  if (cause instanceof Error) {
    const record = cause as Error & Record<string, unknown>;
    const diagnostics = compactObject({
      name: cause.name,
      message: cause.message,
      code: typeof record.code === "string" ? record.code : undefined,
      retryable:
        typeof record.retryable === "boolean" ? record.retryable : undefined,
    });

    return Object.keys(diagnostics).length > 0
      ? (diagnostics as DartyErrorCauseDiagnostics)
      : undefined;
  }

  if (!isRecord(cause)) {
    return undefined;
  }

  const diagnostics = compactObject({
    name: typeof cause.name === "string" ? cause.name : undefined,
    message: typeof cause.message === "string" ? cause.message : undefined,
    code: typeof cause.code === "string" ? cause.code : undefined,
    retryable: typeof cause.retryable === "boolean" ? cause.retryable : undefined,
  });

  return Object.keys(diagnostics).length > 0
    ? (diagnostics as DartyErrorCauseDiagnostics)
    : undefined;
};

export const mergeErrorDiagnostics = (
  ...items: readonly (DartyErrorDiagnostics | undefined)[]
): DartyErrorDiagnostics | undefined => {
  const merged = Object.assign({}, ...items.filter((item) => item !== undefined));
  return hasDiagnostics(merged) ? merged : undefined;
};

export const sanitizeErrorDiagnostics = (
  diagnostics: unknown,
): DartyErrorDiagnostics | undefined => {
  if (!isRecord(diagnostics)) {
    return undefined;
  }

  const cause = toErrorCauseDiagnostics(diagnostics.cause);
  return mergeErrorDiagnostics({
    ...(typeof diagnostics.providerId === "string"
      ? { providerId: diagnostics.providerId }
      : {}),
    ...(typeof diagnostics.providerCode === "string"
      ? { providerCode: diagnostics.providerCode }
      : {}),
    ...(typeof diagnostics.sourceUrl === "string"
      ? { sourceUrl: diagnostics.sourceUrl }
      : {}),
    ...(typeof diagnostics.httpStatus === "number"
      ? { httpStatus: diagnostics.httpStatus }
      : {}),
    ...(typeof diagnostics.httpContentType === "string"
      ? { httpContentType: diagnostics.httpContentType }
      : {}),
    ...(typeof diagnostics.httpResponseLength === "number"
      ? { httpResponseLength: diagnostics.httpResponseLength }
      : {}),
    ...(typeof diagnostics.parseReason === "string"
      ? { parseReason: diagnostics.parseReason }
      : {}),
    ...(cause === undefined ? {} : { cause }),
  });
};

export const getErrorDiagnostics = (
  error: unknown,
): DartyErrorDiagnostics | undefined =>
  isRecord(error) ? sanitizeErrorDiagnostics(error.diagnostics) : undefined;

export const createCauseDiagnostics = (
  cause: unknown,
): DartyErrorDiagnostics | undefined => {
  const causeDiagnostics = toErrorCauseDiagnostics(cause);
  return causeDiagnostics === undefined ? undefined : { cause: causeDiagnostics };
};
