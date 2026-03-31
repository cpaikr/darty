import { Effect } from "effect";

import { searchDsab007Contents } from "../../dart/dsab007/client.ts";
import {
  describeDsab007ContentsSearchInput,
  dsab007ContentsSortDirections,
  dsab007ContentsSortFields,
  type Dsab007ContentsSortDirection,
  type Dsab007ContentsSortField,
  type Dsab007ContentsSearchInput,
} from "../../dart/dsab007/contracts.ts";

type CliOptionKey = Exclude<keyof Dsab007ContentsSearchInput, "option">;
type CliOptionValue = string | Dsab007ContentsSortField | Dsab007ContentsSortDirection;
type CliOptions = Partial<Record<CliOptionKey, CliOptionValue>> & {
  help?: boolean;
};

const dsab007CliParameterDocs = describeDsab007ContentsSearchInput().filter(
  (parameter) => parameter.cliFlags.length > 0,
);

const dsab007CliFlagToKey = new Map<string, CliOptionKey>(
  dsab007CliParameterDocs.flatMap((parameter) =>
    parameter.cliFlags.map((flag) => [flag, parameter.key as CliOptionKey]),
  ),
);

const parseLiteralOption = <Literal extends string>(
  flag: string,
  value: string,
  allowed: readonly Literal[],
): Literal => {
  if (allowed.includes(value as Literal)) {
    return value as Literal;
  }

  throw new Error(
    `Invalid ${flag} "${value}". Expected one of: ${allowed.join(", ")}.`,
  );
};

const formatOptionUsage = (flags: readonly string[], valueHint?: string): string =>
  flags
    .map((flag) => (valueHint === undefined ? flag : `${flag} ${valueHint}`))
    .join(", ");

const formatParameterHelp = (): string =>
  dsab007CliParameterDocs
    .map(
      (parameter) =>
        `  ${formatOptionUsage(parameter.cliFlags, parameter.valueHint)}\n    ${parameter.description} [${parameter.status}]`,
    )
    .join("\n");

export const dsab007Usage = `Usage:
  bun run src/cli.ts dsab007-contents --keyword <text> --start-date <YYYYMMDD> --end-date <YYYYMMDD> [options]

Options:
  --help
    Show parameter descriptions.
${formatParameterHelp()}

Notes:
  Semantic flags are preferred when available; raw DART aliases remain accepted for debugging.
  Status labels show how directly the upstream meaning is confirmed: observed, inferred, unverified.
`;

const parseCliValue = (
  key: CliOptionKey,
  flag: string,
  value: string,
): CliOptionValue => {
  switch (key) {
    case "sort":
      return parseLiteralOption(flag, value, dsab007ContentsSortFields);
    case "sortType":
      return parseLiteralOption(flag, value, dsab007ContentsSortDirections);
    default:
      return value;
  }
};

export const parseDsab007CommandArgs = (
  argv: string[],
): CliOptions => {
  const options: CliOptions = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--help") {
      options.help = true;
      continue;
    }

    const value = argv[index + 1];

    if (token === undefined || !token.startsWith("--")) {
      continue;
    }

    const key = dsab007CliFlagToKey.get(token);

    if (key === undefined) {
      continue;
    }

    if (value === undefined || value.startsWith("--")) {
      continue;
    }

    options[key] = parseCliValue(key, token, value);

    index += 1;
  }

  return options;
};

export const runDsab007ContentsCommand = (
  argv: string[],
): Effect.Effect<void, unknown> =>
  Effect.gen(function* () {
    // The command keeps the DART-shaped core internally while exposing clearer
    // aliases and runtime help text for humans.
    const options = parseDsab007CommandArgs(argv);

    if (options.help === true) {
      return yield* Effect.sync(() => {
        console.log(dsab007Usage);
      });
    }

    const result = yield* searchDsab007Contents({
      option: "contents",
      currentPage: Number.parseInt(String(options.currentPage ?? "1"), 10),
      maxResults: Number.parseInt(String(options.maxResults ?? "10"), 10),
      maxLinks: Number.parseInt(String(options.maxLinks ?? "10"), 10),
      sort: options.sort ?? "DATE",
      sortType: options.sortType ?? "desc",
      keyword: String(options.keyword ?? ""),
      startDate: String(options.startDate ?? ""),
      endDate: String(options.endDate ?? ""),
      textCrpCik:
        typeof options.textCrpCik === "string" ? options.textCrpCik : undefined,
      textCrpNm:
        typeof options.textCrpNm === "string" ? options.textCrpNm : undefined,
      textPresenterNm:
        typeof options.textPresenterNm === "string"
          ? options.textPresenterNm
          : undefined,
      lateKeyword:
        typeof options.lateKeyword === "string" ? options.lateKeyword : undefined,
      flrCik: typeof options.flrCik === "string" ? options.flrCik : undefined,
      dspTypeTab:
        typeof options.dspTypeTab === "string" ? options.dspTypeTab : undefined,
      tocSrch:
        typeof options.tocSrch === "string" ? options.tocSrch : undefined,
      docType: typeof options.docType === "string" ? options.docType : undefined,
      reportName:
        typeof options.reportName === "string" ? options.reportName : undefined,
      decadeType:
        typeof options.decadeType === "string" ? options.decadeType : undefined,
    });

    yield* Effect.sync(() => {
      console.log(JSON.stringify(result, null, 2));
    });
  });
