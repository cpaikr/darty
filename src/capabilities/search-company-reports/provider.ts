import { Schema } from "effect";

import {
  disclosureTypeCategories,
  type DisclosureTypeCategory,
} from "../disclosure-types/data.ts";
import { searchCompanyReportsResultCopy } from "./copy.ts";
import type {
  SearchCompanyReportsCompany,
  SearchCompanyReportsItem,
  SearchCompanyReportsMatchedDisclosureType,
  SearchCompanyReportsMetadata,
  SearchCompanyReportsPagination,
  SearchCompanyReportsReferences,
  SearchCompanyReportsRequest,
  SearchCompanyReportsResult,
  SearchCompanyReportsWarning,
} from "./contract.ts";

export type SearchCompanyReportsProviderResult = {
  readonly company: SearchCompanyReportsCompany;
  readonly pagination: SearchCompanyReportsPagination;
  readonly items: readonly SearchCompanyReportsItem[];
  readonly metadata: SearchCompanyReportsMetadata;
  readonly references: SearchCompanyReportsReferences;
  readonly warnings: readonly SearchCompanyReportsWarning[];
};

export class SearchCompanyReportsProviderError extends Schema.TaggedError<SearchCompanyReportsProviderError>()(
  "SearchCompanyReportsProviderError",
  {
    code: Schema.Literal(
      "source_unavailable",
      "source_changed",
      "source_parse_failure",
      "internal_provider_error",
    ),
    message: Schema.String,
    retryable: Schema.Boolean,
    providerId: Schema.String,
    sourceUrl: Schema.optional(Schema.String),
  },
) {}

export type SearchCompanyReportsProvider = {
  readonly search: (
    request: SearchCompanyReportsRequest,
  ) => Promise<SearchCompanyReportsProviderResult>;
};

const disclosureTypeMetadata: ReadonlyMap<
  string,
  Pick<
    SearchCompanyReportsMatchedDisclosureType,
    "label" | "category" | "categoryLabel"
  >
> = new Map(
  disclosureTypeCategories.flatMap((group) =>
    group.items.map((item) => [
      item.code,
      {
        label: item.label,
        category: group.category,
        categoryLabel: group.categoryLabel,
      },
    ]),
  ),
);

const disclosureTypeCategoryMetadata: ReadonlyMap<
  DisclosureTypeCategory,
  Pick<SearchCompanyReportsMatchedDisclosureType, "category" | "categoryLabel">
> = new Map(
  disclosureTypeCategories.map((group) => [
    group.category,
    { category: group.category, categoryLabel: group.categoryLabel },
  ]),
);

const uniqueDisclosureTypes = (
  disclosureTypes: readonly string[],
): readonly string[] => [...new Set(disclosureTypes)];

/**
 * Attributes result rows only when the request itself proves the matched
 * disclosure type. DART dsab007 rows do not expose which repeated publicType
 * matched, and fan-out attribution would need separate merge/pagination rules.
 */
const toMatchedDisclosureType = (
  request: SearchCompanyReportsRequest,
): SearchCompanyReportsMatchedDisclosureType | undefined => {
  const disclosureTypes = uniqueDisclosureTypes(request.disclosureTypes);
  const [code] = disclosureTypes;
  if (code === undefined || disclosureTypes.length !== 1) {
    return undefined;
  }

  const knownType = disclosureTypeMetadata.get(code);
  const category = code[0] as DisclosureTypeCategory;
  const knownCategory = disclosureTypeCategoryMetadata.get(category);

  if (knownType !== undefined) {
    return {
      code,
      label: knownType.label,
      category: knownType.category,
      categoryLabel: knownType.categoryLabel,
      evidence: { source: "single_disclosure_type_request" },
    };
  }

  if (knownCategory === undefined) {
    return undefined;
  }

  return {
    code,
    category: knownCategory.category,
    categoryLabel: knownCategory.categoryLabel,
    evidence: { source: "single_disclosure_type_request" },
  };
};

const addMatchedDisclosureType = (
  item: SearchCompanyReportsItem,
  matchedDisclosureType: SearchCompanyReportsMatchedDisclosureType | undefined,
): SearchCompanyReportsItem => {
  if (matchedDisclosureType === undefined) {
    return item;
  }

  return { ...item, matchedDisclosureType };
};

const getDisclosureTypeWarnings = (
  request: SearchCompanyReportsRequest,
  items: readonly SearchCompanyReportsItem[],
): readonly SearchCompanyReportsWarning[] => {
  if (
    uniqueDisclosureTypes(request.disclosureTypes).length <= 1 ||
    items.length === 0
  ) {
    return [];
  }

  return [
    {
      code: "matched_disclosure_type_unavailable",
      message: searchCompanyReportsResultCopy.matchedDisclosureTypeUnavailable,
    },
  ];
};

export const buildSearchCompanyReportsResult = (
  request: SearchCompanyReportsRequest,
  providerResult: SearchCompanyReportsProviderResult,
): SearchCompanyReportsResult => {
  const matchedDisclosureType = toMatchedDisclosureType(request);
  const items = providerResult.items.map((item) =>
    addMatchedDisclosureType(item, matchedDisclosureType),
  );

  return {
    result: {
      request,
      company: providerResult.company,
      pagination: providerResult.pagination,
      items,
    },
    metadata: providerResult.metadata,
    references: providerResult.references,
    warnings: [
      ...providerResult.warnings,
      ...getDisclosureTypeWarnings(request, items),
    ],
  };
};
