import { expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { packNode } from "../../scripts/sdk-artifacts.mjs";

test("Node packaging rejects non-native, wrong-architecture, and executable addons", () => {
  const directory = mkdtempSync(join(tmpdir(), "darty-addon-format-"));
  const addon = join(directory, "addon");
  try {
    writeFileSync(addon, "plain text");
    expect(() => packNode("darwin-arm64", addon, directory)).toThrow("truncated");
    const bytes = Buffer.alloc(64);
    bytes.writeUInt32LE(0xfeedfacf, 0);
    bytes.writeUInt32LE(0x1000007, 4);
    bytes.writeUInt32LE(6, 12);
    writeFileSync(addon, bytes);
    expect(() => packNode("darwin-arm64", addon, directory)).toThrow("architecture");
    bytes.writeUInt32LE(0x100000c, 4);
    bytes.writeUInt32LE(2, 12);
    writeFileSync(addon, bytes);
    expect(() => packNode("darwin-arm64", addon, directory)).toThrow("dynamic library");
    expect(() => packNode("linux-x64-gnu", addon, directory)).toThrow("ELF");
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
