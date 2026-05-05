import { ReportViewProviderError } from "../../../../capabilities/report-view/provider.ts";
import { dsaf001ReportMessages } from "./messages.ts";
import { flattenSections } from "./navigation.ts";
import type {
  SourceReportLocator,
  SourceReportSection,
  SourceReportShell,
} from "./source-model.ts";

export type ReportContentPlan =
  | {
      readonly kind: "tocOnly";
    }
  | {
      readonly kind: "document";
      readonly locator: SourceReportLocator;
    }
  | {
      readonly kind: "section";
      readonly locator: SourceReportLocator;
      readonly section: SourceReportSection;
    };

export const resolveReportContentPlan = (input: {
  readonly shell: SourceReportShell;
  readonly sectionId: string | undefined;
  readonly providerId: string;
}): ReportContentPlan => {
  const flattened = flattenSections(input.shell.toc);

  if (input.sectionId !== undefined) {
    const section = flattened.find(
      (entry) => entry.section.id === input.sectionId,
    )?.section;

    if (section === undefined) {
      throw new ReportViewProviderError({
        code: "not_found",
        message: dsaf001ReportMessages.sectionNotFound(input.sectionId),
        retryable: false,
        providerId: input.providerId,
        sourceUrl: input.shell.sourceUrl,
      });
    }

    return {
      kind: "section",
      locator: section.locator,
      section,
    };
  }

  if (input.shell.toc.length === 0) {
    if (input.shell.initialViewLocator === undefined) {
      throw new ReportViewProviderError({
        code: "source_parse_failure",
        message: dsaf001ReportMessages.shellChanged,
        retryable: false,
        providerId: input.providerId,
        sourceUrl: input.shell.sourceUrl,
      });
    }

    return {
      kind: "document",
      locator: input.shell.initialViewLocator,
    };
  }

  return {
    kind: "tocOnly",
  };
};
