import { Effect } from "effect";

import { searchDsab007Contents } from "../../dart/dsab007/client.ts";

type CliOptions = {
  keyword?: string;
  query?: string;
  startDate?: string;
  endDate?: string;
  currentPage?: string;
  maxResults?: string;
  maxLinks?: string;
  sort?: string;
  sortType?: string;
  textCrpCik?: string;
  textCrpNm?: string;
  textPresenterNm?: string;
  lateKeyword?: string;
  flrCik?: string;
  dspTypeTab?: string;
  tocSrch?: string;
  docType?: string;
  reportName?: string;
  decadeType?: string;
};

export const dsab007Usage = `Usage:
  bun run src/cli.ts dsab007-contents --keyword <text> --start-date <YYYYMMDD> --end-date <YYYYMMDD> [--current-page 1] [--max-results 10] [--max-links 10] [--sort DATE|rpt_nm] [--sort-type asc|desc]
`;

export const parseDsab007CommandArgs = (
  argv: string[],
): CliOptions => {
  const options: CliOptions = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    const value = argv[index + 1];

    if (token === undefined || !token.startsWith("--")) {
      continue;
    }

    if (value === undefined || value.startsWith("--")) {
      continue;
    }

    switch (token) {
      case "--keyword":
        options.keyword = value;
        break;
      case "--query":
        options.query = value;
        break;
      case "--start-date":
        options.startDate = value;
        break;
      case "--end-date":
        options.endDate = value;
        break;
      case "--current-page":
        options.currentPage = value;
        break;
      case "--max-results":
        options.maxResults = value;
        break;
      case "--max-links":
        options.maxLinks = value;
        break;
      case "--sort":
        options.sort = value;
        break;
      case "--sort-type":
        options.sortType = value;
        break;
      case "--text-crp-cik":
        options.textCrpCik = value;
        break;
      case "--text-crp-nm":
        options.textCrpNm = value;
        break;
      case "--text-presenter-nm":
        options.textPresenterNm = value;
        break;
      case "--late-keyword":
        options.lateKeyword = value;
        break;
      case "--flr-cik":
        options.flrCik = value;
        break;
      case "--dsp-type-tab":
        options.dspTypeTab = value;
        break;
      case "--toc-srch":
        options.tocSrch = value;
        break;
      case "--doc-type":
        options.docType = value;
        break;
      case "--report-name":
        options.reportName = value;
        break;
      case "--decade-type":
        options.decadeType = value;
        break;
      default:
        break;
    }

    index += 1;
  }

  return options;
};

export const runDsab007ContentsCommand = (
  argv: string[],
): Effect.Effect<void, unknown> =>
  Effect.gen(function* () {
    const options = parseDsab007CommandArgs(argv);
    const result = yield* searchDsab007Contents({
      option: "contents",
      currentPage: Number.parseInt(options.currentPage ?? "1", 10),
      maxResults: Number.parseInt(options.maxResults ?? "10", 10),
      maxLinks: Number.parseInt(options.maxLinks ?? "10", 10),
      sort: options.sort ?? "DATE",
      sortType: options.sortType ?? "desc",
      keyword: options.keyword ?? options.query ?? "",
      startDate: options.startDate ?? "",
      endDate: options.endDate ?? "",
      textCrpCik: options.textCrpCik,
      textCrpNm: options.textCrpNm,
      textPresenterNm: options.textPresenterNm,
      lateKeyword: options.lateKeyword,
      flrCik: options.flrCik,
      dspTypeTab: options.dspTypeTab,
      tocSrch: options.tocSrch,
      docType: options.docType,
      reportName: options.reportName,
      decadeType: options.decadeType,
    });

    yield* Effect.sync(() => {
      console.log(JSON.stringify(result, null, 2));
    });
  });
