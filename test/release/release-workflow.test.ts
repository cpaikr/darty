import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { targets } from "../../scripts/standalone.mjs";

const repositoryRoot = resolve(import.meta.dir, "../..");
const read = (path: string) => readFileSync(resolve(repositoryRoot, path), "utf8");
const workflow = read(".github/workflows/release.yml");

describe("standalone release authority", () => {
  test("retires npm publication and the former package consumer", () => {
    for (const path of [
      ".github/workflows/release-please.yml", ".release-please-manifest.json",
      "release-please-config.json", ".github/workflows/package-consumer.yml",
      "scripts/publish-npm-package.mjs", "scripts/release-artifact.mjs",
    ]) expect(existsSync(resolve(repositoryRoot, path))).toBe(false);
    const metadata = JSON.parse(read("package.json"));
    expect(metadata.private).toBe(true);
    expect(metadata.publishConfig).toBeUndefined();
    expect(workflow).not.toMatch(/npm publish|id-token: write|publish-npm|setup-node.*registry/);
  });
  test("publishes the complete certified bundle only for a real source tag", () => {
    const finalJob = workflow.slice(workflow.indexOf("  github_release:"));
    expect(finalJob).toContain("&& needs.metadata.outputs.source_tag != ''");
    expect(finalJob).toContain("      - standalone");
    expect(finalJob).toContain("      contents: write");
    expect(finalJob).toContain("name: darty-release");
    expect(finalJob).toContain("--directory release-artifact/bundle");
    expect(finalJob).toContain("Recheck source tag immediately before release completion");
    expect(workflow).toContain("all_targets: true");
  });
  test("keeps stable tags and exact main CI authority", () => {
    expect(workflow).toContain('if [[ ! "$SOURCE_TAG" =~ ^v(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)$ ]]');
    expect(workflow).toContain("Require successful CI for exact source commit");
    expect(workflow).toContain("event=workflow_dispatch");
    expect(workflow).toContain('.actor.login == \\"sjunepark\\"');
    expect(workflow).toContain('.triggering_actor.login == \\"sjunepark\\"');
  });
  test("cross-builds from the target authority and certifies exact installed archives", () => {
    const standalone = read(".github/workflows/standalone.yml");
    expect(standalone).toContain('node scripts/standalone.mjs matrix "$TARGET_SCOPE"');
    expect(standalone).toContain("needs: [build, consume, sdk]");
    expect(standalone).toContain("node scripts/standalone.mjs certify");
    expect(standalone).toContain("node scripts/standalone.mjs assemble");
    expect(standalone).not.toMatch(/npm install|bun run build/);
    expect(targets.filter((target) => target.runner).every((target) => target.os === "linux")).toBe(true);
  });
  test("runs every job, including cross-builds, on Linux", () => {
    const inspect = (value: unknown): void => {
      if (!value || typeof value !== "object") return;
      for (const [key, child] of Object.entries(value)) {
        if (key === "runs-on" || key === "runner") expect(JSON.stringify(child)).not.toMatch(/macos|windows/i);
        inspect(child);
      }
    };
    for (const name of readdirSync(resolve(repositoryRoot, ".github/workflows"))) {
      if (/\.ya?ml$/.test(name)) inspect(Bun.YAML.parse(read(`.github/workflows/${name}`)));
    }
    inspect(targets);
  });
});
