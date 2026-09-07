import { describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { completeGitHubRelease, type GhResult } from "../../scripts/complete-github-release.mjs";
import { version } from "../../scripts/standalone.mjs";
import { createBundle, sourceSha } from "./bundle-fixture.ts";

const success = (stdout = ""): GhResult => ({ status: 0, stdout, stderr: "" });
const failure = (stderr: string): GhResult => ({ status: 1, stdout: "", stderr });

type Mode = "absent" | "partial" | "published";
function fixture(mode: Mode, check: (context: {
  run: () => ReturnType<typeof completeGitHubRelease>;
  calls: string[][];
  assets: Map<string, Buffer>;
  local: Map<string, Buffer>;
  state: { exists: boolean; draft: boolean; failUpload: boolean; corruptDownload: boolean; uncertain: boolean; movedTag: boolean };
}) => void) {
  const directory = mkdtempSync(join(tmpdir(), "darty-publish-test-"));
  try {
    const local = createBundle(directory);
    const assets = mode === "published" ? new Map(local) : new Map<string, Buffer>();
    if (mode === "partial") {
      const first = [...local][0]!;
      assets.set(first[0], first[1]);
    }
    const state = { exists: mode !== "absent", draft: mode !== "published", failUpload: false, corruptDownload: false, uncertain: false, movedTag: false };
    const calls: string[][] = [];
    const runGh = (args: string[]): GhResult => {
      calls.push(args);
      if (args[0] === "api") return success(state.movedTag ? "b".repeat(40) : sourceSha);
      if (args[1] === "view") {
        if (state.uncertain) return failure("HTTP 401: authentication failed");
        if (!state.exists) return failure("release not found");
        return success(JSON.stringify({
          tagName: `v${version}`, isDraft: state.draft, isPrerelease: false,
          name: `v${version}`, body: "Release notes", url: `https://github.com/cpaikr/darty/releases/tag/v${version}`,
          assets: [...assets.keys()].map((name) => ({ name })),
        }));
      }
      if (args[1] === "create") { state.exists = true; state.draft = true; return success(); }
      if (args[1] === "upload") {
        for (const path of args.slice(5)) {
          if (assets.has(basename(path))) throw new Error("Attempted asset overwrite");
          assets.set(basename(path), readFileSync(path));
          if (state.failUpload) return failure("upload interrupted");
        }
        return success();
      }
      if (args[1] === "download") {
        const destination = args[args.indexOf("--dir") + 1]!;
        for (const [name, bytes] of assets) writeFileSync(join(destination, name), state.corruptDownload ? Buffer.from("corrupt") : bytes);
        return success();
      }
      if (args[1] === "edit") { state.draft = false; return success(); }
      throw new Error(`Unexpected gh call ${args.join(" ")}`);
    };
    check({ run: () => completeGitHubRelease({ repository: "cpaikr/darty", sourceTag: `v${version}`, sourceSha, directory }, runGh), calls, assets, local, state });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

describe("standalone GitHub release publication", () => {
  test("uploads and downloads every asset before publishing the draft", () => {
    fixture("absent", ({ run, calls, assets, local, state }) => {
      expect(run().disposition).toBe("published");
      expect(state.draft).toBe(false);
      expect([...assets.keys()]).toEqual([...local.keys()]);
      expect(calls.find((args) => args[1] === "create")).toContain("--draft");
      expect(calls.findIndex((args) => args[1] === "download")).toBeLessThan(calls.findIndex((args) => args[1] === "edit"));
      expect(calls.flat()).not.toContain("--clobber");
    });
  });
  test("resumes an interrupted upload without replacing existing assets", () => {
    fixture("partial", ({ run, calls, state, assets, local }) => {
      state.failUpload = true;
      expect(run).toThrow("upload interrupted");
      expect(state.draft).toBe(true);
      const existing = [...assets.keys()];
      state.failUpload = false;
      calls.length = 0;
      run();
      expect(state.draft).toBe(false);
      expect(assets.size).toBe(local.size);
      const uploaded = calls.find((args) => args[1] === "upload")!.slice(5).map((path) => basename(path));
      for (const name of existing) expect(uploaded).not.toContain(name);
    });
  });
  test("verifies a published release without any mutation", () => {
    fixture("published", ({ run, calls }) => {
      expect(run().disposition).toBe("verified-or-resumed");
      expect(calls.some((args) => ["create", "edit", "upload"].includes(args[1]!))).toBe(false);
    });
  });
  test("rejects differing remote bytes and preserves the draft", () => {
    fixture("partial", ({ run, state, calls }) => {
      state.corruptDownload = true;
      expect(run).toThrow("differs from the certified bundle");
      expect(state.draft).toBe(true);
      expect(calls.some((args) => ["edit", "upload"].includes(args[1]!))).toBe(false);
    });
  });
  test("does not repair an incomplete published release", () => {
    fixture("partial", ({ run, state, calls }) => {
      state.draft = false;
      expect(run).toThrow("missing required assets");
      expect(calls.some((args) => ["edit", "upload"].includes(args[1]!))).toBe(false);
    });
  });
  test("rejects unexpected assets without changing them", () => {
    fixture("partial", ({ run, assets }) => {
      assets.set("unexpected.txt", Buffer.from("keep"));
      expect(run).toThrow("Unexpected release assets");
      expect(assets.get("unexpected.txt")?.toString()).toBe("keep");
    });
  });
  test("fails closed on an uncertain lookup", () => {
    fixture("absent", ({ run, state, calls }) => {
      state.uncertain = true;
      expect(run).toThrow("Could not inspect");
      expect(calls.some((args) => args[1] === "create")).toBe(false);
    });
  });
  test("rejects a moved tag before release creation", () => {
    fixture("absent", ({ run, state, calls }) => {
      state.movedTag = true;
      expect(run).toThrow("no longer identifies");
      expect(calls).toHaveLength(1);
    });
  });
});
