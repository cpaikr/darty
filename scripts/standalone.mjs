#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  chmodSync, copyFileSync, mkdirSync, mkdtempSync, readFileSync,
  readdirSync, rmSync, writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { gzipSync } from "node:zlib";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const targets = JSON.parse(readFileSync(join(root, "scripts/release-targets.json"), "utf8"));
const source = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
export const version = source.version;
const bunVersion = source.packageManager.replace(/^bun@/, "");
export const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
export const archiveName = (target) => `darty-${version}-${target.id}.tar.gz`;
const targetById = (id) => {
  const target = targets.find((item) => item.id === id);
  assert.ok(target, `Unknown standalone target: ${id}`);
  return target;
};
export function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root, encoding: "utf8", timeout: 300_000, ...options,
  });
  assert.equal(result.status, 0, `${command} failed: ${result.error?.message ?? (result.stderr || result.stdout)}`);
  return result.stdout;
}
const revision = () => run("git", ["rev-parse", "HEAD"]).trim();
const json = (path) => JSON.parse(readFileSync(path, "utf8"));
const writeJson = (path, value) => writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);

// A deterministic USTAR containing only two known regular files. Zero timestamps,
// fixed ownership, and gzip's zero timestamp allow byte-identical rebuilds.
export function archiveFiles(files) {
  const blocks = [];
  for (const { name, bytes, mode } of files) {
    assert.match(name, /^(darty(?:\.exe)?|LICENSE\.md)$/);
    const header = Buffer.alloc(512);
    header.write(name, 0, 100, "ascii");
    const octal = (value, offset, length) => header.write(`${value.toString(8).padStart(length - 1, "0")}\0`, offset, length, "ascii");
    octal(mode, 100, 8);
    octal(0, 108, 8);
    octal(0, 116, 8);
    octal(bytes.length, 124, 12);
    octal(0, 136, 12);
    header.fill(32, 148, 156);
    header.write("0", 156);
    header.write("ustar\0", 257);
    header.write("00", 263);
    header.write(`${header.reduce((sum, byte) => sum + byte, 0).toString(8).padStart(6, "0")}\0 `, 148, 8, "ascii");
    blocks.push(header, bytes, Buffer.alloc((512 - bytes.length % 512) % 512));
  }
  blocks.push(Buffer.alloc(1024));
  return gzipSync(Buffer.concat(blocks), { level: 9 });
}

function verifyBinary(bytes, target) {
  if (target.os === "linux") {
    assert.equal(bytes.subarray(0, 4).toString("hex"), "7f454c46", "Expected ELF executable");
    assert.equal(bytes[4], 2, "Expected 64-bit ELF");
    assert.equal(bytes.readUInt16LE(18), target.arch === "x64" ? 62 : 183, "ELF architecture mismatch");
  } else if (target.os === "darwin") {
    assert.equal(bytes.readUInt32LE(0), 0xfeedfacf, "Expected 64-bit Mach-O executable");
    assert.equal(bytes.readUInt32LE(4), 0x100000c, "Mach-O architecture mismatch");
  } else {
    assert.equal(bytes.subarray(0, 2).toString(), "MZ", "Expected Windows executable");
    const pe = bytes.readUInt32LE(60);
    assert.equal(bytes.subarray(pe, pe + 4).toString(), "PE\0\0", "Expected PE signature");
    assert.equal(bytes.readUInt16LE(pe + 4), 0x8664, "PE architecture mismatch");
  }
}

export function renderInstallers() {
  const unixCases = targets.filter((target) => target.os !== "win32").map((target) => {
    const os = target.os === "linux" ? "Linux" : "Darwin";
    const arch = target.arch === "x64" ? "x86_64" : target.os === "linux" ? "aarch64|Linux:arm64" : "arm64";
    return `  ${os}:${arch}) target=${target.id} ;;`;
  }).join("\n");
  const windows = targets.filter((target) => target.os === "win32");
  assert.equal(windows.length, 1, "PowerShell installer expects one Windows target");
  return Object.fromEntries(["install.sh", "install.ps1"].map((name) => [name,
    readFileSync(join(root, "scripts/install", name), "utf8")
      .replaceAll("@@VERSION@@", version)
      .replace("@@UNIX_TARGETS@@", unixCases)
      .replace("@@WINDOWS_ARCHIVE@@", archiveName(windows[0])),
  ]));
}

function build(id, directory) {
  const target = targetById(id);
  assert.equal(run("bun", ["--version"]).trim(), bunVersion, "Use the packageManager-pinned Bun compiler");
  mkdirSync(directory, { recursive: true });
  const stage = mkdtempSync(join(tmpdir(), "darty-compile-"));
  try {
    const executable = join(stage, target.executable);
    run("bun", ["build", "src/cli.ts", "--compile", `--target=${target.bunTarget}`,
      "--minify", "--env=disable", "--no-compile-autoload-dotenv", "--no-compile-autoload-bunfig",
      "--no-compile-autoload-tsconfig", "--no-compile-autoload-package-json", "--outfile", executable]);
    const bytes = readFileSync(executable);
    verifyBinary(bytes, target);
    const archive = archiveName(target);
    const packed = archiveFiles([
      { name: target.executable, bytes, mode: 0o755 },
      { name: "LICENSE.md", bytes: readFileSync(join(root, "LICENSE.md")), mode: 0o644 },
    ]);
    writeFileSync(join(directory, archive), packed);
    writeJson(join(directory, `${target.id}.json`), {
      target: target.id, version, sourceRevision: revision(), compiler: `bun@${bunVersion}`,
      archive, sha256: digest(packed), executableSha256: digest(bytes),
    });
    console.log(`Built ${archive} (${digest(packed)})`);
  } finally {
    rmSync(stage, { recursive: true, force: true });
  }
}

function readBuild(directory, target) {
  const record = json(join(directory, `${target.id}.json`));
  assert.equal(record.target, target.id);
  assert.equal(record.version, version);
  assert.equal(record.sourceRevision, revision(), "Archive source differs from checkout");
  assert.equal(record.compiler, `bun@${bunVersion}`);
  assert.equal(record.archive, archiveName(target));
  assert.equal(record.sha256, digest(readFileSync(join(directory, record.archive))), "Archive checksum mismatch");
  assert.match(record.executableSha256, /^[0-9a-f]{64}$/);
  return record;
}

function certify(id, directory, reportPath) {
  const target = targetById(id);
  assert.equal(process.platform, target.os, "Certification must execute on the target OS");
  assert.equal(process.arch, target.arch, "Certification must execute on the target architecture");
  const record = readBuild(directory, target);
  const consumer = mkdtempSync(join(tmpdir(), "darty-consumer-"));
  try {
    const checksums = join(consumer, "SHA256SUMS");
    writeFileSync(checksums, `${record.sha256}  ${record.archive}\n`);
    const installer = join(consumer, "install.sh");
    writeFileSync(installer, renderInstallers()["install.sh"]);
    const bin = join(consumer, "bin with spaces");
    run("sh", [installer, join(directory, record.archive), checksums, bin], { cwd: consumer });
    const executable = join(bin, target.executable);
    assert.equal(digest(readFileSync(executable)), record.executableSha256, "Installer changed executable bytes");
    // No JS runtime or package manager is available to the subject process.
    const emptyPath = join(consumer, "empty-path");
    mkdirSync(emptyPath);
    const env = { ...process.env, PATH: emptyPath };
    writeFileSync(join(consumer, ".env"), "NODE_OPTIONS=--invalid-darty-test-option\n");
    writeFileSync(join(consumer, "bunfig.toml"), "this is deliberately invalid TOML [\n");
    run(executable, ["--help"], { cwd: consumer, env });
    console.log(run(process.execPath, [join(root, "scripts/judge-cli-v1.mjs"), "--profile", "full", "--", executable], { cwd: consumer, env }));
    // Check recovery at the supported installation boundary, preserving the old binary.
    writeFileSync(checksums, `${"0".repeat(64)}  ${record.archive}\n`);
    const rejected = spawnSync("sh", [installer, join(directory, record.archive), checksums, bin], { cwd: consumer, encoding: "utf8" });
    assert.notEqual(rejected.status, 0, "Corrupt checksum must fail installation");
    assert.equal(digest(readFileSync(executable)), record.executableSha256, "Failed install changed previous binary");
    mkdirSync(dirname(reportPath), { recursive: true });
    writeJson(reportPath, { ...record, certified: true, os: process.platform, arch: process.arch, contract: "cli-v1-full", runtimeRequired: false });
  } finally {
    rmSync(consumer, { recursive: true, force: true });
  }
}

export function verifyBundle(directory, sourceSha = revision()) {
  const manifest = json(join(directory, "release-manifest.json"));
  assert.equal(manifest.version, version);
  assert.equal(manifest.tag, `v${version}`);
  assert.equal(manifest.sourceRevision, sourceSha);
  assert.deepEqual(manifest.targets.map((entry) => entry.target), targets.map((target) => target.id), "Release target inventory mismatch");
  const files = [];
  for (const [index, target] of targets.entries()) {
    const entry = manifest.targets[index];
    assert.equal(entry.archive, archiveName(target));
    assert.equal(entry.runtimeCertified, target.os === "linux", "Certification coverage mismatch");
    assert.equal(entry.sha256, digest(readFileSync(join(directory, entry.archive))), "Release archive checksum mismatch");
    files.push(entry.archive);
  }
  for (const [name, content] of Object.entries(renderInstallers())) {
    assert.equal(readFileSync(join(directory, name), "utf8"), content, "Installer differs from source");
    files.push(name);
  }
  const checksumText = files.map((name) => `${digest(readFileSync(join(directory, name)))}  ${name}\n`).join("");
  assert.equal(readFileSync(join(directory, "SHA256SUMS"), "utf8"), checksumText, "Checksum inventory mismatch");
  files.push("SHA256SUMS", "release-manifest.json");
  assert.deepEqual(readdirSync(directory).sort(), [...files].sort(), "Release bundle contains missing or unexpected files");
  return { manifest, files };
}

function assemble(archives, reports, directory) {
  mkdirSync(directory, { recursive: true });
  const entries = targets.map((target) => {
    const record = readBuild(archives, target);
    if (target.os === "linux") {
      const report = json(join(reports, `${target.id}.json`));
      assert.equal(report.certified, true);
      assert.equal(report.contract, "cli-v1-full");
      assert.equal(report.runtimeRequired, false);
      assert.equal(report.os, target.os);
      assert.equal(report.arch, target.arch);
      for (const [key, value] of Object.entries(record)) assert.equal(report[key], value, `Certification ${key} mismatch`);
    }
    copyFileSync(join(archives, record.archive), join(directory, record.archive));
    return { target: target.id, archive: record.archive, sha256: record.sha256, runtimeCertified: target.os === "linux" };
  });
  for (const [name, content] of Object.entries(renderInstallers())) writeFileSync(join(directory, name), content);
  const files = [...entries.map((entry) => entry.archive), "install.sh", "install.ps1"];
  writeFileSync(join(directory, "SHA256SUMS"), files.map((name) => `${digest(readFileSync(join(directory, name)))}  ${name}\n`).join(""));
  writeJson(join(directory, "release-manifest.json"), {
    version, tag: `v${version}`, sourceRevision: revision(), compiler: `bun@${bunVersion}`, targets: entries,
  });
  verifyBundle(directory);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const [command, ...args] = process.argv.slice(2);
    if (command === "matrix") {
      const selected = args[0] === "all" ? targets : [targetById("linux-x64-gnu")];
      console.log(JSON.stringify({ build: { include: selected.map(({ id }) => ({ id })) }, consume: { include: selected.filter((target) => target.os === "linux").map(({ id, runner }) => ({ id, runner })) } }));
    } else if (command === "build" && args.length === 2) build(args[0], resolve(args[1]));
    else if (command === "certify" && args.length === 3) certify(args[0], resolve(args[1]), resolve(args[2]));
    else if (command === "assemble" && args.length === 3) assemble(...args.map((arg) => resolve(arg)));
    else if (command === "verify" && args.length === 1) verifyBundle(resolve(args[0]));
    else if (command === "check-host") {
      const target = targets.find((item) => item.os === process.platform && item.arch === process.arch);
      assert.ok(target && target.os !== "win32", "Local certification requires a supported Unix host");
      const directory = resolve("release-artifact", target.id);
      build(target.id, directory);
      certify(target.id, directory, resolve("release-artifact", `${target.id}-report.json`));
    } else throw new Error("Usage: standalone.mjs matrix [all|linux-x64] | build TARGET OUT | certify TARGET ARCHIVES REPORT | assemble ARCHIVES REPORTS OUT | verify BUNDLE | check-host");
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
