import { Schema } from "effect";

import {
  annotateSchema,
  defaultedField,
  optionalField,
  requiredField,
} from "../../schema-annotations.ts";
import {
  searchBodyFieldCopy,
  searchBodySchemaCopy,
} from "../copy.ts";

const datePattern = /^\d{8}$/;
const companyCodePattern = /^\d{8}$/;

const SearchBodyDateString = annotateSchema(
  Schema.String.pipe(Schema.pattern(datePattern)),
  {
    identifier: "SearchBodyDateString",
    description: searchBodySchemaCopy.dateStringDescription,
  },
);

export const searchBodySortByValues = ["date", "reportName"] as const;
export type SearchBodySortBy =
  (typeof searchBodySortByValues)[number];

const SearchBodySortBySchema = Schema.Literal(...searchBodySortByValues);

export const searchBodySortDirectionValues = ["asc", "desc"] as const;
export type SearchBodySortDirection =
  (typeof searchBodySortDirectionValues)[number];

const SearchBodySortDirectionSchema = Schema.Literal(
  ...searchBodySortDirectionValues,
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
  readonly enumValues: readonly string[];
};

type StringFieldSpecShape = BaseFieldSpecShape & {
  readonly kind: "string";
  readonly nonEmpty: true;
};

type PatternStringFieldSpecShape = BaseFieldSpecShape & {
  readonly kind: "patternString";
  readonly expectedToken: string;
};

type DateFieldSpecShape = BaseFieldSpecShape & {
  readonly kind: "date";
};

export type FieldSpecShape =
  | IntegerFieldSpecShape
  | EnumFieldSpecShape
  | StringFieldSpecShape
  | PatternStringFieldSpecShape
  | DateFieldSpecShape;

type DefaultedFieldSpecShape = FieldSpecShape & {
  readonly defaultValue: unknown;
};

type RequiredFieldSpecShape = FieldSpecShape;

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
      description: searchBodyFieldCopy.page.description,
      examples: [1],
    },
    sortBy: {
      kind: "enum",
      enumValues: searchBodySortByValues,
      defaultValue: "date",
      schema: SearchBodySortBySchema,
      description: searchBodyFieldCopy.sortBy.description,
      examples: ["date"],
    },
    sortDirection: {
      kind: "enum",
      enumValues: searchBodySortDirectionValues,
      defaultValue: "desc",
      schema: SearchBodySortDirectionSchema,
      description: searchBodyFieldCopy.sortDirection.description,
      examples: ["desc"],
    },
  } as const satisfies Record<string, DefaultedFieldSpecShape>,
  required: {
    keyword: {
      kind: "string",
      nonEmpty: true,
      schema: Schema.NonEmptyString,
      description: searchBodyFieldCopy.keyword.description,
      examples: ["배당", "사과|포도"],
    },
    startDate: {
      kind: "date",
      schema: SearchBodyDateString,
      description: searchBodyFieldCopy.startDate.description,
      examples: ["20250331"],
    },
    endDate: {
      kind: "date",
      schema: SearchBodyDateString,
      description: searchBodyFieldCopy.endDate.description,
      examples: ["20260331"],
    },
  } as const satisfies Record<string, RequiredFieldSpecShape>,
  optional: {
    companyCode: {
      kind: "patternString",
      expectedToken: "8_digit_company_code",
      schema: Schema.String.pipe(Schema.pattern(companyCodePattern)),
      description: searchBodyFieldCopy.companyCode.description,
      examples: ["00126380"],
    },
    presenterName: {
      kind: "string",
      nonEmpty: true,
      schema: Schema.NonEmptyString,
      description: searchBodyFieldCopy.presenterName.description,
      examples: ["삼성전자"],
    },
    reportName: {
      kind: "string",
      nonEmpty: true,
      schema: Schema.NonEmptyString,
      description: searchBodyFieldCopy.reportName.description,
      examples: ["사업보고서"],
    },
  } as const satisfies Record<string, FieldSpecShape>,
} as const;

export const searchBodyFieldSpecs = {
  ...inputSpecs.defaulted,
  ...inputSpecs.required,
  ...inputSpecs.optional,
} as const;

export type SearchBodyInputKey = keyof typeof searchBodyFieldSpecs;

export type SearchBodyFieldSpec =
  (typeof searchBodyFieldSpecs)[SearchBodyInputKey];

const searchBodyRequestFields = {
  page: defaultedField(searchBodyFieldSpecs.page),
  sortBy: defaultedField(searchBodyFieldSpecs.sortBy),
  sortDirection: defaultedField(searchBodyFieldSpecs.sortDirection),
  keyword: requiredField(searchBodyFieldSpecs.keyword),
  startDate: requiredField(searchBodyFieldSpecs.startDate),
  endDate: requiredField(searchBodyFieldSpecs.endDate),
  companyCode: optionalField(searchBodyFieldSpecs.companyCode),
  presenterName: optionalField(searchBodyFieldSpecs.presenterName),
  reportName: optionalField(searchBodyFieldSpecs.reportName),
} as const;

export const SearchBodyRequestSchema = Schema.Struct(
  searchBodyRequestFields,
).annotations({
  identifier: "SearchBodyRequest",
  description: searchBodySchemaCopy.requestDescription,
  examples: searchBodySchemaCopy.requestExamples,
});

export type SearchBodyRawInput = typeof SearchBodyRequestSchema.Encoded;
export type SearchBodyRequest = typeof SearchBodyRequestSchema.Type;

export const decodeSearchBodyRequest = Schema.decodeUnknownEither(
  SearchBodyRequestSchema,
);

