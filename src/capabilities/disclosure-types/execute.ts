import { getExecutionFailureRecoveryHint } from "../recovery-hints.ts";
import { disclosureTypesFailureCopy } from "./copy.ts";
import {
  DisclosureTypesFailure,
  InvalidDisclosureTypesRequest,
  resolveDisclosureTypesRequest,
  type DisclosureTypesRawInput,
  type DisclosureTypesRequest,
  type DisclosureTypesResult,
} from "./contract.ts";
import {
  disclosureTypeCategories,
  disclosureTypeCategoryDescriptionProvenance,
  disclosureTypeCategoryLabelSource,
  disclosureTypesSource,
  type DisclosureTypeCategoryGroup,
} from "./data.ts";

const matchesQuery = (
  item: DisclosureTypeCategoryGroup["items"][number],
  query: string,
): boolean => {
  const normalizedQuery = query.toLocaleLowerCase("ko-KR");

  return (
    item.code.toLocaleLowerCase("en-US").includes(normalizedQuery) ||
    item.label.toLocaleLowerCase("ko-KR").includes(normalizedQuery)
  );
};

const filterDisclosureTypes = (
  request: DisclosureTypesRequest,
): readonly DisclosureTypeCategoryGroup[] =>
  disclosureTypeCategories
    .filter(
      (group) =>
        request.category === undefined || group.category === request.category,
    )
    .map((group) => ({
      category: group.category,
      categoryLabel: group.categoryLabel,
      categoryDescription: group.categoryDescription,
      items:
        request.query === undefined
          ? group.items
          : group.items.filter((item) => matchesQuery(item, request.query!)),
    }))
    .filter((group) => group.items.length > 0);

const buildAmbiguousLabelWarnings = (
  request: DisclosureTypesRequest,
  categories: readonly DisclosureTypeCategoryGroup[],
): DisclosureTypesResult["warnings"] => {
  if (request.query === undefined) {
    return [];
  }

  const groupsByLabel = new Map<
    string,
    Array<{
      readonly code: string;
      readonly category: string;
      readonly categoryLabel: string;
    }>
  >();

  for (const category of categories) {
    for (const item of category.items) {
      const matches = groupsByLabel.get(item.label) ?? [];
      matches.push({
        code: item.code,
        category: category.category,
        categoryLabel: category.categoryLabel,
      });
      groupsByLabel.set(item.label, matches);
    }
  }

  return [...groupsByLabel.entries()]
    .filter(([, matches]) => matches.length > 1)
    .map(([label, matches]) => ({
      code: "ambiguous_label_match",
      message: `Query "${request.query}" returned detailed codes with the same label ("${label}") in multiple categories: ${matches
        .map(
          (match) =>
            `${match.code}(${match.category}=${match.categoryLabel})`,
        )
        .join(", ")}. Inspect categoryLabel or narrow with category/--category.`,
    }));
};

const buildDisclosureTypesResult = (
  request: DisclosureTypesRequest,
): DisclosureTypesResult => {
  const categories = filterDisclosureTypes(request);
  const totalCount = categories.reduce(
    (sum, category) => sum + category.items.length,
    0,
  );

  return {
    result: {
      request,
      totalCount,
      categories,
    },
    metadata: {
      source: {
        system: "open-dart-docs",
        repository: disclosureTypesSource.repository,
        commit: disclosureTypesSource.commit,
        path: disclosureTypesSource.path,
      },
      categoryLabelSource: disclosureTypeCategoryLabelSource,
      categoryDescriptionProvenance: disclosureTypeCategoryDescriptionProvenance,
      sourceBehavior: {
        codeSet: "pblntf_detail_ty",
        categoryCodeSet: "pblntf_ty",
        observationStatus: "source_material",
      },
      completeness: "complete",
    },
    references: {
      sourceUrl: disclosureTypesSource.url,
    },
    warnings: buildAmbiguousLabelWarnings(request, categories),
  };
};

const toDisclosureTypesFailure = (error: unknown): DisclosureTypesFailure => {
  if (error instanceof InvalidDisclosureTypesRequest) {
    return new DisclosureTypesFailure({
      code: "invalid_request",
      message: error.message,
      retryable: false,
      parameter: error.parameter,
    });
  }

  const recoveryHint = getExecutionFailureRecoveryHint("internal_error", false);

  return new DisclosureTypesFailure({
    code: "internal_error",
    message: disclosureTypesFailureCopy.unexpectedDisclosureTypes,
    retryable: false,
    ...(recoveryHint === undefined ? {} : { recoveryHint }),
  });
};

export const executeDisclosureTypes = async (
  input: Partial<DisclosureTypesRawInput> & Record<string, unknown>,
): Promise<DisclosureTypesResult> => {
  try {
    const request = resolveDisclosureTypesRequest(input);

    return buildDisclosureTypesResult(request);
  } catch (error) {
    throw toDisclosureTypesFailure(error);
  }
};
