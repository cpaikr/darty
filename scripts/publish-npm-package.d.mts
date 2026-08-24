export interface NpmPublicationInput {
  packageName: string;
  packageVersion: string;
}

export interface NpmResult {
  status: number;
  stdout: string;
  stderr: string;
}

export type NpmPublicationResult =
  | { disposition: "verified"; integrity: string }
  | { disposition: "published" };

export function completeNpmPublication(
  input: NpmPublicationInput,
  runNpm: (args: string[]) => NpmResult,
): NpmPublicationResult;
