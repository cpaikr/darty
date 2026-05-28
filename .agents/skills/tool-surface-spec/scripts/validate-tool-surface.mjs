#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve, join } from "node:path";

const parseJsonArrayOption = (value, flag) => {
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed) && parsed.every((item) => typeof item === "string")) {
      return parsed;
    }
  } catch {
    // handled below
  }

  throw new Error(`${flag} must be a JSON array of strings, for example '["--version"]'`);
};

const parseArgs = (argv) => {
  const result = { _: [] };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--help" || arg === "-h") {
      result.help = true;
      continue;
    }

    if (arg === "--run-cli") {
      result.runCli = true;
      continue;
    }

    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const value = argv[index + 1];

      if (value === undefined || value.startsWith("--")) {
        throw new Error(`Missing value for ${arg}`);
      }

      if (
        key === "command-args" ||
        key === "success-args" ||
        key === "invalid-args"
      ) {
        result[key] = parseJsonArrayOption(value, arg);
      } else {
        result[key] = value;
      }

      index += 1;
      continue;
    }

    result._.push(arg);
  }

  return result;
};

const usage = () => `Usage:
  node validate-tool-surface.mjs [package-dir] [options]

Options:
  --id <id>                    Expected package name or first CLI bin name.
  --command <command-or-path>   CLI command/path to run for smoke checks.
  --command-args <json-array>   Args inserted after --command before smoke-test args.
  --run-cli                    Run CLI --help and invalid-command smoke checks.
  --success-args <json-array>   Safe success invocation args to verify JSON stdout.
  --invalid-args <json-array>   Invalid invocation args. Default: ["__validate_tool_surface_unknown__"].
  -h, --help                   Show this help.
`;

const isRecord = (value) =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const hasString = (value, key) =>
  isRecord(value) && typeof value[key] === "string";

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));

const createReporter = () => {
  const passes = [];
  const warnings = [];
  const failures = [];

  return {
    pass(message) {
      passes.push(message);
    },
    warn(message) {
      warnings.push(message);
    },
    fail(message) {
      failures.push(message);
    },
    check(condition, message) {
      if (condition) {
        passes.push(message);
      } else {
        failures.push(message);
      }
    },
    print() {
      console.log("# CLI tool surface validation\n");

      if (passes.length > 0) {
        console.log("## Passes");
        for (const message of passes) console.log(`- ${message}`);
        console.log();
      }

      if (warnings.length > 0) {
        console.log("## Warnings");
        for (const message of warnings) console.log(`- ${message}`);
        console.log();
      }

      if (failures.length > 0) {
        console.log("## Failures");
        for (const message of failures) console.log(`- ${message}`);
        console.log();
      }

      console.log(
        failures.length === 0
          ? "Result: PASS"
          : `Result: FAIL (${failures.length} failure${failures.length === 1 ? "" : "s"})`,
      );
    },
    get failed() {
      return failures.length > 0;
    },
  };
};

const getBinEntries = (pkg) => {
  if (typeof pkg.bin === "string") {
    return [[pkg.name ?? "cli", pkg.bin]];
  }

  if (isRecord(pkg.bin)) {
    return Object.entries(pkg.bin).filter(([, value]) => typeof value === "string");
  }

  return [];
};

const isLikelyPath = (command) =>
  command.startsWith(".") || command.startsWith("/") || command.includes("/");

const resolveCommand = (root, pkg, args) => {
  const explicitCommand = args.command;

  if (typeof explicitCommand === "string") {
    return {
      label: [explicitCommand, ...(args["command-args"] ?? [])].join(" "),
      command: isLikelyPath(explicitCommand) ? resolve(root, explicitCommand) : explicitCommand,
      argsPrefix: Array.isArray(args["command-args"]) ? args["command-args"] : [],
    };
  }

  const [firstBin] = getBinEntries(pkg ?? {});
  if (firstBin === undefined) return undefined;

  const [binName, binTarget] = firstBin;
  return {
    label: binName,
    command: process.execPath,
    argsPrefix: [resolve(root, binTarget)],
  };
};

const spawnCli = (resolved, args, root) =>
  spawnSync(resolved.command, [...resolved.argsPrefix, ...args], {
    cwd: root,
    encoding: "utf8",
    timeout: 10_000,
    env: { ...process.env, FORCE_COLOR: "0", NO_COLOR: "1" },
  });

const parseSingleJsonObject = (stdout) => {
  const trimmed = stdout.trim();
  if (trimmed.length === 0) return { ok: false, reason: "stdout is empty" };

  let parsed;
  try {
    parsed = JSON.parse(trimmed);
  } catch (error) {
    return { ok: false, reason: `stdout is not exactly one JSON value: ${error.message}` };
  }

  if (!isRecord(parsed)) {
    return { ok: false, reason: "stdout JSON is not an object" };
  }

  return { ok: true, value: parsed };
};

const checkStructuredFailure = (reporter, value, label) => {
  if (!isRecord(value)) return;

  if (value.ok === false) {
    reporter.pass(`${label} has ok:false failure marker`);
  } else {
    reporter.warn(`${label} does not use recommended ok:false failure marker`);
  }

  if (isRecord(value.error)) {
    reporter.pass(`${label} includes structured error object`);
    reporter.check(typeof value.error.message === "string", `${label} error has message`);

    if (typeof value.error.code === "string") {
      reporter.pass(`${label} error has code`);
    } else {
      reporter.warn(`${label} error lacks recommended code`);
    }

    if (typeof value.error.retryable === "boolean") {
      reporter.pass(`${label} error has retryable flag`);
    } else {
      reporter.warn(`${label} error lacks recommended retryable flag`);
    }

    if (
      typeof value.error.recoveryHint === "string" ||
      isRecord(value.error.recoveryAction) ||
      typeof value.error.parameter === "string"
    ) {
      reporter.pass(`${label} error has recovery metadata`);
    } else {
      reporter.warn(`${label} error lacks recommended recovery metadata`);
    }
  } else {
    reporter.warn(`${label} lacks recommended structured error object`);
  }
};

const checkStructuredSuccess = (reporter, value, label) => {
  if (!isRecord(value)) return;

  if (value.ok === true) {
    reporter.pass(`${label} has ok:true success marker`);
  } else {
    reporter.warn(`${label} does not use recommended ok:true success marker`);
  }

  if ("result" in value) {
    reporter.pass(`${label} includes result field`);
  } else {
    reporter.warn(`${label} lacks recommended result field`);
  }

  if ("metadata" in value || "references" in value || "warnings" in value) {
    reporter.pass(`${label} includes result context metadata/references/warnings`);
  } else {
    reporter.warn(`${label} lacks recommended result context metadata/references/warnings`);
  }
};

const validatePackageShape = (reporter, root, pkg, args) => {
  reporter.check(hasString(pkg, "name"), "package has name");

  const binEntries = getBinEntries(pkg);
  reporter.check(binEntries.length > 0, "package has at least one CLI bin");

  if (args.id !== undefined) {
    const binNames = binEntries.map(([name]) => name);
    reporter.check(
      pkg.name === args.id || binNames.includes(args.id),
      `package name or CLI bin matches --id ${args.id}`,
    );
  }

  for (const [, target] of binEntries) {
    reporter.check(existsSync(resolve(root, target)), `CLI bin file exists: ${target}`);
  }
};

const validateCli = (reporter, root, resolved, args) => {
  if (resolved === undefined) {
    reporter.fail("no CLI command available; define package bin or pass --command");
    return;
  }

  const help = spawnCli(resolved, ["--help"], root);
  reporter.check(help.error === undefined, `${resolved.label} --help starts`);
  reporter.check(help.status === 0, `${resolved.label} --help exits 0`);
  reporter.check(
    `${help.stdout}${help.stderr}`.trim().length > 0,
    `${resolved.label} --help prints help text`,
  );

  const invalidArgs = args["invalid-args"] ?? ["__validate_tool_surface_unknown__"];
  const invalid = spawnCli(resolved, invalidArgs, root);
  reporter.check(invalid.error === undefined, `${resolved.label} invalid invocation starts`);
  reporter.check(invalid.status !== 0, `${resolved.label} invalid invocation exits non-zero`);

  const invalidJson = parseSingleJsonObject(invalid.stdout);
  reporter.check(
    invalidJson.ok,
    invalidJson.ok
      ? `${resolved.label} invalid invocation prints one JSON object to stdout`
      : `${resolved.label} invalid invocation stdout check failed: ${invalidJson.reason}`,
  );
  if (invalidJson.ok) checkStructuredFailure(reporter, invalidJson.value, "invalid invocation JSON");

  if (Array.isArray(args["success-args"])) {
    const success = spawnCli(resolved, args["success-args"], root);
    reporter.check(success.error === undefined, `${resolved.label} success invocation starts`);
    reporter.check(success.status === 0, `${resolved.label} success invocation exits 0`);

    const successJson = parseSingleJsonObject(success.stdout);
    reporter.check(
      successJson.ok,
      successJson.ok
        ? `${resolved.label} success invocation prints one JSON object to stdout`
        : `${resolved.label} success invocation stdout check failed: ${successJson.reason}`,
    );
    if (successJson.ok) checkStructuredSuccess(reporter, successJson.value, "success invocation JSON");

    if (success.stderr.trim().length > 0) {
      reporter.warn(`${resolved.label} success invocation wrote to stderr; ensure stdout JSON has any important warnings`);
    }
  } else {
    reporter.warn("success JSON smoke check skipped; pass --success-args with a safe command to enable it.");
  }
};

const main = () => {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    console.log(usage());
    return;
  }

  const root = resolve(args._[0] ?? process.cwd());
  const reporter = createReporter();
  const pkgPath = join(root, "package.json");
  let pkg;

  if (existsSync(pkgPath)) {
    reporter.pass("package.json exists");
    pkg = readJson(pkgPath);
    validatePackageShape(reporter, root, pkg, args);
  } else {
    reporter.warn("package.json not found; package bin checks skipped. Pass --command to run CLI smoke checks.");
  }

  const resolved = resolveCommand(root, pkg, args);
  if (args.runCli || Array.isArray(args["success-args"])) {
    validateCli(reporter, root, resolved, args);
  } else {
    reporter.warn("CLI runtime smoke checks skipped; pass --run-cli to enable them.");
  }

  reporter.print();
  process.exitCode = reporter.failed ? 1 : 0;
};

try {
  main();
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
