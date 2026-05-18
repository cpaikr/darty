import { describe, expect, test } from "bun:test";

import { ViewReportFailure } from "./contract.ts";
import { executeViewReport } from "./execute.ts";
import {
  ViewReportProviderError,
  type ViewReportProvider,
} from "./provider.ts";

describe("executeViewReport", () => {
  test("preserves parameter context for stale returned IDs", async () => {
    const provider: ViewReportProvider = {
      view: async () => {
        throw new ViewReportProviderError({
          code: "not_found",
          message:
            "섹션 ID \"section:old\"을(를) 이 문서 목차에서 찾을 수 없습니다. 같은 receipt/documentId로 view-report를 다시 호출하고 반환된 toc[].id를 사용하세요.",
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
    }
  });
});
