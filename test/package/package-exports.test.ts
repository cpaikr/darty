import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { builtinModules } from "node:module";
import { basename, join } from "node:path";

const repoRoot = join(import.meta.dir, "..", "..");
const nodeRuntime = process.env.DART_NODE_RUNTIME ?? "node";

const decode = (value: Uint8Array<ArrayBufferLike>) =>
  new TextDecoder().decode(value);

const packageNameFromSpecifier = (specifier: string): string =>
  specifier.startsWith("@")
    ? specifier.split("/").slice(0, 2).join("/")
    : specifier.split("/")[0]!;

const listJavaScriptFiles = (directory: string): readonly string[] =>
  readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    const stats = statSync(path);

    if (stats.isDirectory()) {
      return [...listJavaScriptFiles(path)];
    }

    return entry.endsWith(".js") ? [path] : [];
  });

const externalImportsFromJavaScript = (source: string): readonly string[] =>
  [...source.matchAll(/(?:from\s+|import\s*\(\s*|import\s+)["']([^"']+)["']/g)]
    .map((match) => match[1])
    .filter((specifier): specifier is string => specifier !== undefined)
    .filter(
      (specifier) => !specifier.startsWith(".") && !specifier.startsWith("/"),
    );

const run = (cmd: readonly string[], cwd: string) => {
  const result = Bun.spawnSync({
    cmd: [...cmd],
    cwd,
    stdout: "pipe",
    stderr: "pipe",
    env: process.env,
  });

  if (result.exitCode !== 0) {
    throw new Error(
      `Command failed: ${cmd.join(" ")}\nstdout:\n${decode(
        result.stdout,
      )}\nstderr:\n${decode(result.stderr)}`,
    );
  }

  return result;
};

describe("packed package exports", () => {
  let workDir: string;
  let consumerDir: string;

  beforeAll(() => {
    const tempRoot = join(repoRoot, ".tmp");
    mkdirSync(tempRoot, { recursive: true });
    workDir = mkdtempSync(join(tempRoot, "package-smoke-"));
    consumerDir = join(workDir, "consumer");

    run([process.execPath, "run", "build"], repoRoot);

    const pack = run(
      ["npm", "pack", "--ignore-scripts", "--pack-destination", workDir],
      repoRoot,
    );
    const tarballName = decode(pack.stdout).trim().split("\n").at(-1);

    if (tarballName === undefined || tarballName.length === 0) {
      throw new Error("npm pack did not report a tarball name.");
    }

    const packageDir = join(consumerDir, "node_modules", "@sjunepark", "darty");
    mkdirSync(packageDir, { recursive: true });
    run(
      ["tar", "-xzf", join(workDir, basename(tarballName)), "-C", packageDir, "--strip-components=1"],
      repoRoot,
    );

    const binDir = join(consumerDir, "node_modules", ".bin");
    mkdirSync(binDir, { recursive: true });
    const binTarget = join(packageDir, "dist", "cli.js");
    chmodSync(binTarget, 0o755);
    symlinkSync(binTarget, join(binDir, "darty"));

    writeFileSync(
      join(consumerDir, "smoke.mjs"),
      `import assert from "node:assert/strict";\n` +
        `import { spawnSync } from "node:child_process";\n` +
        `import { createDartyToolset, DartyToolsetError } from "@sjunepark/darty/toolset";\n` +
        `import { createDartyPiTools } from "@sjunepark/darty/pi";\n` +
        `const toolset = createDartyToolset();\n` +
        `try {\n` +
        `  await toolset.execute("not-a-darty-operation", {});\n` +
        `  assert.fail("expected unknown operation to throw");\n` +
        `} catch (error) {\n` +
        `  assert(error instanceof DartyToolsetError);\n` +
        `}\n` +
        `const run = createDartyPiTools({ toolset, includeHelpTool: false }).find((tool) => tool.name === "darty_run_operation");\n` +
        `assert(run);\n` +
        `const result = await run.execute("call-1", { name: "not-a-darty-operation", input: {} });\n` +
        `assert.equal(result.details.error.operationName, "not-a-darty-operation");\n` +
        `const help = spawnSync("./node_modules/.bin/darty", ["--help"], { cwd: process.cwd(), encoding: "utf8" });\n` +
        `assert.equal(help.status, 0, help.stderr);\n` +
        `assert.match(help.stdout, /Usage: darty/);\n`,
    );
  }, 60_000);

  afterAll(() => {
    rmSync(workDir, { force: true, recursive: true });
  });

  test("imports shared subpaths and preserves cross-subpath error identity", () => {
    run([nodeRuntime, "smoke.mjs"], consumerDir);
  });

  test("emits shared library modules instead of independent subpath bundles", () => {
    const packageDir = join(consumerDir, "node_modules", "@sjunepark", "darty");

    expect(readFileSync(join(packageDir, "dist", "pi.js"), "utf8")).toContain(
      'from "./toolset.js"',
    );
    expect(
      readFileSync(join(packageDir, "dist", "pi-extension.js"), "utf8"),
    ).toContain('from "./pi.js"');
  });

  test("declares every unbundled runtime import as a package dependency", () => {
    const packageDir = join(consumerDir, "node_modules", "@sjunepark", "darty");
    const packageJson = JSON.parse(
      readFileSync(join(packageDir, "package.json"), "utf8"),
    ) as { readonly dependencies?: Record<string, string> };
    const dependencyNames = new Set(Object.keys(packageJson.dependencies ?? {}));
    const nodeBuiltins = new Set([
      ...builtinModules,
      ...builtinModules.map((moduleName) => `node:${moduleName}`),
    ]);

    const undeclaredImports = listJavaScriptFiles(join(packageDir, "dist"))
      .filter((path) => path !== join(packageDir, "dist", "cli.js"))
      .flatMap((path) =>
        externalImportsFromJavaScript(readFileSync(path, "utf8")).map(
          (specifier) => ({
            packageName: packageNameFromSpecifier(specifier),
            path,
            specifier,
          }),
        ),
      )
      .filter(({ packageName }) => !nodeBuiltins.has(packageName))
      .filter(({ packageName }) => !dependencyNames.has(packageName));

    expect(undeclaredImports).toEqual([]);
  });
});
