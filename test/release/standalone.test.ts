import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { archiveFiles, archiveName, digest, renderInstallers, targets, verifyBundle } from "../../scripts/standalone.mjs";
import { createBundle, sourceSha } from "./bundle-fixture.ts";

describe("release bundle authority", () => {
  test("accepts exact target inventory and rejects corruption, wrong source, and extra files", () => {
    const directory = mkdtempSync(join(tmpdir(), "darty-bundle-test-"));
    try {
      const files = createBundle(directory);
      expect(verifyBundle(directory, sourceSha).files).toHaveLength(files.size);
      expect(() => verifyBundle(directory, "b".repeat(40))).toThrow();
      const [name, bytes] = [...files][0]!;
      writeFileSync(join(directory, name), "corrupt");
      expect(() => verifyBundle(directory, sourceSha)).toThrow("archive checksum mismatch");
      writeFileSync(join(directory, name), bytes);
      writeFileSync(join(directory, "extra"), "unexpected");
      expect(() => verifyBundle(directory, sourceSha)).toThrow("unexpected files");
      rmSync(join(directory, "extra"));
      const path = join(directory, "release-manifest.json");
      const manifest = JSON.parse(readFileSync(path, "utf8"));
      manifest.targets.pop();
      writeFileSync(path, JSON.stringify(manifest));
      expect(() => verifyBundle(directory, sourceSha)).toThrow("target inventory mismatch");
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});

describe("Unix standalone installation", () => {
  test.skipIf(process.platform === "win32")("installs and upgrades exact bytes; failed checksum and candidate leave the old binary intact", () => {
    const directory = mkdtempSync(join(tmpdir(), "darty-installer-test-"));
    try {
      const target = targets.find((item) => item.os === process.platform && item.arch === process.arch)!;
      expect(target).toBeDefined();
      const archive = join(directory, archiveName(target));
      const sums = join(directory, "SHA256SUMS");
      const installer = join(directory, "install.sh");
      const bin = join(directory, "bin with spaces");
      mkdirSync(bin);
      writeFileSync(installer, renderInstallers()["install.sh"]!);
      writeFileSync(join(bin, "darty"), "previous executable");
      const makeArchive = (text: string) => {
        const bytes = archiveFiles([
          { name: "darty", bytes: Buffer.from(text), mode: 0o755 },
          { name: "LICENSE.md", bytes: Buffer.from("license"), mode: 0o644 },
        ]);
        writeFileSync(archive, bytes);
        writeFileSync(sums, `${digest(bytes)}  ${archiveName(target)}\n`);
        return bytes;
      };
      const install = () => spawnSync("sh", [installer, archive, sums, bin], { encoding: "utf8" });
      makeArchive("#!/bin/sh\nexit 7\n");
      expect(install().status).not.toBe(0);
      expect(readFileSync(join(bin, "darty"), "utf8")).toBe("previous executable");
      const cli = '#!/bin/sh\nprintf "Usage: darty\\n"\n';
      const bytes = makeArchive(cli);
      // Packing is deterministic and understood by the system's real tar engine.
      expect(makeArchive(cli)).toEqual(bytes);
      writeFileSync(sums, `${"0".repeat(64)}  ${archiveName(target)}\n`);
      expect(install().stderr).toContain("checksum mismatch");
      expect(readFileSync(join(bin, "darty"), "utf8")).toBe("previous executable");
      makeArchive(cli);
      const installed = install();
      expect(installed.status).toBe(0);
      expect(readFileSync(join(bin, "darty"), "utf8")).toBe(cli);
      const upgraded = '#!/bin/sh\nprintf "Usage: darty updated\\n"\n';
      makeArchive(upgraded);
      expect(install().status).toBe(0);
      expect(readFileSync(join(bin, "darty"), "utf8")).toBe(upgraded);
      expect(readdirSync(bin)).toEqual(["darty"]);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});

describe("Windows standalone installation", () => {
  test("checks the physical destination before replacing an existing binary", () => {
    const installer = renderInstallers()["install.ps1"]!;
    const visibilityCheck = installer.indexOf("AssertInstallationPathIsVisible $BinDirectory");
    const staging = installer.indexOf("$stage =");
    expect(installer).toContain("Join-Path $env:LOCALAPPDATA 'darty\\bin'");
    expect(installer).toContain("GetFinalPathNameByHandle");
    expect(visibilityCheck).toBeGreaterThan(-1);
    expect(visibilityCheck).toBeLessThan(staging);
    expect(installer).toContain("Advertised path:");
    expect(installer).toContain("Physical path:");
    expect(installer).toContain("No existing installation was changed.");
    expect(installer).toContain("-BinDirectory");
    expect(installer).toContain("--help");
    expect(installer).not.toContain("--version");
    expect(installer).not.toContain("SetEnvironmentVariable");
    // $null becomes "" for a .NET string parameter and File.Replace rejects it,
    // which broke every upgrade over an existing executable through v0.6.3.
    expect(installer).toContain("[IO.File]::Replace($candidate, $destination, [NullString]::Value)");
    expect(installer).not.toMatch(/Replace\([^)]*\$null\)/);
  });

  // CI runs only on Linux, so this exercises the real installer on Windows hosts.
  test.skipIf(process.platform !== "win32")("installs, then upgrades over an existing executable", () => {
    const directory = mkdtempSync(join(tmpdir(), "darty-installer-test-"));
    try {
      const target = targets.find((item) => item.os === "win32")!;
      const archive = join(directory, archiveName(target));
      const sums = join(directory, "SHA256SUMS");
      const installer = join(directory, "install.ps1");
      const bin = join(directory, "bin with spaces");
      writeFileSync(installer, renderInstallers()["install.ps1"]!);
      // Any small executable that accepts --help stands in for the CLI.
      const tool = readFileSync(join(process.env.SystemRoot!, "System32", "tar.exe"));
      const makeArchive = (executable: Buffer) => {
        const packed = archiveFiles([
          { name: "darty.exe", bytes: executable, mode: 0o755 },
          { name: "LICENSE.md", bytes: Buffer.from("license\n"), mode: 0o644 },
        ]);
        writeFileSync(archive, packed);
        writeFileSync(sums, `${digest(packed)}  ${archiveName(target)}\n`);
      };
      const install = () => spawnSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", installer,
        "-Archive", archive, "-Checksums", sums, "-BinDirectory", bin], { encoding: "utf8" });
      const installed = () => readFileSync(join(bin, "darty.exe"));

      makeArchive(tool);
      const first = install();
      expect(first.stderr).toBe("");
      expect(first.status).toBe(0);
      expect(installed().equals(tool)).toBe(true);

      // Trailing bytes change the digest without affecting execution.
      const upgraded = Buffer.concat([tool, Buffer.from("darty-upgrade")]);
      makeArchive(upgraded);
      const second = install();
      expect(second.stderr).toBe("");
      expect(second.status).toBe(0);
      expect(installed().equals(upgraded)).toBe(true);
      expect(readdirSync(bin)).toEqual(["darty.exe"]);

      writeFileSync(sums, `${"0".repeat(64)}  ${archiveName(target)}\n`);
      expect(install().status).not.toBe(0);
      expect(installed().equals(upgraded)).toBe(true);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  }, 120_000);
});
