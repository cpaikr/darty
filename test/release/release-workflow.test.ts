import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repositoryRoot = resolve(import.meta.dir, "../..");
const read = (path: string) => readFileSync(resolve(repositoryRoot, path), "utf8");
const workflow = read(".github/workflows/release.yml");

describe("release authority", () => {
  test("has no active Release Please configuration", () => {
    for (const path of [
      ".github/workflows/release-please.yml",
      ".release-please-manifest.json",
      "release-please-config.json",
      "tasks/repair-release-please-token.md",
    ]) {
      expect(existsSync(resolve(repositoryRoot, path))).toBeFalse();
    }

    for (const path of ["AGENTS.md", "docs/release.md"]) {
      expect(read(path)).not.toMatch(/Release Please|RELEASE_PLEASE_TOKEN/);
    }
    expect(read("ROADMAP.md")).not.toMatch(/RELEASE_PLEASE_TOKEN|repair-release-please-token/);
  });

  test("completes the GitHub Release only after npm publication", () => {
    const finalJob = workflow.slice(workflow.indexOf("  github_release:"));

    expect(finalJob).toContain("      - publish");
    expect(finalJob).toContain("      contents: write");
    expect(finalJob).toContain("Recheck source tag immediately before release completion");
    expect(finalJob).toContain("node scripts/complete-github-release.mjs");
    expect(finalJob).not.toMatch(/npm publish|id-token: write/);
  });

  test("keeps OIDC publication separate and limited to the shipped npm package", () => {
    const publishJob = workflow.slice(
      workflow.indexOf("  publish:"),
      workflow.indexOf("  github_release:"),
    );

    expect(publishJob).toContain("id-token: write");
    expect(publishJob).toContain("node scripts/publish-npm-package.mjs");
    expect(publishJob).not.toMatch(/candidate\/|cargo publish|gh release/);
  });

  test("rejects prerelease-shaped tags before publication", () => {
    const metadataJob = workflow.slice(
      workflow.indexOf("  metadata:"),
      workflow.indexOf("  npm_validation:"),
    );

    expect(metadataJob).toContain(
      'if [[ ! "$SOURCE_TAG" =~ ^v(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)$ ]]',
    );
  });
});
