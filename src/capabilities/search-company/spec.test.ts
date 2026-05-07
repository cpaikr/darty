import { describe, expect, test } from "bun:test";

import {
  searchCompanyInputJsonSchema,
  searchCompanyOperationName,
  searchCompanyResultJsonSchema,
} from "./spec.ts";

describe("search-company spec", () => {
  test("exports operation identity and JSON schemas", () => {
    expect(searchCompanyOperationName).toBe("search-company");
    expect(searchCompanyInputJsonSchema).toMatchObject({
      type: "object",
      required: ["companyName"],
    });
    expect(searchCompanyResultJsonSchema).toMatchObject({
      type: "object",
      required: ["result", "metadata", "references", "warnings"],
    });
  });
});
