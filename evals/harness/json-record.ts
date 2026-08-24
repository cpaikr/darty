export type JsonRecord = Record<string, unknown>;

export const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const getRecord = (
  value: JsonRecord | undefined,
  key: string,
): JsonRecord | undefined => {
  const child = value?.[key];
  return isRecord(child) ? child : undefined;
};

export const getArray = (
  value: JsonRecord | undefined,
  key: string,
): readonly unknown[] | undefined => {
  const child = value?.[key];
  return Array.isArray(child) ? child : undefined;
};

export const getString = (
  value: JsonRecord | undefined,
  key: string,
): string | undefined => {
  const child = value?.[key];
  return typeof child === "string" ? child : undefined;
};
