import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const workflowDirectory = resolve(import.meta.dir, "../../.github/workflows");
const maintainerConsent = "github.event_name == 'workflow_dispatch' && github.actor == 'sjunepark' && github.triggering_actor == 'sjunepark'";

type Workflow = {
  on: Record<string, unknown>;
  jobs: Record<string, { if?: string }>;
};

describe("maintainer-controlled Actions", () => {
  test("has no automatic workflow events and no AXI watcher", () => {
    expect(existsSync(resolve(workflowDirectory, "axi-upstream.yml"))).toBe(false);
    for (const name of readdirSync(workflowDirectory)) {
      if (!/\.ya?ml$/.test(name)) continue;
      const workflow = Bun.YAML.parse(readFileSync(resolve(workflowDirectory, name), "utf8")) as Workflow;
      const events = Object.keys(workflow.on);
      expect(events.length).toBe(1);
      const event = events[0];
      if (event === undefined) throw new Error(`Missing workflow event in ${name}`);
      expect(["workflow_dispatch", "workflow_call"]).toContain(event);
      // Partial reruns do not rerun successful dependencies, so every job,
      // including reusable-workflow jobs, must independently check consent.
      for (const [id, job] of Object.entries(workflow.jobs)) {
        let condition = maintainerConsent;
        if (name === "release.yml" && id === "github_release") {
          condition += " && needs.metadata.outputs.source_tag != ''";
        }
        if (name === "standalone.yml" && id === "bundle") {
          condition += " && inputs.all_targets";
        }
        expect(job.if).toBe(condition);
      }
    }
  });
});
