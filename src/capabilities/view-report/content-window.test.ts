import { describe, expect, test } from "bun:test";

import { windowUtf8 } from "./content-window.ts";

describe("windowUtf8", () => {
  test("returns an explicit UTF-8 byte window", () => {
    expect(windowUtf8("0123456789", 5, 5)).toEqual({
      value: "56789",
      sizeBytes: 10,
      returnedBytes: 5,
      truncated: true,
      window: {
        unit: "utf8-bytes",
        startByte: 5,
        endByte: 10,
        hasMore: false,
      },
    });
  });

  test("exposes continuation metadata when more content remains", () => {
    expect(windowUtf8("0123456789", 2, 5)).toEqual({
      value: "23456",
      sizeBytes: 10,
      returnedBytes: 5,
      truncated: true,
      window: {
        unit: "utf8-bytes",
        startByte: 2,
        endByte: 7,
        hasMore: true,
        nextStartByte: 7,
      },
    });
  });

  test("advances mid-character starts to the next UTF-8 boundary", () => {
    expect(windowUtf8("가나", 1, 3)).toEqual({
      value: "나",
      sizeBytes: 6,
      returnedBytes: 3,
      truncated: true,
      window: {
        unit: "utf8-bytes",
        startByte: 3,
        endByte: 6,
        hasMore: false,
      },
    });
  });

  test("returns an empty final window when start is beyond EOF", () => {
    expect(windowUtf8("abc", 99, 5)).toEqual({
      value: "",
      sizeBytes: 3,
      returnedBytes: 0,
      truncated: true,
      window: {
        unit: "utf8-bytes",
        startByte: 3,
        endByte: 3,
        hasMore: false,
      },
    });
  });
});
