import type {
  ReportViewContent,
  ReportViewWarning,
} from "../../../../capabilities/report-view/contract.ts";
import type {
  SourceReportLocator,
  SourceReportSection,
} from "./source-model.ts";
import type { Dsaf001ReportSource } from "./source.ts";

const textEncoder = new TextEncoder();

const truncateUtf8 = (
  value: string,
  maxBytes: number,
): {
  readonly value: string;
  readonly sizeBytes: number;
  readonly returnedBytes: number;
  readonly truncated: boolean;
} => {
  const encoded = textEncoder.encode(value);

  if (encoded.byteLength <= maxBytes) {
    return {
      value,
      sizeBytes: encoded.byteLength,
      returnedBytes: encoded.byteLength,
      truncated: false,
    };
  }

  const characters = Array.from(value);
  let low = 0;
  let high = characters.length;

  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    const candidate = characters.slice(0, mid).join("");

    if (textEncoder.encode(candidate).byteLength <= maxBytes) {
      low = mid;
    } else {
      high = mid - 1;
    }
  }

  const truncated = characters.slice(0, low).join("");
  const returnedBytes = textEncoder.encode(truncated).byteLength;

  return {
    value: truncated,
    sizeBytes: encoded.byteLength,
    returnedBytes,
    truncated: true,
  };
};

export const buildReportContent = async (input: {
  readonly source: Dsaf001ReportSource;
  readonly locator: SourceReportLocator;
  readonly scope: "document" | "section";
  readonly maxBytes: number;
  readonly section?: SourceReportSection;
}): Promise<{
  readonly content: ReportViewContent;
  readonly warning?: ReportViewWarning;
}> => {
  const sourceContent = await input.source.fetchContent(input.locator);
  const truncated = truncateUtf8(sourceContent.html, input.maxBytes);
  const warning = truncated.truncated
    ? {
        code: "content_truncated" as const,
        message: `HTML content was truncated from ${truncated.sizeBytes} bytes to ${truncated.returnedBytes} bytes.`,
      }
    : undefined;

  const content: ReportViewContent = {
    scope: input.scope,
    format: "html",
    html: truncated.value,
    sizeBytes: truncated.sizeBytes,
    returnedBytes: truncated.returnedBytes,
    truncated: truncated.truncated,
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
