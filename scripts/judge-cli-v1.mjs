#!/usr/bin/env node

import { isDeepStrictEqual } from "node:util";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..");
const manifestPath = join(repoRoot, "test/compat/cli-v1/scenarios.json");

const fail = (message) => {
  console.error(message);
  process.exitCode = 1;
};

const parseArguments = (argv) => {
  let profile = "full";
  const separator = argv.indexOf("--");
  const options = separator === -1 ? argv : argv.slice(0, separator);
  const command = separator === -1 ? [] : argv.slice(separator + 1);

  for (let index = 0; index < options.length; index += 1) {
    if (options[index] !== "--profile") {
      throw new Error(`Unknown judge option: ${options[index]}`);
    }

    profile = options[index + 1];
    index += 1;
  }

  if (profile !== "vertical" && profile !== "candidate" && profile !== "full") {
    throw new Error(`Unknown profile: ${profile}`);
  }
  if (command.length === 0) {
    throw new Error(
      "Expected a subject command after --, for example: -- node dist/cli.js",
    );
  }

  return { profile, command };
};

const resolveCommandPaths = (command) =>
  command.map((part) => {
    if (isAbsolute(part)) {
      return part;
    }

    const candidate = resolve(repoRoot, part);
    return existsSync(candidate) ? candidate : part;
  });

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));

const validateManifest = (manifest) => {
  if (manifest.schemaVersion !== 1 || !Array.isArray(manifest.scenarios)) {
    throw new Error("Unsupported or malformed CLI parity manifest.");
  }

  const ids = new Set();
  for (const scenario of manifest.scenarios) {
    if (
      typeof scenario.id !== "string" ||
      ids.has(scenario.id) ||
      !Array.isArray(scenario.profiles) ||
      !scenario.profiles.every(
        (profile) => profile === "vertical" || profile === "candidate" || profile === "full",
      ) ||
      !Array.isArray(scenario.argv) ||
      !scenario.argv.every((argument) => typeof argument === "string") ||
      typeof scenario.golden !== "string"
    ) {
      throw new Error(`Malformed or duplicate scenario: ${JSON.stringify(scenario)}`);
    }

    ids.add(scenario.id);
  }
};

const validateGolden = (golden, path) => {
  if (
    (golden.kind !== "json" && golden.kind !== "text") ||
    !Number.isInteger(golden.exitCode)
  ) {
    throw new Error(`Malformed golden: ${path}`);
  }
  if (
    golden.kind === "json" &&
    (golden.value === undefined ||
      (golden.jsonFormat !== "compact" && golden.jsonFormat !== "pretty"))
  ) {
    throw new Error(`Malformed JSON golden: ${path}`);
  }
  if (
    golden.kind === "text" &&
    golden.requiredNormalizedFragments !== undefined &&
    (!Array.isArray(golden.requiredNormalizedFragments) ||
      !golden.requiredNormalizedFragments.every(
        (fragment) => typeof fragment === "string",
      ))
  ) {
    throw new Error(`Malformed normalized text golden: ${path}`);
  }
  if (
    golden.kind === "text" &&
    golden.longOptions !== undefined &&
    (!Array.isArray(golden.longOptions) ||
      !golden.longOptions.every((option) => /^--[a-z][a-z0-9-]*$/.test(option)))
  ) {
    throw new Error(`Malformed help-option golden: ${path}`);
  }
};

const firstDifference = (actual, expected, path = "") => {
  if (isDeepStrictEqual(actual, expected)) {
    return undefined;
  }

  if (
    actual === null ||
    expected === null ||
    typeof actual !== "object" ||
    typeof expected !== "object"
  ) {
    return path || "/";
  }

  const actualKeys = Object.keys(actual);
  const expectedKeys = Object.keys(expected);
  const keys = new Set([...actualKeys, ...expectedKeys]);

  for (const key of keys) {
    const childPath = `${path}/${key}`;
    if (!(key in actual) || !(key in expected)) {
      return childPath;
    }

    const difference = firstDifference(actual[key], expected[key], childPath);
    if (difference !== undefined) {
      return difference;
    }
  }

  return path || "/";
};

const checkJsonGolden = (stdout, golden) => {
  const failures = [];

  if (!stdout.endsWith("\n") || stdout.endsWith("\n\n")) {
    failures.push("stdout must end with exactly one LF");
    return failures;
  }

  let parsed;
  try {
    parsed = JSON.parse(stdout.slice(0, -1));
  } catch (error) {
    failures.push(`stdout is not exactly one JSON value: ${error.message}`);
    return failures;
  }

  const difference = firstDifference(parsed, golden.value);
  if (difference !== undefined) {
    failures.push(`JSON differs at ${difference}`);
  }

  const expectedFormatting =
    golden.jsonFormat === "pretty"
      ? `${JSON.stringify(parsed, null, 2)}\n`
      : `${JSON.stringify(parsed)}\n`;
  if (stdout !== expectedFormatting) {
    failures.push(`stdout is not ${golden.jsonFormat} JSON followed by one LF`);
  }

  return failures;
};

const checkTextGolden = (stdout, golden) => {
  const failures = [];
  const normalizedStdout = stdout.replace(/\s+/g, " ").trim();

  for (const fragment of golden.requiredFragments ?? []) {
    if (!stdout.includes(fragment)) {
      failures.push(`stdout is missing required fragment ${JSON.stringify(fragment)}`);
    }
  }

  for (const fragment of golden.forbiddenFragments ?? []) {
    if (stdout.includes(fragment)) {
      failures.push(`stdout contains forbidden fragment ${JSON.stringify(fragment)}`);
    }
  }

  for (const fragment of golden.requiredNormalizedFragments ?? []) {
    const normalizedFragment = fragment.replace(/\s+/g, " ").trim();
    if (!normalizedStdout.includes(normalizedFragment)) {
      failures.push(
        `stdout is missing normalized semantic fragment ${JSON.stringify(fragment)}`,
      );
    }
  }

  if (golden.longOptions !== undefined) {
    const optionsSection = stdout.match(
      /(?:^|\n)Options:\n([\s\S]*?)(?:\n\n|$)/,
    )?.[1];
    const actualOptions = [
      ...new Set(optionsSection?.match(/--[a-z][a-z0-9-]*/g) ?? []),
    ].sort();
    const expectedOptions = [...golden.longOptions].sort();

    if (!isDeepStrictEqual(actualOptions, expectedOptions)) {
      failures.push(
        `help long options differ: expected ${JSON.stringify(expectedOptions)}, got ${JSON.stringify(actualOptions)}`,
      );
    }
  }

  if (golden.sha256 !== undefined) {
    const actual = createHash("sha256").update(stdout).digest("hex");
    if (actual !== golden.sha256) {
      failures.push(`stdout SHA-256 differs: expected ${golden.sha256}, got ${actual}`);
    }
  }

  return failures;
};

const runScenario = ({ command, scenario, golden, cwd, fixtureOrigin }) => {
  const result = spawnSync(command[0], [...command.slice(1), ...scenario.argv], {
    cwd,
    encoding: "utf8",
    timeout: 10_000,
    shell: false,
    env: {
      PATH: process.env.PATH,
      HOME: cwd,
      LANG: "C.UTF-8",
      LC_ALL: "C.UTF-8",
      NO_COLOR: "1",
      ...(fixtureOrigin === undefined
        ? {}
        : {
            DARTY_FIXTURE_ORIGIN: fixtureOrigin,
            DARTY_FIXTURE_FETCHED_AT: "2026-08-22T00:00:00.000Z",
          }),
    },
  });
  const failures = [];

  if (result.error !== undefined) {
    failures.push(`spawn failed: ${result.error.message}`);
  }
  if (result.signal !== null) {
    failures.push(`terminated by signal ${result.signal}`);
  }
  if (result.status !== golden.exitCode) {
    failures.push(`exit code differs: expected ${golden.exitCode}, got ${result.status}`);
  }

  const stderr = result.stderr ?? "";
  const expectedStderr = golden.stderr ?? "";
  if (stderr !== expectedStderr) {
    failures.push(
      `stderr differs: expected ${JSON.stringify(expectedStderr)}, got ${JSON.stringify(stderr)}`,
    );
  }

  const stdout = result.stdout ?? "";
  failures.push(
    ...(golden.kind === "json"
      ? checkJsonGolden(stdout, golden)
      : checkTextGolden(stdout, golden)),
  );

  return failures;
};

let parsed;
try {
  parsed = parseArguments(process.argv.slice(2));
} catch (error) {
  fail(error.message);
}

if (parsed !== undefined) {
  const manifest = readJson(manifestPath);
  validateManifest(manifest);
  const command = resolveCommandPaths(parsed.command);
  const isolatedCwd = mkdtempSync(join(tmpdir(), "darty-cli-v1-"));
  const readyPath = join(isolatedCwd, "fixture-origin");
  const fixtureServer =
    parsed.profile === "candidate"
      ? spawn(process.execPath, [join(scriptDir, "serve-dart-fixture.mjs"), readyPath], {
          cwd: repoRoot,
          stdio: "ignore",
        })
      : undefined;
  let fixtureOrigin;
  let checked = 0;

  try {
    if (fixtureServer !== undefined) {
      const deadline = Date.now() + 5_000;
      while (!existsSync(readyPath) && Date.now() < deadline) {
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10);
      }
      if (!existsSync(readyPath)) throw new Error("Fixture server did not become ready.");
      fixtureOrigin = readFileSync(readyPath, "utf8");
    }
    for (const scenario of manifest.scenarios) {
      const selected =
        (parsed.profile === "full" &&
          scenario.profiles.some((profile) => profile === "full" || profile === "vertical")) ||
        (parsed.profile === "candidate" &&
          scenario.profiles.some(
            (profile) => profile === "candidate" || profile === "vertical",
          )) ||
        scenario.profiles.includes(parsed.profile);
      if (!selected) {
        continue;
      }

      checked += 1;
      const goldenPath = join(dirname(manifestPath), scenario.golden);
      const golden = readJson(goldenPath);
      validateGolden(golden, goldenPath);
      const failures = runScenario({
        command,
        scenario,
        golden,
        cwd: isolatedCwd,
        fixtureOrigin,
      });

      if (failures.length === 0) {
        console.log(`PASS ${scenario.id}`);
      } else {
        for (const failure of failures) {
          fail(`FAIL ${scenario.id}: ${failure}`);
        }
      }
    }
  } finally {
    fixtureServer?.kill("SIGTERM");
    rmSync(isolatedCwd, { force: true, recursive: true });
  }

  if (checked === 0) {
    fail(`No scenarios selected for profile ${parsed.profile}`);
  } else if (process.exitCode !== 1) {
    console.log(`CLI v1 ${parsed.profile} parity passed (${checked} scenarios).`);
  }
}
