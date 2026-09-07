export interface ReleaseIdentity {
  tagName: string;
  isDraft: boolean;
  isPrerelease: boolean;
  name: string;
  body: string;
  url: string;
  assets: { name: string }[];
}

export interface ReleaseInput {
  repository: string;
  sourceTag: string;
  sourceSha: string;
  directory: string;
}

export interface GhResult {
  status: number;
  stdout: string;
  stderr: string;
}

export interface CompletionResult {
  disposition: "verified-or-resumed" | "published";
  release: ReleaseIdentity;
}

export function verifyRelease(
  release: ReleaseIdentity,
  expected: Pick<ReleaseInput, "sourceTag">,
  allowDraft?: boolean,
): ReleaseIdentity;

export function completeGitHubRelease(
  input: ReleaseInput,
  runGh: (args: string[]) => GhResult,
): CompletionResult;
