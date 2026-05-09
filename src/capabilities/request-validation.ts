import { type ParseResult } from "effect";

export type CollectedParseIssue = {
  readonly path: readonly PropertyKey[];
  readonly issue: ParseResult.ParseIssue;
};

export function assertObjectInput<E extends Error>(
  input: unknown,
  makeError: (actual: unknown) => E,
): asserts input is Record<string, unknown> {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    throw makeError(input);
  }
}

export const assertNoUnknownKeys = <E extends Error>(
  input: Record<string, unknown>,
  allowedKeys: ReadonlySet<string>,
  makeError: (key: string, actual: unknown) => E,
): void => {
  for (const key of Object.keys(input)) {
    if (!allowedKeys.has(key)) {
      throw makeError(key, input[key]);
    }
  }
};

export const normalizeTextFilterFields = <Key extends string>(
  input: Record<string, unknown>,
  fields: readonly Key[],
): Record<string, unknown> => {
  let normalizedInput: Record<string, unknown> | undefined;

  for (const field of fields) {
    const value = input[field];

    if (typeof value === "string") {
      normalizedInput ??= { ...input };
      normalizedInput[field] = value.trim();
    }
  }

  return normalizedInput ?? input;
};

export const collectParseIssues = (
  issue: ParseResult.ParseIssue,
  path: readonly PropertyKey[] = [],
): readonly CollectedParseIssue[] => {
  switch (issue._tag) {
    case "Pointer":
      return collectParseIssues(issue.issue, [
        ...path,
        ...toPathArray(issue.path),
      ]);
    case "Composite":
      return (Array.isArray(issue.issues) ? issue.issues : [issue.issues])
        .flatMap((nestedIssue) => collectParseIssues(nestedIssue, path));
    case "Refinement":
    case "Transformation":
      return collectParseIssues(issue.issue, path);
    default:
      return [{ path, issue }];
  }
};

export const getFirstParameterIssues = <Key extends string>(
  parseError: ParseResult.ParseError,
  orderedKeys: readonly Key[],
): {
  readonly parameter: Key | undefined;
  readonly issues: readonly ParseResult.ParseIssue[];
} => {
  const collectedIssues = collectParseIssues(parseError.issue);

  for (const key of orderedKeys) {
    const matchingIssues = collectedIssues
      .filter((issue) => issue.path[0] === key)
      .map((issue) => issue.issue);

    if (matchingIssues.length > 0) {
      return {
        parameter: key,
        issues: matchingIssues,
      };
    }
  }

  return {
    parameter: undefined,
    issues: collectedIssues.map((issue) => issue.issue),
  };
};

export const isRealYYYYMMDDDate = (value: string): boolean => {
  const year = Number.parseInt(value.slice(0, 4), 10);
  const month = Number.parseInt(value.slice(4, 6), 10);
  const day = Number.parseInt(value.slice(6, 8), 10);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
};

export const assertYYYYMMDDDateRange = <
  Request extends { readonly startDate: string; readonly endDate: string },
  E extends Error,
>(
  request: Request,
  options: {
    readonly makeInvalidStartDateError: (value: string) => E;
    readonly makeInvalidEndDateError: (value: string) => E;
    readonly makeReversedRangeError: (range: {
      readonly startDate: string;
      readonly endDate: string;
    }) => E;
  },
): void => {
  if (!isRealYYYYMMDDDate(request.startDate)) {
    throw options.makeInvalidStartDateError(request.startDate);
  }

  if (!isRealYYYYMMDDDate(request.endDate)) {
    throw options.makeInvalidEndDateError(request.endDate);
  }

  if (request.startDate > request.endDate) {
    throw options.makeReversedRangeError({
      startDate: request.startDate,
      endDate: request.endDate,
    });
  }
};

const toPathArray = (path: ParseResult.Path): readonly PropertyKey[] =>
  Array.isArray(path) ? path : [path as PropertyKey];
