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
      items:
        request.query === undefined
          ? group.items
          : group.items.filter((item) => matchesQuery(item, request.query!)),
    }))
    .filter((group) => group.items.length > 0);

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
      sourceBehavior: {
        codeSet: "pblntf_detail_ty",
        observationStatus: "source_material",
      },
      completeness: "complete",
    },
    references: {
      sourceUrl: disclosureTypesSource.url,
    },
    warnings: [],
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

  return new DisclosureTypesFailure({
    code: "internal_error",
    message: disclosureTypesFailureCopy.unexpectedDisclosureTypes,
    retryable: false,
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
