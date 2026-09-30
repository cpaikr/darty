import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const workflowDirectory = resolve(import.meta.dir, "../../.github/workflows");
const dispatchConsent = "github.event_name == 'workflow_dispatch' && github.actor == 'sjunepark' && github.triggering_actor == 'sjunepark'";
// CI and the reusable workflows it calls also run for same-repository pull
// requests the maintainer authored; everyone else's pull requests skip.
const maintainerConsent = "github.actor == 'sjunepark' && github.triggering_actor == 'sjunepark' && (github.event_name == 'workflow_dispatch' || (github.event_name == 'pull_request' && github.event.pull_request.user.login == 'sjunepark' && github.event.pull_request.head.repo.full_name == github.repository))";
const allowedEvents: Record<string, string[]> = {
  "ci.yml": ["workflow_dispatch", "pull_request"],
  "release.yml": ["workflow_dispatch"],
  "standalone.yml": ["workflow_call"],
  "validate.yml": ["workflow_call"],
};

type Workflow = {
  on: Record<string, unknown>;
  jobs: Record<string, { if?: string }>;
};

describe("maintainer-controlled Actions", () => {
  test("runs automatically only for maintainer pull requests and has no AXI watcher", () => {
    expect(existsSync(resolve(workflowDirectory, "axi-upstream.yml"))).toBe(false);
    for (const name of readdirSync(workflowDirectory)) {
      if (!/\.ya?ml$/.test(name)) continue;
      const workflow = Bun.YAML.parse(readFileSync(resolve(workflowDirectory, name), "utf8")) as Workflow;
      const expectedEvents = allowedEvents[name];
      if (expectedEvents === undefined) throw new Error(`Unreviewed workflow ${name}`);
      expect(Object.keys(workflow.on).sort()).toEqual([...expectedEvents].sort());
      // Filters on pull_request would silently narrow validation.
      if (name === "ci.yml") expect(workflow.on.pull_request).toBeNull();
      // Partial reruns do not rerun successful dependencies, so every job,
      // including reusable-workflow jobs, must independently check consent.
      for (const [id, job] of Object.entries(workflow.jobs)) {
        let condition = name === "release.yml" ? dispatchConsent : maintainerConsent;
        if (name === "ci.yml" && id === "status_complete") {
          condition = "always() && " + condition;
        }
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
