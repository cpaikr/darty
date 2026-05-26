export const runFixedDartyCli = (input: {
  readonly repoRoot: string;
  readonly argv: readonly string[];
  readonly env?: Record<string, string | undefined>;
}): ReturnType<typeof Bun.spawnSync> =>
  Bun.spawnSync({
    cmd: [process.execPath, "run", "src/cli.ts", ...input.argv],
    cwd: input.repoRoot,
    stdout: "pipe",
    stderr: "pipe",
    env: input.env ?? process.env,
  });
