import { describe, expect, test } from "bun:test";

import { collectReturnedDartEvidenceReferences } from "./assertions.ts";
import type { PiToolExecution } from "./pi-single-tool.ts";

const piExecution = (details: unknown, exitCode = 0): PiToolExecution => ({
  toolName: "darty",
  input: { action: "run", command: "view-report", inputJson: {} },
  display: "darty",
  exitCode,
  stdout: JSON.stringify(details),
  stderr: "",
});

describe("collectReturnedDartEvidenceReferences", () => {
  test("extracts concrete DART references from successful Pi run details", () => {
    const references = collectReturnedDartEvidenceReferences([
      piExecution({
        ok: true,
        action: "run",
        command: "view-report",
        result: {
          result: {
            receipt: { receiptNumber: "20260331000001" },
            document: { id: "document:body:1" },
            content: { section: { id: "section:3.5", title: "배당" } },
          },
          references: {
            viewerUrl:
              "https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260331000001",
          },
        },
      }),
    ]);

    expect(references).toContain("20260331000001");
    expect(references).toContain(
      "https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260331000001",
    );
    expect(references).toContain("document:body:1");
    expect(references).toContain("section:3.5");
  });

  test("ignores failed Pi calls and generic prose-only results", () => {
    const references = collectReturnedDartEvidenceReferences([
      piExecution({ ok: false, action: "run", error: { message: "failed" } }, 1),
      piExecution({ ok: true, action: "run", result: { result: { summary: "보고서 출처" } } }),
    ]);

    expect(references).toEqual([]);
  });
});
