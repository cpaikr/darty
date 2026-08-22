#!/usr/bin/env node

import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);

if (process.platform !== "darwin" || process.arch !== "arm64") {
  console.error(`The Darty vertical candidate has no native executable for ${process.platform}-${process.arch}.`);
  process.exit(1);
}

const packageJson = require.resolve("@sjunepark/darty-darwin-arm64/package.json");
const executable = join(dirname(packageJson), "darty");
const child = spawn(executable, process.argv.slice(2), { stdio: "inherit" });

const signalHandlers = new Map(
  ["SIGINT", "SIGTERM"].map((signal) => [signal, () => child.kill(signal)]),
);
for (const [signal, handler] of signalHandlers) process.on(signal, handler);

child.once("error", (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
child.once("exit", (code, signal) => {
  if (signal !== null) {
    for (const [registeredSignal, handler] of signalHandlers) {
      process.removeListener(registeredSignal, handler);
    }
    process.kill(process.pid, signal);
  }
  else process.exitCode = code ?? 1;
});
