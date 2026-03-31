import { Effect } from "effect";

import {
  dsab007Usage,
  runDsab007ContentsCommand,
} from "./cli/commands/search-dsab007.ts";

const usage = `${dsab007Usage}`;

const main = Effect.gen(function* () {
  const [command, ...rest] = process.argv.slice(2);

  if (command !== "dsab007-contents") {
    yield* Effect.sync(() => {
      console.error(usage);
    });
    return yield* Effect.fail(new Error("Unsupported command."));
  }

  yield* runDsab007ContentsCommand(rest);
});

Effect.runPromise(main).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
