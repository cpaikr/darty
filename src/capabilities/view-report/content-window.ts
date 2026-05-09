import type { ViewReportContentWindow } from "./contract/result.ts";

const textEncoder = new TextEncoder();

const utf8ByteLength = (value: string): number =>
  textEncoder.encode(value).byteLength;

export type WindowedUtf8Content = {
  readonly value: string;
  readonly sizeBytes: number;
  readonly returnedBytes: number;
  readonly truncated: boolean;
  readonly window: ViewReportContentWindow;
};

export const windowUtf8 = (
  value: string,
  startByte: number,
  maxBytes: number,
): WindowedUtf8Content => {
  const characters = Array.from(value);
  const byteLengths = characters.map(utf8ByteLength);
  const sizeBytes = byteLengths.reduce((sum, length) => sum + length, 0);

  if (startByte >= sizeBytes) {
    return {
      value: "",
      sizeBytes,
      returnedBytes: 0,
      truncated: startByte > 0 && sizeBytes > 0,
      window: {
        unit: "utf8-bytes",
        startByte: sizeBytes,
        endByte: sizeBytes,
        hasMore: false,
      },
    };
  }

  let startIndex = 0;
  let actualStartByte = 0;

  while (startIndex < characters.length && actualStartByte < startByte) {
    actualStartByte += byteLengths[startIndex] ?? 0;
    startIndex += 1;
  }

  let endIndex = startIndex;
  let endByte = actualStartByte;
  const byteLimit = actualStartByte + maxBytes;

  while (endIndex < characters.length) {
    const nextEndByte = endByte + (byteLengths[endIndex] ?? 0);

    if (nextEndByte > byteLimit) {
      break;
    }

    endByte = nextEndByte;
    endIndex += 1;
  }

  const windowValue = characters.slice(startIndex, endIndex).join("");
  const returnedBytes = endByte - actualStartByte;
  const hasMore = endByte < sizeBytes;

  return {
    value: windowValue,
    sizeBytes,
    returnedBytes,
    truncated: actualStartByte > 0 || hasMore,
    window: hasMore
      ? {
          unit: "utf8-bytes",
          startByte: actualStartByte,
          endByte,
          hasMore: true,
          nextStartByte: endByte,
        }
      : {
          unit: "utf8-bytes",
          startByte: actualStartByte,
          endByte,
          hasMore: false,
        },
  };
};
