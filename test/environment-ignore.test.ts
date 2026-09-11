import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const repositoryRoot = resolve(import.meta.dir, "..");

test.each([
  [".env", true],
  [".env.local", true],
  [".env.production", true],
  [".env.production.local", true],
  ["packages/node/.env.test", true],
  [".env.schema", false],
] as const)("Git ignores %s: %s", (path, ignored) => {
  const result = spawnSync("git", [
    "-c", "core.excludesFile=/dev/null", "check-ignore", "--no-index", "--quiet", "--", path,
  ], { cwd: repositoryRoot, encoding: "utf8" });
  expect(result.error).toBeUndefined();
  expect(result.status).toBe(ignored ? 0 : 1);
});
