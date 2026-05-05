import { describe, expect, test } from "bun:test";
import { Effect, Schema } from "effect";

import {
  SourceContentsReplayInput,
  type SourceContentsReplayInput as SourceContentsReplayInputType,
} from "../replay-schema.ts";
import {
  contentsReplayFieldContracts,
  contentsReplayFields,
} from "./index.ts";
import { buildContentsSearchForm } from "../build-form.ts";

const decodeInput = (input: unknown) =>
  Effect.runPromise(Schema.decodeUnknown(SourceContentsReplayInput)(input));

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

describe("dsab007 contents DART replay contract", () => {
  test("tracks the internal replay field list explicitly", () => {
    expect(contentsReplayFieldContracts.map(({ key }) => key)).toEqual(
      [...contentsReplayFields],
    );
  });

  describe("schema boundaries", () => {
    for (const fieldContract of contentsReplayFieldContracts) {
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
    for (const fieldContract of contentsReplayFieldContracts) {
      describe(fieldContract.key, () => {
        for (const testCase of fieldContract.serialization) {
          test(testCase.name, () => {
            const form = buildContentsSearchForm(
              testCase.input as SourceContentsReplayInputType,
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
