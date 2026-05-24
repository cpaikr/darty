import { describe, expect, test } from "bun:test";

import { ViewReportFailure } from "./contract.ts";
import { executeViewReport } from "./execute.ts";
import {
  ViewReportProviderError,
  type ViewReportProvider,
} from "./provider.ts";

describe("executeViewReport", () => {
  const unusedProvider: ViewReportProvider = {
    view: async () => {
      throw new Error("provider should not be called for invalid requests");
    },
  };

  test("adds accepted ranges to content-window validation hints", async () => {
    for (const [parameter, input, expectedHintParts] of [
      [
        "maxBytes",
        { receipt: "20260331004166", maxBytes: 999 },
        ["integer between 1,000 and 1,000,000"],
      ],
      [
        "contentStartByte",
        { receipt: "20260331004166", contentStartByte: -1 },
        ["integer greater than or equal to 0", "content.window.nextStartByte"],
      ],
      [
        "limit",
        { receipt: "20260331004166", limit: 10 },
        [
          "limit is not supported",
          "not a public input",
          "maxBytes",
          "contentStartByte",
        ],
      ],
      [
        "offset",
        { receipt: "20260331004166", offset: 0 },
        ["raw DART viewer", "documentId/sectionId", "content.window.nextStartByte"],
      ],
    ] as const) {
      try {
        await executeViewReport(input, unusedProvider);
        throw new Error("Expected view-report execution to fail.");
      } catch (error) {
        expect(error).toBeInstanceOf(ViewReportFailure);

        if (!(error instanceof ViewReportFailure)) {
          throw error;
        }

        expect(error.code).toBe("invalid_request");
        expect(error.parameter).toBe(parameter);

        for (const expectedHintPart of expectedHintParts) {
          expect(error.recoveryHint).toContain(expectedHintPart);
        }
      }
    }
  });

  test("preserves parameter context for stale returned IDs", async () => {
    const provider: ViewReportProvider = {
      view: async () => {
        throw new ViewReportProviderError({
          code: "not_found",
          message:
            "섹션 ID \"section:old\"을(를) 이 문서 목차에서 찾을 수 없습니다. same receipt/documentId로 Call view-report again하고 반환된 toc[].id를 사용하세요.",
          retryable: false,
          providerId: "test",
          parameter: "sectionId",
          sourceUrl:
            "https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260331004166",
        });
      },
    };

    try {
      await executeViewReport(
        { receipt: "20260331004166", sectionId: "section:old" },
        provider,
      );
      throw new Error("Expected view-report execution to fail.");
    } catch (error) {
      expect(error).toBeInstanceOf(ViewReportFailure);

      if (!(error instanceof ViewReportFailure)) {
        throw error;
      }

      expect(error.code).toBe("not_found");
      expect(error.parameter).toBe("sectionId");
      expect(error.retryable).toBe(false);
      expect(error.sourceUrl).toBe(
        "https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260331004166",
      );
      expect(error.message).toContain("toc[].id");
      expect(error.recoveryHint).toContain("Call view-report again");
      expect(error.recoveryHint).toContain("documents[].id/toc[].id");
    }
  });
});
