import type { DartyExecutionContext } from "../../../../capabilities/types.ts";
import type {
  ViewReportContent,
  ViewReportOutputFormat,
  ViewReportWarning,
} from "../../../../capabilities/view-report/contract.ts";
import type {
  SourceReportLocator,
  SourceReportSection,
} from "./source-model.ts";
import { windowUtf8 } from "../../../../capabilities/view-report/content-window.ts";
import { convertReportHtmlToMarkdown } from "./markdown.ts";
import { sanitizeReportHtml } from "./sanitize-html.ts";
import type { Dsaf001ReportSource } from "./source.ts";

export const buildReportContent = async (input: {
  readonly source: Dsaf001ReportSource;
  readonly locator: SourceReportLocator;
  readonly scope: "document" | "section";
  readonly outputFormat: ViewReportOutputFormat;
  readonly maxBytes: number;
  readonly contentStartByte: number;
  readonly section?: SourceReportSection;
  readonly context?: DartyExecutionContext;
}): Promise<{
  readonly content: ViewReportContent;
  readonly warning?: ViewReportWarning;
}> => {
  const sourceContent = await input.source.fetchContent(input.locator, input.context);
  const value =
    input.outputFormat === "markdown"
      ? convertReportHtmlToMarkdown(sourceContent.html)
      : sanitizeReportHtml(sourceContent.html);
  const windowed = windowUtf8(value, input.contentStartByte, input.maxBytes);
  const formatLabel = input.outputFormat === "markdown" ? "Markdown" : "HTML";
  const warning = windowed.window.hasMore
    ? {
        code: "content_truncated" as const,
        message: `${formatLabel} content is truncated at UTF-8 byte ${windowed.window.endByte} of ${windowed.sizeBytes}; continue with contentStartByte=${windowed.window.nextStartByte} using the same receipt/documentId/sectionId/outputFormat.`,
      }
    : undefined;
  const content: ViewReportContent = {
    scope: input.scope,
    format: input.outputFormat,
    body: windowed.value,
    sizeBytes: windowed.sizeBytes,
    returnedBytes: windowed.returnedBytes,
    isFullContent: windowed.isFullContent,
    window: windowed.window,
    ...(input.section === undefined
      ? {}
      : {
          section: {
            id: input.section.id,
            title: input.section.title,
          },
        }),
  };

  return warning === undefined
    ? {
        content,
      }
    : {
        warning,
        content,
      };
};
