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
}): Promise<{
  readonly content: ViewReportContent;
  readonly warning?: ViewReportWarning;
}> => {
  const sourceContent = await input.source.fetchContent(input.locator);
  const value =
    input.outputFormat === "markdown"
      ? convertReportHtmlToMarkdown(sourceContent.html)
      : sanitizeReportHtml(sourceContent.html);
  const truncated = windowUtf8(
    value,
    input.contentStartByte,
    input.maxBytes,
  );
  const formatLabel = input.outputFormat === "markdown" ? "Markdown" : "HTML";
  const warning = truncated.window.hasMore
    ? {
        code: "content_truncated" as const,
        message: `${formatLabel} content window returned UTF-8 bytes [${truncated.window.startByte}, ${truncated.window.endByte}) of ${truncated.sizeBytes}.`,
      }
    : undefined;
  const content: ViewReportContent = {
    scope: input.scope,
    format: input.outputFormat,
    body: truncated.value,
    sizeBytes: truncated.sizeBytes,
    returnedBytes: truncated.returnedBytes,
    truncated: truncated.truncated,
    window: truncated.window,
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
