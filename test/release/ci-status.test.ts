import { afterAll, describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

type Job = {
  needs?: string | string[];
  permissions?: Record<string, string>;
  "timeout-minutes"?: number;
  steps?: { env: Record<string, string>; run: string }[];
};
const workflow = Bun.YAML.parse(readFileSync(resolve(import.meta.dir, "../../.github/workflows/ci.yml"), "utf8")) as {
  permissions: Record<string, string>;
  concurrency: Record<string, unknown>;
  jobs: Record<string, Job>;
};
const directory = mkdtempSync(join(tmpdir(), "darty-ci-status-"));
writeFileSync(join(directory, "gh"), '#!/bin/sh\nprintf "%s\\n" "$@"\nexit "${FAKE_GH_EXIT:-0}"\n', { mode: 0o755 });
afterAll(() => rmSync(directory, { recursive: true, force: true }));

function reportingStep(id: string) {
  const job = workflow.jobs[id];
  if (!job || job.steps?.length !== 1 || !job.steps[0]) throw new Error(`Missing reporting step: ${id}`);
  return job.steps[0];
}

function run(id: string, overrides: Record<string, string> = {}) {
  const result = spawnSync("bash", ["-e", "-o", "pipefail", "-c", reportingStep(id).run], {
    encoding: "utf8",
    env: {
      PATH: `${directory}:${process.env.PATH}`,
      GH_REPO: "fixture/darty", SOURCE_SHA: "a".repeat(40),
      RUN_URL: "https://github.com/fixture/darty/actions/runs/123/attempts/1",
      RUN_CANCELLED: "false", PENDING_RESULT: "success", VALIDATE_RESULT: "success", STANDALONE_RESULT: "success",
      ...overrides,
    },
  });
  if (result.error) throw result.error;
  return { status: result.status, args: result.stdout.trim().split("\n") };
}

describe("manual CI commit status", () => {
  test("isolates status-write permission and binds results to the full exact-source workflow", () => {
    expect(workflow.permissions).toEqual({ contents: "read" });
    expect(workflow.concurrency).toEqual({ group: "ci-${{ github.sha }}", "cancel-in-progress": false });
    expect(workflow.jobs.validate?.needs).toBe("status_pending");
    expect(workflow.jobs.status_complete?.needs).toEqual(["status_pending", "validate", "standalone"]);
    for (const [id, job] of Object.entries(workflow.jobs)) {
      if (id === "status_pending" || id === "status_complete") {
        expect(job.permissions).toEqual({ statuses: "write" });
        expect(job["timeout-minutes"]).toBe(5);
        const step = reportingStep(id);
        expect(step.env.SOURCE_SHA).toBe("${{ github.sha }}");
        expect(step.env.GH_TOKEN).toBe("${{ github.token }}");
        expect(step.env.RUN_URL).toContain("${{ github.run_attempt }}");
      } else {
        expect(job.permissions?.statuses).toBeUndefined();
      }
    }
    expect(reportingStep("status_complete").env).toMatchObject({
      RUN_CANCELLED: "${{ cancelled() }}",
      PENDING_RESULT: "${{ needs.status_pending.result }}",
      VALIDATE_RESULT: "${{ needs.validate.result }}",
      STANDALONE_RESULT: "${{ needs.standalone.result }}",
    });
  });

  test("posts pending before work and success only for the validated SHA", () => {
    for (const [id, state] of [["status_pending", "pending"], ["status_complete", "success"]] as const) {
      const result = run(id);
      expect(result.status).toBe(0);
      expect(result.args).toContain(`repos/fixture/darty/statuses/${"a".repeat(40)}`);
      expect(result.args).toContain("context=ci/validated-source");
      expect(result.args).toContain(`state=${state}`);
      expect(result.args).toContain("target_url=https://github.com/fixture/darty/actions/runs/123/attempts/1");
    }
  });

  test("fails closed on unsuccessful, skipped, missing, or cancelled prerequisites", () => {
    for (const key of ["PENDING_RESULT", "VALIDATE_RESULT", "STANDALONE_RESULT"]) {
      for (const state of ["failure", "cancelled", "skipped", "", "unknown"]) {
        const result = run("status_complete", { [key]: state });
        expect(result.status).toBe(1);
        expect(result.args).toContain("state=failure");
      }
    }
    const cancelled = run("status_complete", { RUN_CANCELLED: "true" });
    expect(cancelled.status).toBe(1);
    expect(cancelled.args).toContain("state=failure");
  });

  test("does not conceal GitHub reporting failures", () => {
    for (const id of ["status_pending", "status_complete"]) {
      expect(run(id, { FAKE_GH_EXIT: "42" }).status).toBe(42);
    }
  });
});
