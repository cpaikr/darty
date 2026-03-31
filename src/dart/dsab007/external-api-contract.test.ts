import { describe, expect, test } from "bun:test";
import { Effect, Schema } from "effect";

import {
  Dsab007ContentsSearchInput,
  type Dsab007ContentsSearchInput as Dsab007ContentsSearchInputType,
} from "./contracts.ts";
import {
  dsab007ContentsFieldContracts,
  dsab007ContentsStablePublicFields,
} from "./external-api-contract.ts";
import { buildDsab007ContentsSearchForm } from "./request.ts";

const decodeInput = (input: unknown) =>
  Effect.runPromise(Schema.decodeUnknown(Dsab007ContentsSearchInput)(input));

const expectDecodeSuccess = async (input: unknown): Promise<void> => {
  const decoded = await decodeInput(input);
  expect(decoded).toBeDefined();
};

const expectDecodeFailure = async (input: unknown): Promise<void> => {
  await expect(decodeInput(input)).rejects.toBeDefined();
};

const getSerializedValue = (
  form: URLSearchParams,
  key: string,
): string | null => form.get(key);

describe("dsab007 contents external API contract", () => {
  test("tracks the stable public argument list explicitly", () => {
    expect(dsab007ContentsFieldContracts.map(({ key }) => key)).toEqual(
      [...dsab007ContentsStablePublicFields],
    );
  });

  describe("schema boundaries", () => {
    for (const fieldContract of dsab007ContentsFieldContracts) {
      describe(fieldContract.key, () => {
        for (const testCase of fieldContract.accepts) {
          test(testCase.name, async () => {
            await expectDecodeSuccess(testCase.input);
          });
        }

        for (const testCase of fieldContract.rejects) {
          test(testCase.name, async () => {
            await expectDecodeFailure(testCase.input);
          });
        }
      });
    }
  });

  describe("form serialization", () => {
    for (const fieldContract of dsab007ContentsFieldContracts) {
      describe(fieldContract.key, () => {
        for (const testCase of fieldContract.serialization) {
          test(testCase.name, () => {
            const form = buildDsab007ContentsSearchForm(
              testCase.input as Dsab007ContentsSearchInputType,
            );

            for (const [key, expectedValue] of Object.entries(
              testCase.expectedEntries,
            )) {
              expect(getSerializedValue(form, key)).toBe(expectedValue);
            }
          });
        }
      });
    }
  });
});
