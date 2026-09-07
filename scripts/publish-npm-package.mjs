#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

import { verifyArtifact } from "./release-artifact.mjs";

function fail(message) {
  throw new Error(message);
}

function validateInputs({ packageName, packageVersion }) {
  if (!/^@[a-z0-9][a-z0-9._-]*\/[a-z0-9][a-z0-9._-]*$/.test(packageName)) {
    fail(`Invalid scoped npm package name: ${packageName}`);
  }
  if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(packageVersion)) {
    fail(`Invalid stable npm package version: ${packageVersion}`);
  }
}

function parseJson(result, description) {
  try {
    return JSON.parse(result.stdout);
  } catch (error) {
    fail(`npm returned invalid JSON for ${description}: ${error.message}`);
  }
}

function npmErrorCode(result) {
  try {
    const response = JSON.parse(result.stdout);
    return typeof response?.error?.code === "string" ? response.error.code : null;
  } catch {
    return null;
  }
}

function formatFailure(result) {
  return result.stderr.trim() || result.stdout.trim() || `exit status ${result.status}`;
}

export function completeNpmPublication(
  { packageName, packageVersion, tarball, integrity },
  runNpm,
) {
  validateInputs({ packageName, packageVersion });
  if (!tarball || !integrity) fail("A verified release archive is required.");
  const packageSpec = `${packageName}@${packageVersion}`;
  const versionLookup = runNpm([
    "view",
    packageSpec,
    "version",
    "dist.integrity",
    "--json",
  ]);

  if (versionLookup.status === 0) {
    const metadata = parseJson(versionLookup, packageSpec);
    if (metadata.version !== packageVersion) {
      fail(`${packageSpec} resolved to unexpected version ${metadata.version ?? "<missing>"}.`);
    }
    if (typeof metadata["dist.integrity"] !== "string") {
      fail(`${packageSpec} has no registry integrity metadata.`);
    }

    const localIntegrity = integrity;
    if (localIntegrity !== metadata["dist.integrity"]) {
      fail(
        `${packageSpec} is already published with different package bytes; refusing release completion.`,
      );
    }

    return { disposition: "verified", integrity: localIntegrity };
  }

  if (npmErrorCode(versionLookup) !== "E404") {
    fail(`Could not inspect ${packageSpec}: ${formatFailure(versionLookup)}`);
  }

  const packageLookup = runNpm(["view", packageName, "name", "--json"]);
  if (packageLookup.status !== 0) {
    fail(
      `Could not distinguish an absent ${packageSpec} version from an unavailable package: ${formatFailure(packageLookup)}`,
    );
  }
  if (parseJson(packageLookup, packageName) !== packageName) {
    fail(`npm registry identity does not match ${packageName}.`);
  }

  const publishResult = runNpm(["publish", tarball, "--ignore-scripts", "--access", "public"]);
  if (publishResult.status !== 0) {
    fail(`Could not publish ${packageSpec}: ${formatFailure(publishResult)}`);
  }

  const published = runNpm(["view", packageSpec, "version", "dist.integrity", "--json"]);
  if (published.status !== 0) {
    fail(`npm publication completed but registry verification failed; rerun the same tag: ${formatFailure(published)}`);
  }
  const metadata = parseJson(published, packageSpec);
  if (metadata.version !== packageVersion || metadata["dist.integrity"] !== integrity) {
    fail("npm publication completed but registry identity or integrity differs from the certified archive.");
  }
  return { disposition: "published" };
}

function systemNpm(args) {
  const result = spawnSync("npm", args, {
    encoding: "utf8",
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.error) {
    fail(`Could not execute npm: ${result.error.message}`);
  }
  return {
    status: result.status ?? 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

function parseArguments(argv) {
  const values = {};
  for (let index = 0; index < argv.length; index += 2) {
    const option = argv[index];
    const value = argv[index + 1];
    if (!option?.startsWith("--") || value === undefined) {
      fail("Usage: publish-npm-package.mjs --name @SCOPE/NAME --version X.Y.Z --artifact DIRECTORY");
    }
    values[option.slice(2)] = value;
  }
  return {
    packageName: values.name,
    packageVersion: values.version,
    directory: values.artifact,
  };
}

async function main() {
  const input = parseArguments(process.argv.slice(2));
  if (!input.directory) fail("--artifact is required");
  const artifact = verifyArtifact(input.directory);
  if (artifact.name !== input.packageName || artifact.version !== input.packageVersion) fail("Release archive identity mismatch");
  const result = completeNpmPublication({ ...input, tarball: artifact.tarball, integrity: artifact.integrity }, systemNpm);
  console.log(`${result.disposition}: ${input.packageName}@${input.packageVersion}`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
