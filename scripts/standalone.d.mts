export interface Target {
  id: string;
  os: string;
  arch: string;
  bunTarget: string;
  executable: string;
  runner?: string;
}
export const targets: Target[];
export const version: string;
export function digest(bytes: Uint8Array): string;
export function archiveName(target: Target): string;
export function archiveFiles(files: { name: string; bytes: Buffer; mode: number }[]): Buffer;
export function renderInstallers(): Record<string, string>;
export function verifyBundle(directory: string, sourceSha?: string): {
  manifest: { version: string; tag: string; sourceRevision: string; targets: unknown[] };
  files: string[];
};
