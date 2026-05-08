import type { ViewReportResult } from "../../capabilities/view-report/contract.ts";
import type { CliVerboseOutputOptions } from "../command-helpers.ts";

export type ViewReportCliVerboseOutputOptions = CliVerboseOutputOptions & {
  readonly tocDepth?: number;
};

type ViewReportTocNode = ViewReportResult["result"]["toc"][number];

export type ViewReportSectionCompactCliResult = Omit<
  ViewReportResult,
  "result"
> & {
  readonly result: Omit<ViewReportResult["result"], "documents" | "toc">;
};

export type ViewReportCliResult =
  | ViewReportResult
  | ViewReportSectionCompactCliResult;

const limitTocDepth = (
  nodes: readonly ViewReportTocNode[],
  remainingDepth: number,
): ViewReportTocNode[] => {
  if (remainingDepth <= 0) {
    return [];
  }

  return nodes.map((node) => ({
    ...node,
    children: limitTocDepth(node.children, remainingDepth - 1),
  }));
};

export const toViewReportCliResult = (
  result: ViewReportResult,
  output: ViewReportCliVerboseOutputOptions,
): ViewReportCliResult => {
  const tocDepth = output.tocDepth;
  const sectionRequested = result.result.request.sectionId !== undefined;
  const includeLocator =
    !sectionRequested || output.verbose || tocDepth !== undefined;
  const resultPayload = {
    ...result.result,
    toc:
      tocDepth === undefined
        ? result.result.toc
        : limitTocDepth(result.result.toc, tocDepth),
  };
  const cliResult: ViewReportResult = {
    ...result,
    result: resultPayload,
  };

  if (!includeLocator) {
    const { documents, toc, ...sectionResult } = resultPayload;
    return {
      ...cliResult,
      result: sectionResult,
    };
  }

  return cliResult;
};
