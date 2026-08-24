import type { ViewReportResult } from "../../capabilities/view-report/contract.ts";
import {
  quoteCliValue,
  type CliVerboseOutputOptions,
} from "../command-helpers.ts";

export type ViewReportCliVerboseOutputOptions = CliVerboseOutputOptions & {
  readonly tocDepth?: number;
};

type ViewReportTocNode = NonNullable<ViewReportResult["result"]["toc"]>[number];

export type ViewReportSectionCompactCliResult = Omit<
  ViewReportResult,
  "result"
> & {
  readonly result: Omit<ViewReportResult["result"], "documents" | "toc">;
};

type ViewReportCliResultWithHelp<Result> = Result & {
  readonly help: readonly string[];
};

export type ViewReportCliResult =
  | ViewReportCliResultWithHelp<ViewReportResult>
  | ViewReportCliResultWithHelp<ViewReportSectionCompactCliResult>;

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

const toViewReportHelp = (result: ViewReportResult): readonly string[] => {
  const request = result.result.request;
  const content = result.result.content;
  const documentArgument =
    request.documentId === undefined
      ? ""
      : ` --document-id ${quoteCliValue(result.result.document.id)}`;

  if (content?.window.hasMore === true) {
    return [
      `Continue content: darty view-report --receipt ${quoteCliValue(request.receipt)} --content-start-byte ${content.window.nextStartByte} --max-bytes ${request.maxBytes} --output-format ${quoteCliValue(request.outputFormat)}${
        request.documentId === undefined
          ? ""
          : ` --document-id ${quoteCliValue(request.documentId)}`
      }${
        request.sectionId === undefined
          ? ""
          : ` --section-id ${quoteCliValue(request.sectionId)}`
      }`,
    ];
  }

  if (request.sectionId !== undefined) {
    const navigation = result.result.navigation;
    const nextSection = navigation?.next;
    const previousSection = navigation?.previous;

    return [
      ...(nextSection === undefined
        ? []
        : [
            `Read next section: darty view-report --receipt ${quoteCliValue(request.receipt)}${documentArgument} --section-id ${quoteCliValue(nextSection.id)}`,
          ]),
      ...(previousSection === undefined
        ? []
        : [
            `Read previous section: darty view-report --receipt ${quoteCliValue(request.receipt)}${documentArgument} --section-id ${quoteCliValue(previousSection.id)}`,
          ]),
      "Rerun with --toc-depth <number> when you need nearby TOC context.",
    ];
  }

  const firstSection = result.result.toc?.[0];

  if (firstSection !== undefined) {
    return [
      `Read first section: darty view-report --receipt ${quoteCliValue(request.receipt)}${documentArgument} --section-id ${quoteCliValue(firstSection.id)}`,
      "Choose a different returned toc[].id to read another section.",
      "Use --toc-depth <number> to limit TOC output depth in the CLI.",
    ];
  }

  return [
    "This document has no returned TOC. Use the returned content.window fields to continue if content is truncated.",
  ];
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
      result.result.toc === undefined || tocDepth === undefined
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
      help: toViewReportHelp(result),
    };
  }

  return {
    ...cliResult,
    help: toViewReportHelp(result),
  };
};
