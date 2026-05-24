import { Schema } from "effect";

import {
  annotateSchema,
  defaultedField,
  optionalField,
  requiredField,
} from "../../schema-annotations.ts";
import {
  responseDetailFieldSpec,
  type ResponseDetail,
} from "../../response-detail.ts";
import {
  searchCompanyReportsFieldCopy,
  searchCompanyReportsSchemaCopy,
} from "../copy.ts";
import {
  searchCompanyReportsClosingAccountsMonthValues,
  searchCompanyReportsCorporationTypeValues,
  searchCompanyReportsDisclosureTypePattern,
  searchCompanyReportsIndustryCodePattern,
} from "./filter-values.ts";

const datePattern = /^\d{8}$/;
const companyCodePattern = /^\d{8}$/;

const SearchCompanyReportsDateString = annotateSchema(
  Schema.String.pipe(Schema.pattern(datePattern)),
  {
    identifier: "SearchCompanyReportsDateString",
    description: searchCompanyReportsSchemaCopy.dateStringDescription,
  },
);

export const searchCompanyReportsPageSizeValues = [15, 30, 50, 100] as const;
const searchCompanyReportsAcceptedPageSizeValues = [
  5,
  10,
  ...searchCompanyReportsPageSizeValues,
] as const;
export type SearchCompanyReportsPageSize =
  (typeof searchCompanyReportsPageSizeValues)[number];

const SearchCompanyReportsSourcePageSizeSchema = Schema.Literal(
  ...searchCompanyReportsPageSizeValues,
);

const SearchCompanyReportsAcceptedPageSizeSchema = Schema.Literal(
  ...searchCompanyReportsAcceptedPageSizeValues,
);

const SearchCompanyReportsPageSizeSchema = Schema.transform(
  SearchCompanyReportsAcceptedPageSizeSchema,
  SearchCompanyReportsSourcePageSizeSchema,
  {
    decode: (pageSize) => (pageSize === 5 || pageSize === 10 ? 15 : pageSize),
    encode: (pageSize) => pageSize,
  },
);

export const searchCompanyReportsSortDirectionValues = ["asc", "desc"] as const;
export type SearchCompanyReportsSortDirection =
  (typeof searchCompanyReportsSortDirectionValues)[number];

const SearchCompanyReportsSortDirectionSchema = Schema.Literal(
  ...searchCompanyReportsSortDirectionValues,
);

const SearchCompanyReportsCorporationTypeSchema = Schema.Literal(
  ...searchCompanyReportsCorporationTypeValues,
);

const SearchCompanyReportsClosingAccountsMonthSchema = Schema.Literal(
  ...searchCompanyReportsClosingAccountsMonthValues,
);

const SearchCompanyReportsDisclosureTypeSchema = Schema.String.pipe(
  Schema.pattern(searchCompanyReportsDisclosureTypePattern),
);

type BaseFieldSpecShape = {
  readonly description: string;
  readonly examples?: readonly unknown[];
  readonly schema: unknown;
};

type IntegerFieldSpecShape = BaseFieldSpecShape & {
  readonly kind: "integer";
  readonly minimum: number;
  readonly maximum: number;
};

type EnumFieldSpecShape = BaseFieldSpecShape & {
  readonly kind: "enum";
  readonly enumValues: readonly (string | number)[];
};

type PatternStringFieldSpecShape = BaseFieldSpecShape & {
  readonly kind: "patternString";
  readonly expectedToken: string;
};

type DateFieldSpecShape = BaseFieldSpecShape & {
  readonly kind: "date";
};

type BooleanFieldSpecShape = BaseFieldSpecShape & {
  readonly kind: "boolean";
};

type StringFieldSpecShape = BaseFieldSpecShape & {
  readonly kind: "string";
  readonly nonEmpty: true;
};

type StringArrayFieldSpecShape = BaseFieldSpecShape & {
  readonly kind: "stringArray";
  readonly expectedToken: string;
};

export type SearchCompanyReportsFieldSpec =
  | IntegerFieldSpecShape
  | EnumFieldSpecShape
  | PatternStringFieldSpecShape
  | DateFieldSpecShape
  | BooleanFieldSpecShape
  | StringFieldSpecShape
  | StringArrayFieldSpecShape;

type DefaultedFieldSpecShape = SearchCompanyReportsFieldSpec & {
  readonly defaultValue: unknown;
};

const inputSpecs = {
  defaulted: {
    page: {
      kind: "integer",
      minimum: 1,
      maximum: 100,
      defaultValue: 1,
      schema: Schema.Int.pipe(
        Schema.greaterThanOrEqualTo(1),
        Schema.lessThanOrEqualTo(100),
      ),
      description: searchCompanyReportsFieldCopy.page.description,
      examples: [1],
    },
    pageSize: {
      kind: "enum",
      enumValues: searchCompanyReportsAcceptedPageSizeValues,
      defaultValue: 15,
      schema: SearchCompanyReportsPageSizeSchema,
      description: searchCompanyReportsFieldCopy.pageSize.description,
      examples: [15, 30],
    },
    sortDirection: {
      kind: "enum",
      enumValues: searchCompanyReportsSortDirectionValues,
      defaultValue: "desc",
      schema: SearchCompanyReportsSortDirectionSchema,
      description: searchCompanyReportsFieldCopy.sortDirection.description,
      examples: ["desc"],
    },
    disclosureTypes: {
      kind: "stringArray",
      expectedToken: "array_of_disclosure_type_codes",
      defaultValue: [],
      schema: Schema.Array(SearchCompanyReportsDisclosureTypeSchema),
      description: searchCompanyReportsFieldCopy.disclosureTypes.description,
      examples: [["A001"], ["I001"]],
    },
    industryCode: {
      kind: "patternString",
      expectedToken: "industry_code_or_all",
      defaultValue: "all",
      schema: Schema.String.pipe(
        Schema.pattern(searchCompanyReportsIndustryCodePattern),
      ),
      description: searchCompanyReportsFieldCopy.industryCode.description,
      examples: ["all", "612"],
    },
    corporationType: {
      kind: "enum",
      enumValues: searchCompanyReportsCorporationTypeValues,
      defaultValue: "all",
      schema: SearchCompanyReportsCorporationTypeSchema,
      description: searchCompanyReportsFieldCopy.corporationType.description,
      examples: ["all", "P"],
    },
    closingAccountsMonth: {
      kind: "enum",
      enumValues: searchCompanyReportsClosingAccountsMonthValues,
      defaultValue: "all",
      schema: SearchCompanyReportsClosingAccountsMonthSchema,
      description: searchCompanyReportsFieldCopy.closingAccountsMonth.description,
      examples: ["all", "12"],
    },
    includeAllReports: {
      kind: "boolean",
      defaultValue: false,
      schema: Schema.Boolean,
      description: searchCompanyReportsFieldCopy.includeAllReports.description,
      examples: [false],
    },
    detail: responseDetailFieldSpec,
  } as const satisfies Record<string, DefaultedFieldSpecShape>,
  optional: {
    presenterName: {
      kind: "string",
      nonEmpty: true,
      schema: Schema.NonEmptyString,
      description: searchCompanyReportsFieldCopy.presenterName.description,
      examples: ["삼성전자"],
    },
    reportName: {
      kind: "string",
      nonEmpty: true,
      schema: Schema.NonEmptyString,
      description: searchCompanyReportsFieldCopy.reportName.description,
      examples: ["사업보고서"],
    },
  } as const satisfies Record<string, SearchCompanyReportsFieldSpec>,
  required: {
    companyCode: {
      kind: "patternString",
      expectedToken: "8_digit_company_code",
      schema: Schema.String.pipe(Schema.pattern(companyCodePattern)),
      description: searchCompanyReportsFieldCopy.companyCode.description,
      examples: ["00126380"],
    },
    startDate: {
      kind: "date",
      schema: SearchCompanyReportsDateString,
      description: searchCompanyReportsFieldCopy.startDate.description,
      examples: ["20250331"],
    },
    endDate: {
      kind: "date",
      schema: SearchCompanyReportsDateString,
      description: searchCompanyReportsFieldCopy.endDate.description,
      examples: ["20260331"],
    },
  } as const satisfies Record<string, SearchCompanyReportsFieldSpec>,
} as const;

export const searchCompanyReportsFieldSpecs = {
  ...inputSpecs.defaulted,
  ...inputSpecs.optional,
  ...inputSpecs.required,
} as const;

export type SearchCompanyReportsInputKey = keyof typeof searchCompanyReportsFieldSpecs;

const searchCompanyReportsRequestFields = {
  companyCode: requiredField(searchCompanyReportsFieldSpecs.companyCode),
  startDate: requiredField(searchCompanyReportsFieldSpecs.startDate),
  endDate: requiredField(searchCompanyReportsFieldSpecs.endDate),
  page: defaultedField(searchCompanyReportsFieldSpecs.page),
  pageSize: defaultedField(searchCompanyReportsFieldSpecs.pageSize),
  sortDirection: defaultedField(searchCompanyReportsFieldSpecs.sortDirection),
  presenterName: optionalField(searchCompanyReportsFieldSpecs.presenterName),
  reportName: optionalField(searchCompanyReportsFieldSpecs.reportName),
  disclosureTypes: defaultedField(searchCompanyReportsFieldSpecs.disclosureTypes),
  industryCode: defaultedField(searchCompanyReportsFieldSpecs.industryCode),
  corporationType: defaultedField(searchCompanyReportsFieldSpecs.corporationType),
  closingAccountsMonth: defaultedField(
    searchCompanyReportsFieldSpecs.closingAccountsMonth,
  ),
  includeAllReports: defaultedField(searchCompanyReportsFieldSpecs.includeAllReports),
  detail: defaultedField(searchCompanyReportsFieldSpecs.detail),
} as const;

export const SearchCompanyReportsRequestSchema = Schema.Struct(
  searchCompanyReportsRequestFields,
).annotations({
  identifier: "SearchCompanyReportsRequest",
  description: searchCompanyReportsSchemaCopy.requestDescription,
  examples: searchCompanyReportsSchemaCopy.requestExamples,
});

export type SearchCompanyReportsRawInput =
  typeof SearchCompanyReportsRequestSchema.Encoded;
type SearchCompanyReportsResolvedRequest =
  typeof SearchCompanyReportsRequestSchema.Type;
export type SearchCompanyReportsRequest = Omit<
  SearchCompanyReportsResolvedRequest,
  "detail"
> & {
  readonly detail?: ResponseDetail;
};

export const decodeSearchCompanyReportsRequest = Schema.decodeUnknownEither(
  SearchCompanyReportsRequestSchema,
);
