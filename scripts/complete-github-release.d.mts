export interface ReleaseIdentity {
  tagName: string;
  targetCommitish: string;
  isDraft: boolean;
  isPrerelease: boolean;
  name: string;
  body: string;
  url: string;
}

export interface ReleaseInput {
  repository: string;
  sourceTag: string;
  sourceSha: string;
}

export interface GhResult {
  status: number;
  stdout: string;
  stderr: string;
}

export interface CompletionResult {
  disposition: "verified" | "created" | "verified-after-race";
  release: ReleaseIdentity;
}

export function verifyRelease(
  release: ReleaseIdentity,
  expected: Pick<ReleaseInput, "sourceTag" | "sourceSha">,
): ReleaseIdentity;

export function completeGitHubRelease(
  input: ReleaseInput,
  runGh: (args: string[]) => GhResult,
): CompletionResult;
