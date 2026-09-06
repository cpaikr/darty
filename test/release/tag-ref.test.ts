import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const workflow = Bun.YAML.parse(
  readFileSync(resolve(import.meta.dir, "../../.github/workflows/release.yml"), "utf8"),
) as { jobs: { github_release: { steps: { name: string; run?: string }[] } } };
const steps = workflow.jobs.github_release.steps;
const gateIndex = steps.findIndex((step) =>
  step.name === "Recheck source tag immediately before release completion",
);
const completionIndex = steps.findIndex((step) =>
  step.name === "Create or verify GitHub Release",
);

describe("release completion tag-ref gate", () => {
  test.each(["lightweight", "annotated", "moved", "missing"] as const)(
    "%s tag is checked against the validated source with real Git",
    (kind) => {
      expect(gateIndex).toBeGreaterThanOrEqual(0);
      expect(completionIndex).toBeGreaterThan(gateIndex);
      const gate = steps[gateIndex]?.run;
      if (!gate) throw new Error("Missing release completion tag-ref gate");

      const root = mkdtempSync(join(tmpdir(), "darty-release-tag-"));
      const source = join(root, "source");
      const remote = join(root, "remote.git");
      const git = (...args: string[]) => {
        const result = spawnSync("git", args, { cwd: root, encoding: "utf8" });
        if (result.status !== 0) {
          throw new Error(`git ${args.join(" ")} failed: ${result.stderr}`);
        }
        return result.stdout.trim();
      };

      try {
        git("init", "--bare", remote);
        git("init", source);
        git("-C", source, "config", "user.name", "Darty Test");
        git("-C", source, "config", "user.email", "darty@example.invalid");
        git("-C", source, "config", "commit.gpgsign", "false");
        git("-C", source, "config", "tag.gpgsign", "false");
        git("-C", source, "remote", "add", "origin", remote);
        git("-C", source, "commit", "--allow-empty", "-m", "Validated source");
        const sourceSha = git("-C", source, "rev-parse", "HEAD");
        const sourceTag = "v0.6.0";
        if (kind === "moved") {
          git("-C", source, "commit", "--allow-empty", "-m", "Unvalidated source");
        }
        if (kind === "annotated") {
          git("-C", source, "tag", "-a", sourceTag, "-m", "Source tag");
        } else if (kind !== "missing") {
          git("-C", source, "tag", sourceTag);
        }
        git("-C", source, "push", "origin", "HEAD:refs/heads/main", "--tags");

        const result = spawnSync("bash", ["-e", "-c", gate], {
          cwd: source,
          encoding: "utf8",
          env: { ...process.env, SOURCE_SHA: sourceSha, SOURCE_TAG: sourceTag },
        });
        expect(result.status).toBe(kind === "moved" || kind === "missing" ? 1 : 0);
        if (kind === "moved") expect(result.stderr).toContain(`expected ${sourceSha}`);
        if (kind === "missing") expect(result.stderr).toContain("no longer exists");
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    },
  );
});
