import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));

const safePathPart = (value: string): string =>
  value.replace(/[^A-Za-z0-9._-]+/gu, "-").replace(/^-+|-+$/gu, "") || "artifact";

const timestamp = (): string => new Date().toISOString().replace(/[:.]/gu, "-");

export type EvalArtifactWriter = {
  readonly runDir: string;
  readonly writeScenario: (scenarioId: string, artifact: unknown) => Promise<string>;
};

export const createEvalArtifactWriter = async (input: {
  readonly suite: string;
  readonly rootDir?: string;
}): Promise<EvalArtifactWriter> => {
  const rootDir = input.rootDir ?? join(repoRoot, ".tmp", "evals");
  const runDir = join(rootDir, safePathPart(input.suite), timestamp());
  await mkdir(runDir, { recursive: true });

  return {
    runDir,
    writeScenario: async (scenarioId, artifact) => {
      const path = join(runDir, `${safePathPart(scenarioId)}.json`);
      await writeFile(path, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
      return path;
    },
  };
};
