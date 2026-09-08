export const version: string;
export const nodeTargets: string[];
export const sdkFiles: string[];
export function sha256(bytes: Uint8Array): string;
export function checkVersions(): void;
export function packNode(target: string, addon: string, directory: string): string;
