export const disclosureTypesFieldCopy = {
  category: {
    description:
      "Disclosure type category. Use one DART code prefix from A through J. Omit it to return all categories.",
    cliDescription:
      "Filter by disclosure type category (A-J). Omit it to return the full list.",
  },
  query: {
    description:
      "Find disclosure type codes by code or Korean label substring. Examples: 사업보고서, 수시공시, A001.",
    cliDescription:
      "Code or Korean-label search term. Examples: 사업보고서, 수시공시, A001.",
  },
} as const;

export const disclosureTypesCliCopy = {
  summary: "List DART 공시상세유형 disclosure type codes.",
  examplesHeading: "Examples",
  examples: [
    {
      description: "Print the full DART 공시상세유형 code list.",
      argv: [],
    },
    {
      description: "Print only category A codes (정기공시 family).",
      argv: ["--category", "A"],
    },
    {
      description: "Find codes whose label or code contains 사업보고서.",
      argv: ["--query", "사업보고서"],
    },
  ],
  notesHeading: "Search tips",
  notes: [
    "Categories: A=정기공시, B=주요사항보고, C=발행공시, D=지분공시, E=기타공시, F=외부감사관련, G=펀드공시, H=자산유동화, I=거래소공시, J=공정위공시.",
    "If the same label appears in multiple categories, inspect categoryLabel/categoryDescription or narrow with `--category`. Example: B001=general 주요사항보고, H006=자산유동화 주요사항보고서.",
    "Pass detailed codes returned by this command, such as A001 or I001, to search-company-reports `--disclosure-type`.",
    "Use search-company-reports `--report-name` when you want report-title text filtering instead of disclosure type codes.",
  ],
} as const;

export const disclosureTypesFailureCopy = {
  unexpectedDisclosureTypes:
    "Unexpected internal error while listing disclosure type codes.",
} as const;

export const disclosureTypesSchemaCopy = {
  requestDescription:
    "DART 공시상세유형 code discovery input. Omit category and query to return the full code menu.",
  requestExamples: [{ category: "A" }, { query: "사업보고서" }, {}],
  resultDescription:
    "DART 공시상세유형 code discovery result envelope. Returns detailed codes and labels accepted by search-company-reports disclosureTypes.",
} as const;

export const disclosureTypesToolCopy = {
  title: "DART disclosure type code lookup",
  description:
    "Look up DART 공시상세유형 detailed codes for search-company-reports disclosureTypes/--disclosure-type. Can be narrowed by category (A-J) or query.",
} as const;

export const disclosureTypesValidationCopy = {
  inputExpected: "disclosure_types_parameters_object",
  inputMustBeObject:
    "disclosure-types input must be an object containing semantic parameters.",
  expectedCategory: "disclosure type category code from A through J",
  expectedNonEmptyString: "non-empty string",
  mustBeString: (parameter: string): string =>
    `Parameter "${parameter}" must be a string.`,
  mustNotBeEmpty: (parameter: string): string =>
    `Parameter "${parameter}" cannot be empty.`,
  mustUseCategory: (parameter: string): string =>
    `Parameter "${parameter}" must be a disclosure type category code from A through J.`,
  unknownParameter: (parameter: string): string =>
    `Unknown parameter: "${parameter}".`,
} as const;
