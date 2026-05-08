import { Schema } from "effect";

import {
  searchCompanyReportsFieldCopy,
  searchCompanyReportsSchemaCopy,
} from "../copy.ts";

const datePattern = /^\d{8}$/;
const companyCodePattern = /^\d{8}$/;

const annotateSchema = <S>(
  schema: S,
  annotations: Record<PropertyKey, unknown>,
): S =>
  (schema as S & { annotations: (annotations: Record<PropertyKey, unknown>) => S })
    .annotations(annotations);

const SearchCompanyReportsDateString = annotateSchema(
  Schema.String.pipe(Schema.pattern(datePattern)),
  {
    identifier: "SearchCompanyReportsDateString",
    description: searchCompanyReportsSchemaCopy.dateStringDescription,
  },
);

export const searchCompanyReportsPageSizeValues = [15, 30, 50, 100] as const;
export type SearchCompanyReportsPageSize =
  (typeof searchCompanyReportsPageSizeValues)[number];

const SearchCompanyReportsPageSizeSchema = Schema.Literal(
  ...searchCompanyReportsPageSizeValues,
);

export const searchCompanyReportsSortDirectionValues = ["asc", "desc"] as const;
export type SearchCompanyReportsSortDirection =
  (typeof searchCompanyReportsSortDirectionValues)[number];

const SearchCompanyReportsSortDirectionSchema = Schema.Literal(
  ...searchCompanyReportsSortDirectionValues,
);

type BaseFieldSpecShape = {
  readonly description: string;
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

export type SearchCompanyReportsFieldSpec =
  | IntegerFieldSpecShape
  | EnumFieldSpecShape
  | PatternStringFieldSpecShape
  | DateFieldSpecShape
  | BooleanFieldSpecShape;

type DefaultedFieldSpecShape = SearchCompanyReportsFieldSpec & {
  readonly defaultValue: unknown;
};

const defaultedField = <A, I, R>(spec: {
  readonly schema: Schema.Schema<A, I, R>;
  readonly description: string;
  readonly defaultValue: A;
}) =>
  annotateSchema(
    Schema.optionalWith(
      annotateSchema(spec.schema, {
        description: spec.description,
      }),
      { default: () => spec.defaultValue },
    ),
    { default: spec.defaultValue },
  );

const requiredField = <A, I, R>(spec: {
  readonly schema: Schema.Schema<A, I, R>;
  readonly description: string;
}) =>
  annotateSchema(spec.schema, {
    description: spec.description,
  });

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
    },
    pageSize: {
      kind: "enum",
      enumValues: searchCompanyReportsPageSizeValues,
      defaultValue: 15,
      schema: SearchCompanyReportsPageSizeSchema,
      description: searchCompanyReportsFieldCopy.pageSize.description,
    },
    sortDirection: {
      kind: "enum",
      enumValues: searchCompanyReportsSortDirectionValues,
      defaultValue: "desc",
      schema: SearchCompanyReportsSortDirectionSchema,
      description: searchCompanyReportsFieldCopy.sortDirection.description,
    },
    includeAllReports: {
      kind: "boolean",
      defaultValue: false,
      schema: Schema.Boolean,
      description: searchCompanyReportsFieldCopy.includeAllReports.description,
    },
  } as const satisfies Record<string, DefaultedFieldSpecShape>,
  required: {
    companyCode: {
      kind: "patternString",
      expectedToken: "8_digit_company_code",
      schema: Schema.String.pipe(Schema.pattern(companyCodePattern)),
      description: searchCompanyReportsFieldCopy.companyCode.description,
    },
    startDate: {
      kind: "date",
      schema: SearchCompanyReportsDateString,
      description: searchCompanyReportsFieldCopy.startDate.description,
    },
    endDate: {
      kind: "date",
      schema: SearchCompanyReportsDateString,
      description: searchCompanyReportsFieldCopy.endDate.description,
    },
  } as const satisfies Record<string, SearchCompanyReportsFieldSpec>,
} as const;

export const searchCompanyReportsFieldSpecs = {
  ...inputSpecs.defaulted,
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
  includeAllReports: defaultedField(searchCompanyReportsFieldSpecs.includeAllReports),
} as const;

export const SearchCompanyReportsRequestSchema = Schema.Struct(
  searchCompanyReportsRequestFields,
).annotations({
  identifier: "SearchCompanyReportsRequest",
  description: searchCompanyReportsSchemaCopy.requestDescription,
});

export type SearchCompanyReportsRawInput =
  typeof SearchCompanyReportsRequestSchema.Encoded;
export type SearchCompanyReportsRequest =
  typeof SearchCompanyReportsRequestSchema.Type;

export const decodeSearchCompanyReportsRequest = Schema.decodeUnknownEither(
  SearchCompanyReportsRequestSchema,
);
