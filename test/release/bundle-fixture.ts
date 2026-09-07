import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { archiveName, digest, renderInstallers, targets, version } from "../../scripts/standalone.mjs";

export const sourceSha = "a".repeat(40);
export function createBundle(directory: string): Map<string, Buffer> {
  mkdirSync(directory, { recursive: true });
  const files = new Map<string, Buffer>();
  const entries = targets.map((target) => {
    const bytes = Buffer.from(`compiled ${target.id}`);
    const archive = archiveName(target);
    files.set(archive, bytes);
    return { target: target.id, archive, sha256: digest(bytes), runtimeCertified: target.os === "linux" };
  });
  for (const [name, content] of Object.entries(renderInstallers())) files.set(name, Buffer.from(content));
  const checksumText = [...files].map(([name, bytes]) => `${digest(bytes)}  ${name}\n`).join("");
  files.set("SHA256SUMS", Buffer.from(checksumText));
  files.set("release-manifest.json", Buffer.from(JSON.stringify({
    version, tag: `v${version}`, sourceRevision: sourceSha, targets: entries,
  })));
  for (const [name, bytes] of files) writeFileSync(join(directory, name), bytes);
  return files;
}
