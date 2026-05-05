export type SourceReportDocumentKind = "body" | "attachment";

export type SourceReportDocument = {
  readonly id: string;
  readonly title: string;
  readonly kind: SourceReportDocumentKind;
  readonly selected: boolean;
  readonly query: string;
};

export type SourceReportLocator = {
  readonly rcpNo: string;
  readonly dcmNo: string;
  readonly eleId: string;
  readonly offset: string;
  readonly length: string;
  readonly dtd: string;
  readonly tocNo?: string;
};

export type SourceReportSection = {
  readonly id: string;
  readonly title: string;
  readonly locator: SourceReportLocator;
  readonly children: readonly SourceReportSection[];
};

export type SourceReportShell = {
  readonly receiptNumber: string;
  readonly sourceUrl: string;
  readonly documents: readonly SourceReportDocument[];
  readonly selectedDocument: SourceReportDocument;
  readonly toc: readonly SourceReportSection[];
  readonly initialViewLocator: SourceReportLocator | undefined;
};

export type SourceReportContent = {
  readonly sourceUrl: string;
  readonly html: string;
};
