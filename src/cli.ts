import { Effect } from "effect";

import { searchFilingBodies } from "./dart/body-search.ts";

type CliOptions = {
  query?: string;
  startDate?: string;
  endDate?: string;
  page?: string;
  sort?: string;
  companyName?: string;
  companyId?: string;
  presenterName?: string;
};

const usage = `Usage:
  bun run src/cli.ts search --query <text> --start-date <YYYYMMDD> --end-date <YYYYMMDD> [--page 1] [--sort date|reportName]
`;

const parseArgs = (
  argv: string[],
): { command: string | undefined; options: CliOptions } => {
  const [command, ...rest] = argv;
  const options: CliOptions = {};

  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index];
    const value = rest[index + 1];

    if (token === undefined || !token.startsWith("--")) {
      continue;
    }

    if (value === undefined || value.startsWith("--")) {
      continue;
    }

    switch (token) {
      case "--query":
        options.query = value;
        break;
      case "--start-date":
        options.startDate = value;
        break;
      case "--end-date":
        options.endDate = value;
        break;
      case "--page":
        options.page = value;
        break;
      case "--sort":
        options.sort = value;
        break;
      case "--company-name":
        options.companyName = value;
        break;
      case "--company-id":
        options.companyId = value;
        break;
      case "--presenter-name":
        options.presenterName = value;
        break;
      default:
        break;
    }

    index += 1;
  }

  return { command, options };
};

const main = Effect.gen(function* () {
  const { command, options } = parseArgs(process.argv.slice(2));

  if (command !== "search") {
    yield* Effect.sync(() => {
      console.error(usage);
    });
    return yield* Effect.fail(new Error("Unsupported command."));
  }

  const result = yield* searchFilingBodies({
    query: options.query ?? "",
    startDate: options.startDate ?? "",
    endDate: options.endDate ?? "",
    page: Number.parseInt(options.page ?? "1", 10),
    sort: options.sort ?? "date",
    companyName: options.companyName,
    companyId: options.companyId,
    presenterName: options.presenterName,
  });

  yield* Effect.sync(() => {
    console.log(JSON.stringify(result, null, 2));
  });
});

Effect.runPromise(main).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
