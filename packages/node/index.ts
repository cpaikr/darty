import { randomUUID } from "node:crypto";

import { loadNative, type NativeDartyClient, type NativeModule } from "./native.js";

interface NativeOutcome<T> {
  readonly value?: T;
  readonly error?: DartyErrorData;
  readonly cancelled?: boolean;
}

const native: NativeModule = loadNative();

export type DartyErrorCode =
  | "invalid_request"
  | "not_found"
  | "source_unavailable"
  | "source_changed"
  | "source_parse_failure"
  | "internal_error";

export interface DartyErrorData {
  readonly code: DartyErrorCode;
  readonly message: string;
  readonly retryable: boolean;
  readonly parameter?: string;
  readonly sourceUrl?: string;
  readonly recoveryHint?: string;
}

export class DartyError extends Error {
  readonly code: DartyErrorCode;
  readonly retryable: boolean;
  readonly parameter?: string;
  readonly sourceUrl?: string;
  readonly recoveryHint?: string;

  constructor(error: DartyErrorData) {
    super(error.message);
    this.name = "DartyError";
    this.code = error.code;
    this.retryable = error.retryable;
    if (error.parameter !== undefined) this.parameter = error.parameter;
    if (error.sourceUrl !== undefined) this.sourceUrl = error.sourceUrl;
    if (error.recoveryHint !== undefined) this.recoveryHint = error.recoveryHint;
  }
}

export interface RequestOptions {
  readonly signal?: AbortSignal;
}

export type MarketKind = "kospi" | "kosdaq" | "konex" | "etc" | "unknown";
export type Completeness = "complete" | "partial";
export type SortDirection = "asc" | "desc";
export type ResponseDetail = "concise" | "detailed" | "raw";
export type OutputFormat = "html" | "markdown";

export interface SearchCompanyInput {
  readonly companyName: string;
  readonly page?: number;
  readonly pageSize?: number;
}

/** The normalized request echoed by the Rust SDK in a company response. */
export interface SearchCompanyRequest {
  readonly companyName: string;
  readonly page: number;
  readonly pageSize: number;
}

export interface SearchCompanyReportsInput {
  readonly companyCode: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly page?: number;
  readonly pageSize?: number;
  readonly sortDirection?: SortDirection;
  readonly presenterName?: string;
  readonly reportName?: string;
  readonly disclosureTypes?: readonly string[];
  readonly industryCode?: string;
  readonly corporationType?: string;
  readonly closingAccountsMonth?: string;
  readonly includeAllReports?: boolean;
  readonly detail?: ResponseDetail;
}

/** The normalized request echoed by the Rust SDK in a filing response. */
export interface SearchCompanyReportsRequest {
  readonly companyCode: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly page: number;
  readonly pageSize: number;
  readonly sortDirection: SortDirection;
  readonly presenterName?: string;
  readonly reportName?: string;
  readonly disclosureTypes: readonly string[];
  readonly industryCode: string;
  readonly corporationType: string;
  readonly closingAccountsMonth: string;
  readonly includeAllReports: boolean;
  readonly detail: ResponseDetail;
}

export interface ViewReportInput {
  readonly receipt: string;
  readonly documentId?: string;
  readonly sectionId?: string;
  readonly outputFormat?: OutputFormat;
  readonly maxBytes?: number;
  readonly contentStartByte?: number;
  readonly detail?: ResponseDetail;
}

/** The normalized request echoed by the Rust SDK in a report response. */
export interface ViewReportRequest {
  readonly receipt: string;
  readonly documentId?: string;
  readonly sectionId?: string;
  readonly outputFormat: OutputFormat;
  readonly maxBytes: number;
  readonly contentStartByte: number;
  readonly detail: ResponseDetail;
}

export interface Pagination {
  readonly currentPage: number;
  readonly totalPages: number;
  readonly totalCount: number;
  readonly returnedCount: number;
}

export interface Warning {
  readonly code: string;
  readonly message: string;
  readonly droppedItemCount?: number;
}

export interface SearchSource {
  readonly system: string;
  readonly surface: string;
  readonly endpoint: string;
}

export interface CompanySourceBehavior {
  readonly searchMode: string;
  readonly callerControlsPageSize: boolean;
  readonly maxObservedPageSize: number;
  readonly observationStatus: string;
}

export interface ReportsSourceBehavior {
  readonly searchMode: string;
  readonly sortBy: string;
  readonly callerControlsPageSize: boolean;
  readonly pageSizeChoices: readonly number[];
  readonly finalReportDefault: boolean;
  readonly observationStatus: string;
}

export interface SearchCompanyMetadata {
  readonly fetchedAt: string;
  readonly source: SearchSource;
  readonly sourceBehavior: CompanySourceBehavior;
  readonly completeness: Completeness;
  readonly droppedItemCount: number;
}

export interface SearchCompanyReportsMetadata {
  readonly fetchedAt: string;
  readonly source: SearchSource;
  readonly sourceBehavior: ReportsSourceBehavior;
  readonly completeness: Completeness;
  readonly droppedItemCount: number;
}

export interface ReportEndpoints {
  readonly shell: string;
  readonly content?: string;
}

export interface ReportSource {
  readonly system: string;
  readonly surface: string;
  readonly endpoints: ReportEndpoints;
}

export interface ViewReportMetadata {
  readonly fetchedAt: string;
  readonly source: ReportSource;
  readonly tocSource: string;
}

export interface SearchCompanyResponse {
  readonly result: {
    readonly request: SearchCompanyRequest;
    readonly pagination: Pagination;
    readonly items: readonly {
      readonly companyCode: string;
      readonly companyName: string;
      readonly stockCode?: string;
      readonly marketKind: MarketKind;
      readonly marketLabel?: string;
      readonly references: { readonly detailEndpoint: string };
      readonly evidence: {
        readonly rawCompanyLinkHref: string;
        readonly rawMarketBadgeText?: string;
      };
    }[];
  };
  readonly metadata: SearchCompanyMetadata;
  readonly references: { readonly searchUrl: string };
  readonly warnings: readonly Warning[];
}

export interface SearchCompanyReportsResponse {
  readonly result: {
    readonly request: SearchCompanyReportsRequest;
    readonly company: FilingCompany;
    readonly pagination: Pagination;
    readonly items: readonly FilingItem[];
  };
  readonly metadata: SearchCompanyReportsMetadata;
  readonly references: { readonly searchUrl: string };
  readonly warnings: readonly Warning[];
}

export interface FilingCompany {
  readonly companyCode: string;
  readonly name?: string;
  readonly marketLabel?: string;
}

export interface FilingItem {
  readonly company: FilingCompany;
  readonly filing: {
    readonly receiptNumber: string;
    readonly reportTitle: string;
    readonly receiptDate: string;
    readonly presenterName?: string;
  };
  readonly matchedDisclosureType?: {
    readonly code: string;
    readonly label?: string;
    readonly category: string;
    readonly categoryLabel: string;
    readonly evidence: { readonly source: string };
  };
  readonly references: { readonly viewerUrl: string };
  readonly remarks: readonly { readonly text: string; readonly title?: string }[];
  readonly evidence?: { readonly rawRowText: string };
}

export interface ViewReportResponse {
  readonly result: {
    readonly request: ViewReportRequest;
    readonly receipt: { readonly receiptNumber: string };
    readonly document: ReportDocument;
    readonly documents?: readonly ReportDocument[];
    readonly toc?: readonly TocNode[];
    readonly content?: {
      readonly scope: string;
      readonly sizeBytes: number;
      readonly returnedBytes: number;
      readonly isFullContent: boolean;
      readonly window: {
        readonly unit: string;
        readonly startByte: number;
        readonly endByte: number;
        readonly hasMore: boolean;
        readonly nextStartByte?: number;
      };
      readonly section?: { readonly id: string; readonly title: string };
      readonly format: OutputFormat;
      readonly body: string;
    };
    readonly navigation?: {
      readonly parent?: NavigationEntry;
      readonly previous?: NavigationEntry;
      readonly next?: NavigationEntry;
      readonly children: readonly NavigationEntry[];
    };
  };
  readonly metadata: ViewReportMetadata;
  readonly references: { readonly viewerUrl: string };
  readonly warnings: readonly Warning[];
}

export interface ReportDocument {
  readonly id: string;
  readonly title: string;
  readonly kind: "body" | "attachment";
  readonly selected: boolean;
}

export interface TocNode {
  readonly id: string;
  readonly title: string;
  readonly children: readonly TocNode[];
}

export interface NavigationEntry {
  readonly id: string;
  readonly title: string;
}

const abortError = () => {
  const error = new Error("The operation was aborted.") as Error & { code: string };
  error.name = "AbortError";
  error.code = "ABORT_ERR";
  return error;
};

const invoke = async <T>(
  nativeClient: NativeDartyClient,
  operation: string,
  input: object,
  options: RequestOptions = {},
): Promise<T> => {
  const { signal } = options;
  const isAborted = () => signal?.aborted === true;
  if (isAborted()) throw abortError();

  let inputJson: string;
  try {
    const encoded = JSON.stringify(input);
    if (encoded === undefined) {
      throw new TypeError("Request input is missing.");
    }
    inputJson = encoded;
  } catch {
    throw new DartyError({
      code: "invalid_request",
      message: "Request input must be a JSON-serializable object.",
      retryable: false,
    });
  }
  const operationId = randomUUID();
  nativeClient.registerOperation(operationId);
  const cancel = () => nativeClient.cancelOperation(operationId);
  signal?.addEventListener("abort", cancel, { once: true });
  if (isAborted()) cancel();

  try {
    const encoded = await nativeClient.executeOperation(operationId, operation, inputJson);
    const outcome = JSON.parse(encoded) as NativeOutcome<T>;
    if (outcome.cancelled === true || isAborted()) throw abortError();
    if (outcome.error !== undefined) throw new DartyError(outcome.error);
    if (outcome.value === undefined) throw new Error("The native SDK returned no outcome.");
    return outcome.value;
  } finally {
    signal?.removeEventListener("abort", cancel);
  }
};

export interface DisclosureTypesInput { readonly category?: string; readonly query?: string; }
export interface DisclosureTypesResponse {
  readonly result: { readonly request: DisclosureTypesInput; readonly totalCount: number; readonly categories: readonly {
    readonly category: string; readonly categoryLabel: string; readonly categoryDescription: string;
    readonly items: readonly { readonly code: string; readonly label: string }[];
  }[] };
  readonly metadata: {
    readonly source: { readonly system: string; readonly repository: string; readonly commit: string; readonly path: string };
    readonly categoryLabelSource: { readonly system: string; readonly url: string; readonly codeSet: string };
    readonly categoryDescriptionProvenance: { readonly status: string; readonly basis: string };
    readonly sourceBehavior: { readonly codeSet: string; readonly categoryCodeSet: string; readonly observationStatus: string };
    readonly completeness: Completeness;
  };
  readonly references: { readonly sourceUrl: string };
  readonly warnings: readonly { readonly code: string; readonly message: string }[];
}
export type ReportGuideInput = Record<string, never>;
export interface ReportGuideResponse {
  readonly result: { readonly request: ReportGuideInput; readonly title: string; readonly contentMarkdown: string };
  readonly metadata: { readonly source: { readonly status: string; readonly path: string } };
  readonly references: { readonly guidePath: string; readonly sourceUrls: readonly string[] };
  readonly warnings: readonly { readonly code: string; readonly message: string }[];
}

export interface SearchBodyInput {
  readonly keyword: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly page?: number;
  readonly sortBy?: "date" | "reportName";
  readonly sortDirection?: SortDirection;
  readonly companyCode?: string;
  readonly presenterName?: string;
  readonly reportName?: string;
  readonly detail?: ResponseDetail;
}
export interface SearchBodyRequest extends SearchBodyInput {
  readonly page: number;
  readonly sortBy: "date" | "reportName";
  readonly sortDirection: SortDirection;
  readonly detail: ResponseDetail;
}
export interface SearchBodyItem {
  readonly company: { readonly name: string; readonly companyCode?: string; readonly marketLabel?: string };
  readonly filing: {
    readonly receiptNumber: string;
    readonly documentNumber?: string;
    readonly reportTitle: string;
    readonly reportModifier?: string;
    readonly reportPeriod?: string;
    readonly reportNameSuffix?: string;
    readonly receiptDate: string;
  };
  readonly match: {
    readonly snippetText: string;
    readonly disclosureTypeLabel?: string;
    readonly contentTypeLabel?: string;
    readonly presenterName?: string;
  };
  readonly references: { readonly viewerUrl: string };
  readonly evidence?: { readonly reportNameRaw: string; readonly rawInfoText: string; readonly snippetHtml: string };
}
export interface SearchBodyResponse {
  readonly result: { readonly request: SearchBodyRequest; readonly pagination: Pagination; readonly items: readonly SearchBodyItem[] };
  readonly metadata: {
    readonly fetchedAt: string;
    readonly source: SearchSource;
    readonly completeness: Completeness;
    readonly droppedItemCount: number;
    readonly sourceBehavior: {
      readonly effectivePageSize: number;
      readonly effectivePagerWidth: number;
      readonly callerControlsPageSize: boolean;
      readonly callerControlsPagerWidth: boolean;
      readonly observationStatus: string;
    };
  };
  readonly references: { readonly searchUrl: string };
  readonly warnings: readonly Warning[];
}
export interface CompanyDetailInput { readonly companyCode: string }
export interface CompanyDetailInfo {
  readonly companyCode: string;
  readonly companyName: string;
  readonly englishName?: string;
  readonly disclosureCompanyName?: string;
  readonly stockCode?: string;
  readonly representativeName?: string;
  readonly corporationKind?: string;
  readonly corporateRegistrationNumber?: string;
  readonly businessRegistrationNumber?: string;
  readonly address?: string;
  readonly homepage?: string;
  readonly phoneNumber?: string;
  readonly faxNumber?: string;
  readonly industryName?: string;
  readonly establishedDate?: string;
  readonly fiscalMonth?: string;
}
export interface CompanyDetailResponse {
  readonly result: { readonly request: CompanyDetailInput; readonly company: CompanyDetailInfo };
  readonly metadata: { readonly fetchedAt: string; readonly source: SearchSource; readonly completeness: Completeness };
  readonly references: { readonly detailUrl: string };
}
export interface CompanyRssInput { readonly companyCode: string; readonly detail?: ResponseDetail }
export interface CompanyRssRequest extends CompanyRssInput { readonly detail: ResponseDetail }
export interface CompanyRssChannel {
  readonly title: string;
  readonly link: string;
  readonly description?: string;
  readonly language?: string;
  readonly publishedAt?: string;
}
export interface CompanyRssItem {
  readonly title: string;
  readonly link: string;
  readonly receiptNumber?: string;
  readonly publishedAt?: string;
  readonly creator?: string;
  readonly guid?: string;
}
export interface CompanyRssResponse {
  readonly result: { readonly request: CompanyRssRequest; readonly channel: CompanyRssChannel; readonly items: readonly CompanyRssItem[] };
  readonly metadata: { readonly fetchedAt: string; readonly source: SearchSource; readonly completeness: Completeness; readonly itemCount: number };
  readonly references: { readonly rssUrl: string };
}

export class DartyClient {
  readonly #nativeClient: NativeDartyClient;

  constructor() {
    this.#nativeClient = new native.NativeDartyClient();
  }

  searchBody(input: SearchBodyInput, options?: RequestOptions): Promise<SearchBodyResponse> {
    return invoke(this.#nativeClient, "search-body", input, options);
  }

  companyDetail(input: CompanyDetailInput, options?: RequestOptions): Promise<CompanyDetailResponse> {
    return invoke(this.#nativeClient, "company-detail", input, options);
  }

  companyRss(input: CompanyRssInput, options?: RequestOptions): Promise<CompanyRssResponse> {
    return invoke(this.#nativeClient, "company-rss", input, options);
  }

  disclosureTypes(input: DisclosureTypesInput = {}, options?: RequestOptions): Promise<DisclosureTypesResponse> {
    return invoke(this.#nativeClient, "disclosure-types", input, options);
  }

  reportGuide(input: ReportGuideInput = {}, options?: RequestOptions): Promise<ReportGuideResponse> {
    return invoke(this.#nativeClient, "report-guide", input, options);
  }

  searchCompany(
    input: SearchCompanyInput,
    options?: RequestOptions,
  ): Promise<SearchCompanyResponse> {
    return invoke(this.#nativeClient, "search-company", input, options);
  }

  searchCompanyReports(
    input: SearchCompanyReportsInput,
    options?: RequestOptions,
  ): Promise<SearchCompanyReportsResponse> {
    return invoke(this.#nativeClient, "search-company-reports", input, options);
  }

  viewReport(input: ViewReportInput, options?: RequestOptions): Promise<ViewReportResponse> {
    return invoke(this.#nativeClient, "view-report", input, options);
  }
}
