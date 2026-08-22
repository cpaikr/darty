export type DartyErrorCode = "invalid_request" | "not_found" | "source_unavailable" | "source_changed" | "source_parse_failure" | "internal_error";
export interface DartyErrorData {
    readonly code: DartyErrorCode;
    readonly message: string;
    readonly retryable: boolean;
    readonly parameter?: string;
    readonly sourceUrl?: string;
    readonly recoveryHint?: string;
}
export declare class DartyError extends Error {
    readonly code: DartyErrorCode;
    readonly retryable: boolean;
    readonly parameter?: string;
    readonly sourceUrl?: string;
    readonly recoveryHint?: string;
    constructor(error: DartyErrorData);
}
export interface RequestOptions {
    readonly signal?: AbortSignal;
}
export interface SearchCompanyInput {
    readonly companyName: string;
    readonly page?: number;
    readonly pageSize?: number;
}
export interface SearchCompanyReportsInput {
    readonly companyCode: string;
    readonly startDate: string;
    readonly endDate: string;
    readonly page?: number;
    readonly pageSize?: number;
    readonly sortDirection?: "asc" | "desc";
    readonly presenterName?: string;
    readonly reportName?: string;
    readonly disclosureTypes?: readonly string[];
    readonly industryCode?: string;
    readonly corporationType?: string;
    readonly closingAccountsMonth?: string;
    readonly includeAllReports?: boolean;
    readonly detail?: "concise" | "detailed" | "raw";
}
export interface ViewReportInput {
    readonly receipt: string;
    readonly documentId?: string;
    readonly sectionId?: string;
    readonly outputFormat?: "html" | "markdown";
    readonly maxBytes?: number;
    readonly contentStartByte?: number;
    readonly detail?: "concise" | "detailed" | "raw";
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
export interface SearchCompanyResponse {
    readonly result: {
        readonly request: Required<SearchCompanyInput>;
        readonly pagination: Pagination;
        readonly items: readonly {
            readonly companyCode: string;
            readonly companyName: string;
            readonly stockCode?: string;
            readonly marketKind: "kospi" | "kosdaq" | "konex" | "etc" | "unknown";
            readonly marketLabel?: string;
            readonly references: {
                readonly detailEndpoint: string;
            };
            readonly evidence: {
                readonly rawCompanyLinkHref: string;
                readonly rawMarketBadgeText?: string;
            };
        }[];
    };
    readonly metadata: Record<string, unknown>;
    readonly references: {
        readonly searchUrl: string;
    };
    readonly warnings: readonly Warning[];
}
export interface SearchCompanyReportsResponse {
    readonly result: {
        readonly request: SearchCompanyReportsInput & {
            readonly page: number;
            readonly pageSize: number;
            readonly sortDirection: "asc" | "desc";
            readonly disclosureTypes: readonly string[];
            readonly industryCode: string;
            readonly corporationType: string;
            readonly closingAccountsMonth: string;
            readonly includeAllReports: boolean;
        };
        readonly company: FilingCompany;
        readonly pagination: Pagination;
        readonly items: readonly FilingItem[];
    };
    readonly metadata: Record<string, unknown>;
    readonly references: {
        readonly searchUrl: string;
    };
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
        readonly evidence: {
            readonly source: string;
        };
    };
    readonly references: {
        readonly viewerUrl: string;
    };
    readonly remarks: readonly {
        readonly text: string;
        readonly title?: string;
    }[];
    readonly evidence?: {
        readonly rawRowText: string;
    };
}
export interface ViewReportResponse {
    readonly result: {
        readonly request: ViewReportInput & {
            readonly outputFormat: "html" | "markdown";
            readonly maxBytes: number;
            readonly contentStartByte: number;
        };
        readonly receipt: {
            readonly receiptNumber: string;
        };
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
            readonly section?: {
                readonly id: string;
                readonly title: string;
            };
            readonly format: "html" | "markdown";
            readonly body: string;
        };
        readonly navigation?: {
            readonly parent?: NavigationEntry;
            readonly previous?: NavigationEntry;
            readonly next?: NavigationEntry;
            readonly children: readonly NavigationEntry[];
        };
    };
    readonly metadata: Record<string, unknown>;
    readonly references: {
        readonly viewerUrl: string;
    };
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
export declare class DartyClient {
    #private;
    constructor();
    searchCompany(input: SearchCompanyInput, options?: RequestOptions): Promise<SearchCompanyResponse>;
    searchCompanyReports(input: SearchCompanyReportsInput, options?: RequestOptions): Promise<SearchCompanyReportsResponse>;
    viewReport(input: ViewReportInput, options?: RequestOptions): Promise<ViewReportResponse>;
}
