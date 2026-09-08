#!/usr/bin/env node
import assert from "node:assert/strict";
import { copyFileSync, cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const version = JSON.parse(readFileSync(join(root, "package.json"), "utf8")).version;
export const nodeTargets = ["linux-x64-gnu", "darwin-arm64"];
export const sdkFiles = [
  `darty-${version}.crate`,
  ...nodeTargets.map(target => `darty-node-${version}-${target}.tgz`),
];
export const sha256 = bytes => createHash("sha256").update(bytes).digest("hex");
const run = (command, args, cwd = root) => {
  const result = spawnSync(command, args, { cwd, encoding: "utf8", timeout: 900_000 });
  assert.equal(result.status, 0, `${command} failed: ${result.error?.message ?? result.stderr}\n${result.stdout}`);
  return result.stdout;
};
const revision = () => run("git", ["rev-parse", "HEAD"]).trim();
const writeJson = (path, value) => writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);

export function checkVersions() {
  const metadata = JSON.parse(run("cargo", ["+1.88.0", "metadata", "--no-deps", "--format-version", "1", "--locked"]));
  for (const member of metadata.packages) assert.equal(member.version, version, `${member.name} version differs from package.json`);
  assert.equal(JSON.parse(readFileSync(join(root, "packages/node/package.json"), "utf8")).version, version);
}

export function packNode(target, addon, directory) {
  assert.ok(nodeTargets.includes(target), `Unsupported Node target: ${target}`);
  mkdirSync(directory, { recursive: true });
  const stage = mkdtempSync(join(tmpdir(), "darty-node-package-"));
  try {
    cpSync(join(root, "packages/node"), stage, { recursive: true });
    copyFileSync(addon, join(stage, "darty.node"));
    const bytes = readFileSync(addon);
    assert.ok(bytes.length >= 64, "Native addon header is truncated");
    if (target === "darwin-arm64") {
      assert.equal(bytes.readUInt32LE(0), 0xfeedfacf, "Expected 64-bit Mach-O addon");
      assert.equal(bytes.readUInt32LE(4), 0x100000c, "Mach-O addon architecture mismatch");
      assert.equal(bytes.readUInt32LE(12), 6, "Expected Mach-O dynamic library");
    } else {
      assert.equal(bytes.subarray(0, 4).toString("hex"), "7f454c46", "Expected ELF addon");
      assert.equal(bytes[4], 2, "Expected 64-bit ELF addon");
      assert.equal(bytes[5], 1, "Expected little-endian ELF addon");
      assert.equal(bytes.readUInt16LE(16), 3, "Expected ELF shared object");
      assert.equal(bytes.readUInt16LE(18), 62, "ELF addon architecture mismatch");
    }
    for (const token of ["DARTY_FIXTURE_ORIGIN", "DARTY_NODE_TEST_FIXTURE_ORIGIN"]) {
      assert.equal(bytes.includes(Buffer.from(token)), false, "Refusing to package a fixture-enabled addon");
    }
    const metadata = JSON.parse(readFileSync(join(stage, "package.json"), "utf8"));
    metadata.os = [target === "darwin-arm64" ? "darwin" : "linux"];
    metadata.cpu = [target === "darwin-arm64" ? "arm64" : "x64"];
    if (target.startsWith("linux")) metadata.libc = ["glibc"];
    writeJson(join(stage, "package.json"), metadata);
    const [packed] = JSON.parse(run("npm", ["pack", stage, "--ignore-scripts", "--json", "--pack-destination", stage]));
    assert.deepEqual(packed.files.map(file => file.path).sort(), ["LICENSE.md", "darty.node", "index.d.ts", "index.js", "native.js", "package.json"]);
    const file = `darty-node-${version}-${target}.tgz`;
    copyFileSync(join(stage, packed.filename), join(directory, file));
    writeJson(join(directory, `node-${target}.json`), { file, target, version, sourceRevision: revision(), sha256: sha256(readFileSync(join(directory, file))) });
    return join(directory, file);
  } finally { rmSync(stage, { recursive: true, force: true }); }
}

function packRust(directory) {
  mkdirSync(directory, { recursive: true });
  run("cargo", ["+1.88.0", "package", "-p", "darty", "--locked"]);
  const file = `darty-${version}.crate`;
  copyFileSync(join(root, "target/package", file), join(directory, file));
  consumeRust(join(directory, file));
  writeJson(join(directory, "rust.json"), { file, version, sourceRevision: revision(), sha256: sha256(readFileSync(join(directory, file))), consumerVerified: true });
}

function consumeRust(archive) {
  const consumer = mkdtempSync(join(tmpdir(), "darty-rust-consumer-"));
  try {
    run("tar", ["-xzf", archive, "-C", consumer]);
    const unpacked = join(consumer, `darty-${version}`);
    assert.ok(readdirSync(unpacked).includes("LICENSE.md"), "Rust package must contain its license");
    mkdirSync(join(consumer, "src"));
    writeFileSync(join(consumer, "Cargo.toml"), `[package]\nname = "darty-external-consumer"\nversion = "0.0.0"\nedition = "2024"\n[dependencies]\ndarty = { path = ${JSON.stringify(unpacked)} }\ntokio = { version = "1", features = ["macros", "rt-multi-thread"] }\n`);
    writeFileSync(join(consumer, "src/main.rs"), `use darty::{DartyClient, DisclosureTypesRequest, ReportGuideRequest, SearchCompanyRequest};\n#[tokio::main]\nasync fn main() {\n let client = DartyClient::new().unwrap();\n assert!(!client.disclosure_types(DisclosureTypesRequest::default()).unwrap().result.categories.is_empty());\n assert!(!client.report_guide(ReportGuideRequest::default()).result.content_markdown.is_empty());\n let error = client.search_company(SearchCompanyRequest::new("x")).await.unwrap_err();\n assert_eq!(error.parameter.as_deref(), Some("companyName"));\n}\n`);
    run("cargo", ["+1.88.0", "run", "--release"], consumer);
  } finally { rmSync(consumer, { recursive: true, force: true }); }
}

async function certifyNode(directory, target) {
  const recordPath = join(directory, `node-${target}.json`);
  const record = JSON.parse(readFileSync(recordPath, "utf8"));
  assert.equal(target, process.platform === "linux" && process.arch === "x64" ? "linux-x64-gnu" : `${process.platform}-${process.arch}`);
  assert.equal(record.sourceRevision, revision());
  const archive = join(directory, record.file);
  assert.equal(record.sha256, sha256(readFileSync(archive)));
  const consumer = mkdtempSync(join(tmpdir(), "darty-native-consumer-"));
  try {
    writeJson(join(consumer, "package.json"), { private: true, type: "module" });
    run("npm", ["install", "--offline", "--ignore-scripts", "--no-audit", "--no-fund", archive], consumer);
    const sdk = await import(pathToFileURL(join(consumer, "node_modules/@sjunepark/darty/index.js")));
    const client = new sdk.DartyClient();
    assert.ok((await client.disclosureTypes()).result.categories.length > 0);
    assert.ok((await client.reportGuide()).result.contentMarkdown.length > 0);
    await assert.rejects(client.companyDetail({}), error => error instanceof sdk.DartyError && error.parameter === "companyCode");
    const controller = new AbortController();
    controller.abort();
    await assert.rejects(client.searchCompany({ companyName: "가람" }, { signal: controller.signal }), error => error.name === "AbortError");
    writeJson(recordPath, { ...record, consumerVerified: true });
  } finally { rmSync(consumer, { recursive: true, force: true }); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [command, ...args] = process.argv.slice(2);
  checkVersions();
  if (command === "node" && args.length === 3) packNode(args[0], resolve(args[1]), resolve(args[2]));
  else if (command === "certify-node" && args.length === 2) await certifyNode(resolve(args[0]), args[1]);
  else if (command === "rust" && args.length === 1) packRust(resolve(args[0]));
  else if (command === "consume-rust" && args.length === 1) consumeRust(resolve(args[0]));
  else if (command !== "versions" || args.length) throw new Error("Usage: sdk-artifacts.mjs versions | node TARGET ADDON OUT | certify-node DIR TARGET | rust OUT | consume-rust ARCHIVE");
}
