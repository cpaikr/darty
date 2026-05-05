import {
  fetchReportContent,
  fetchReportShell,
  reportShellEndpoint,
  reportViewerEndpoint,
} from "./fetch.ts";
import type {
  SourceReportContent,
  SourceReportLocator,
  SourceReportShell,
} from "./source-model.ts";

export type Dsaf001ReportSource = {
  readonly endpoints: {
    readonly shell: string;
    readonly content: string;
  };
  readonly fetchShell: (
    receiptNumber: string,
    documentQuery?: string,
  ) => Promise<SourceReportShell>;
  readonly fetchContent: (
    locator: SourceReportLocator,
  ) => Promise<SourceReportContent>;
};

export const defaultDsaf001ReportSource: Dsaf001ReportSource = {
  endpoints: {
    shell: reportShellEndpoint,
    content: reportViewerEndpoint,
  },
  fetchShell: fetchReportShell,
  fetchContent: fetchReportContent,
};
