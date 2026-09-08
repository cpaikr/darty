import { resolve } from "node:path";

/** DARTY_CLI selects an exact installed archive for the same eval harness. */
export const dartyExecutable = (repoRoot: string, env = process.env): string =>
  resolve(repoRoot, env.DARTY_CLI ?? "target/release/darty");
