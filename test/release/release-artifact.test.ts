import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { verifyArtifact } from "../../scripts/release-artifact.mjs";
import source from "../../package.json";

describe("release archive identity", () => {
  test("accepts matching bytes and rejects corruption and wrong source versions", () => {
    const directory = mkdtempSync(join(tmpdir(), "darty-artifact-test-"));
    try {
      const bytes = Buffer.from("a packed release");
      const manifest = {
        file: "darty.tgz", name: source.name, version: source.version,
        sha256: createHash("sha256").update(bytes).digest("hex"),
        integrity: `sha512-${createHash("sha512").update(bytes).digest("base64")}`,
      };
      writeFileSync(join(directory, "darty.tgz"), bytes);
      writeFileSync(join(directory, "manifest.json"), JSON.stringify(manifest));
      expect(verifyArtifact(directory).version).toBe(source.version);
      writeFileSync(join(directory, "darty.tgz"), "corrupted");
      expect(() => verifyArtifact(directory)).toThrow("checksum mismatch");
      writeFileSync(join(directory, "darty.tgz"), bytes);
      writeFileSync(join(directory, "manifest.json"), JSON.stringify({ ...manifest, version: "999.0.0" }));
      expect(() => verifyArtifact(directory)).toThrow("source package identity");
      writeFileSync(join(directory, "manifest.json"), JSON.stringify({ ...manifest, file: "../darty.tgz" }));
      expect(() => verifyArtifact(directory)).toThrow("Invalid release artifact manifest");
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
