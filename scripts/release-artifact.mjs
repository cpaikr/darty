#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readFileSync, mkdirSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { dirname, resolve, join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

function run(command, args, cwd = process.cwd()) {
  if (process.platform === "win32" && command === "npm") {
    args = [join(dirname(process.execPath), "node_modules/npm/bin/npm-cli.js"), ...args];
    command = process.execPath;
  }
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    windowsVerbatimArguments: command === "cmd.exe",
  });
  if (result.error || result.status !== 0) {
    throw new Error(`${command} failed: ${result.error?.message ?? (result.stderr || result.stdout)}`);
  }
  return result.stdout;
}
const digest = (bytes, algorithm, encoding) => createHash(algorithm).update(bytes).digest(encoding);

export function verifyArtifact(directory) {
  const manifest = JSON.parse(readFileSync(join(directory, "manifest.json"), "utf8"));
  if (
    manifest.file !== "darty.tgz" ||
    manifest.name !== "@sjunepark/darty" ||
    !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(manifest.version)
  ) {
    throw new Error("Invalid release artifact manifest");
  }
  const tarball = resolve(directory, manifest.file);
  const bytes = readFileSync(tarball);
  if (
    manifest.sha256 !== digest(bytes, "sha256", "hex") ||
    manifest.integrity !== `sha512-${digest(bytes, "sha512", "base64")}`
  ) {
    throw new Error("Release archive checksum mismatch");
  }
  const source = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  if (source.name !== manifest.name || source.version !== manifest.version) {
    throw new Error("Artifact differs from source package identity");
  }
  return { ...manifest, tarball };
}

function pack(directory) {
  mkdirSync(directory, { recursive: true });
  const [packed] = JSON.parse(run("npm", ["pack", "--ignore-scripts", "--json", "--pack-destination", directory]));
  const bytes = readFileSync(join(directory, packed.filename));
  // The allowlist excludes source, candidate artifacts, local config, and credentials.
  for (const { path } of packed.files) {
    if (!/^(package\.json|README\.md|LICENSE\.md|dist\/.*\.(js|d\.ts))$/.test(path)) throw new Error(`Unexpected package member: ${path}`);
  }
  for (const required of ["dist/cli.js", "dist/toolset.js", "dist/toolset.d.ts", "package.json"]) {
    if (!packed.files.some(({ path }) => path === required)) throw new Error(`Missing package member: ${required}`);
  }
  writeFileSync(join(directory, "darty.tgz"), bytes);
  if (packed.filename !== "darty.tgz") rmSync(join(directory, packed.filename));
  const manifest = {
    file: "darty.tgz",
    name: packed.name,
    version: packed.version,
    sha256: digest(bytes, "sha256", "hex"),
    integrity: `sha512-${digest(bytes, "sha512", "base64")}`,
  };
  writeFileSync(join(directory, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  writeFileSync(join(directory, "SHA256SUMS"), `${manifest.sha256}  darty.tgz\n`);
  verifyArtifact(directory);
}

function consume(directory) {
  const artifact = verifyArtifact(directory);
  const consumer = mkdtempSync(join(tmpdir(), "darty-consumer-"));
  try {
    writeFileSync(join(consumer, "package.json"), JSON.stringify({ private: true, type: "module" }));
    run("npm", ["install", "--ignore-scripts", "--no-audit", "--no-fund", artifact.tarball], consumer);
    const installed = join(consumer, "node_modules/@sjunepark/darty");
    const metadata = JSON.parse(readFileSync(join(installed, "package.json"), "utf8"));
    if (
      metadata.name !== artifact.name ||
      metadata.version !== artifact.version ||
      metadata.bin?.darty !== "dist/cli.js"
    ) {
      throw new Error("Installed package identity or bin mismatch");
    }
    run(process.execPath, ["--input-type=module", "-e", `
      import { createDartyToolset } from "@sjunepark/darty/toolset";
      const result = createDartyToolset().validateInput("search-company", {
        companyName: "삼성전자",
      });
      if (!result.ok) throw new Error("Installed toolset validation failed");
    `], consumer);
    const bin = join(consumer, "node_modules/.bin/darty");
    // cmd owns the quoting of the Windows npm shim, including paths with spaces.
    run(
      process.platform === "win32" ? "cmd.exe" : bin,
      process.platform === "win32"
        ? ["/d", "/s", "/c", `""${bin}.cmd" --help"`]
        : ["--help"],
      consumer,
    );
    const judge = new URL("./judge-cli-v1.mjs", import.meta.url);
    console.log(run(process.execPath, [
      fileURLToPath(judge), "--profile", "full", "--",
      process.execPath, join(installed, "dist/cli.js"),
    ], consumer));
  } finally {
    rmSync(consumer, { recursive: true, force: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const [command, directory = "release-artifact"] = process.argv.slice(2);
    if (command === "pack") pack(resolve(directory));
    else if (command === "consume") consume(resolve(directory));
    else throw new Error("Usage: release-artifact.mjs pack|consume [directory]");
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
