import { expect, test } from "bun:test";
import { modelToolView, toWorkflowToolMessageContent, type ToolExecution } from "./tool-trace.ts";
const execution = (result: unknown): ToolExecution => ({ toolName: "run_darty_cli", input: {}, display: "test", stdout: JSON.stringify(result), stderr: "", exitCode: 0 });
test("bounded body view preserves JSON, locators, windows, warnings and help", () => {
  const raw = execution({ result: { content: { scope: "section", section: { id: "section:4", title: "Title" },
    body: "x".repeat(1300) + "LATE EVIDENCE" + "y".repeat(20_000), window: { startByte: 50, endByte: 30000, nextStartByte: 30000 } } }, references: { viewerUrl: "source" }, warnings: ["windowed"], help: ["continue"] });
  const view = modelToolView(raw);
  const envelope = JSON.parse(view.stdout);
  expect(envelope.result.content.body).toHaveLength(12_000);
  expect(envelope.result.content.body).toContain("LATE EVIDENCE");
  expect(envelope.result.content.section.id).toBe("section:4");
  expect(envelope.result.content.window.nextStartByte).toBe(30000);
  expect(envelope.references.viewerUrl).toBe("source");
  expect(envelope.help).toEqual(["continue"]);
  expect(view.limitations).toHaveLength(1);
  expect(JSON.parse(toWorkflowToolMessageContent(raw)).stdout).toBe(view.stdout);
  expect(JSON.parse(raw.stdout).result.content.body.length).toBeGreaterThan(12_000);
});
test("oversized non-body evidence is explicitly unavailable", () => {
  const view = modelToolView(execution({ result: { metadata: "x".repeat(70_000) } }));
  expect(JSON.parse(view.stdout).evidenceUnavailable).toBe(true);
  expect(view.limitations.join(" ")).toContain("evidence unavailable");
});

test("astral boundary preserves whole characters and exact continuation bytes", () => {
  const raw = execution({ result: { content: { body: "한".repeat(11_999) + "😀", window: { startByte: 50 } } } });
  const body = JSON.parse(modelToolView(raw).stdout).result.content;
  expect(body.body).toHaveLength(11_999);
  expect(body.body.endsWith("한")).toBe(true);
  expect(body.modelView.nextStartByte).toBe(50 + 11_999 * 3);
});
test("non-JSON help and failed diagnostics pass through unchanged", () => {
  for (const stdout of ["Usage: darty --help", "Source temporarily unavailable"]) {
    const raw = { ...execution({}), stdout };
    expect(modelToolView(raw)).toEqual({ stdout, limitations: [] });
  }
});
