import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync, readdirSync } from "node:fs";
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

describe("certified archive delivery", () => {
  test("publishes the downloaded archive only after consumer certification", () => {
    const publish = workflow.slice(workflow.indexOf("  publish:"), workflow.indexOf("  github_release:"));
    expect(publish).toContain("      - consume");
    expect(publish).toContain("name: darty-package");
    expect(publish).toContain("--artifact release-artifact");
    expect(publish).not.toMatch(/bun run build|bun install|setup-bun/);
    expect(workflow).toContain("linux_arm64: true");
  });

  test("uses the shared consumer matrix for main PRs and releases", () => {
    const ci = read(".github/workflows/ci.yml");
    const consumer = read(".github/workflows/package-consumer.yml");
    expect(ci).toContain("github.event_name == 'pull_request' && github.base_ref == 'main'");
    for (const runner of ["blacksmith-2vcpu-ubuntu-2404", "blacksmith-2vcpu-ubuntu-2404-arm"]) expect(consumer).toContain(runner);
    expect(consumer).toContain("['22.12.0', '24']");
    expect(consumer).toContain("node scripts/release-artifact.mjs consume release-artifact");
  });

  test("keeps every workflow free of macOS and Windows runners", () => {
    for (const name of readdirSync(resolve(repositoryRoot, ".github/workflows"))) {
      if (!/\.ya?ml$/.test(name)) continue;
      const inspect = (value: unknown): void => {
        if (!value || typeof value !== "object") return;
        for (const [key, child] of Object.entries(value)) {
          // Platform asset names are allowed; execution runners must stay Linux.
          if (key === "runs-on" || key === "runner") {
            expect(JSON.stringify(child)).not.toMatch(/macos|windows/i);
          }
          inspect(child);
        }
      };
      inspect(Bun.YAML.parse(read(`.github/workflows/${name}`)));
    }
  });
});
