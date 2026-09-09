import { dartyExecutable } from "../surfaces/cli/executable.ts";

const commandTimeoutMs = 45_000;
const terminationGraceMs = 2_000;
const streamGraceMs = 2_000;
export type CliExecutionOptions = {
  readonly commandTimeoutMs?: number;
  readonly terminationGraceMs?: number;
  readonly streamGraceMs?: number;
};

const createDartyCliEnv = (): Record<string, string> => {
  const env: Record<string, string> = {};

  for (const key of [
    "ALL_PROXY",
    "APP_ENV",
    "DARTY_LOG_LEVEL",
    "HTTPS_PROXY",
    "HTTP_PROXY",
    "HOME",
    "LANG",
    "LC_ALL",
    "NODE_ENV",
    "NO_PROXY",
    "PATH",
    "SSL_CERT_FILE",
    "TMPDIR",
    "TMP",
    "TEMP",
  ]) {
    const value = process.env[key];
    if (value !== undefined) {
      env[key] = value;
    }
  }

  return env;
};

const collectStreamText = (stream: ReadableStream<Uint8Array>) => {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let text = "";
  const result = (async () => {
    try {
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) {
          return text + decoder.decode();
        }
        text += decoder.decode(chunk.value, { stream: true });
      }
    } finally {
      reader.releaseLock();
    }
  })();

  return {
    result,
    cancel: (reason?: unknown) => reader.cancel(reason),
  };
};

export const runCliProcess = async (
  repoRoot: string, argv: readonly string[], options: CliExecutionOptions = {},
): Promise<{ exitCode: number; stdout: string; stderr: string }> => {
  const proc = Bun.spawn({
    cmd: [dartyExecutable(repoRoot), ...argv],
    cwd: repoRoot,
    stdout: "pipe",
    stderr: "pipe",
    env: createDartyCliEnv(),
  });

  const stdoutCollector = collectStreamText(proc.stdout);
  const stderrCollector = collectStreamText(proc.stderr);

  let timeout: Timer | undefined;
  let timedOut = false;
  const completedExitCode = await Promise.race([
    proc.exited,
    new Promise<number>((resolve) => {
      timeout = setTimeout(() => {
        timedOut = true;
        proc.kill();
        resolve(124);
      }, options.commandTimeoutMs ?? commandTimeoutMs);
    }),
  ]);

  if (timeout !== undefined) {
    clearTimeout(timeout);
  }

  if (timedOut) {
    const terminated = await Promise.race([
      proc.exited.then(() => true),
      Bun.sleep(options.terminationGraceMs ?? terminationGraceMs).then(() => false),
    ]);
    if (!terminated) {
      proc.kill("SIGKILL");
      await proc.exited;
    }
  }

  const streamResults = Promise.all([
    stdoutCollector.result,
    stderrCollector.result,
  ] as const);
  const boundedOutput = await Promise.race([
    streamResults,
    Bun.sleep(options.streamGraceMs ?? streamGraceMs).then(() => null),
  ]);
  let output: readonly [string, string];
  if (boundedOutput === null) {
    timedOut = true;
    void stdoutCollector.cancel("subprocess stdout remained open").catch(() => undefined);
    void stderrCollector.cancel("subprocess stderr remained open").catch(() => undefined);
    output = await streamResults;
  } else {
    output = boundedOutput;
  }
  const [stdout, stderr] = output;

  return {
    exitCode: timedOut ? 124 : completedExitCode,
    stdout: stdout.trim(),
    stderr: [stderr.trim(), ...(timedOut ? ["CLI subprocess or stream deadline exceeded"] : [])].filter(Boolean).join("\n"),
  };
};
