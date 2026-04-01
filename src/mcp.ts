import { startDartyMcpServer } from "./mcp/server.ts";

const main = async (): Promise<void> => {
  await startDartyMcpServer();
};

main().catch((error) => {
  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error(String(error));
  }
  process.exitCode = 1;
});
