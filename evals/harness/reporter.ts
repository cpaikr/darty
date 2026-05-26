import type { ToolExecution } from "./tool-trace.ts";

export const printFailedExecutions = (
  toolExecutions: readonly ToolExecution<string>[],
): void => {
  for (const execution of toolExecutions) {
    console.error(`  tool: ${execution.display}`);
    console.error(`  exitCode: ${execution.exitCode}`);
    if (execution.stderr.length > 0) {
      console.error(`  stderr: ${execution.stderr}`);
    }
  }
};

export const printFinalAnswer = (finalAnswer: string): void => {
  if (finalAnswer.length > 0) {
    console.error(`  finalAnswer: ${finalAnswer}`);
  }
};
