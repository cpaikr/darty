import type {
  CreateAgentSessionOptions,
  ToolDefinition,
} from "@earendil-works/pi-coding-agent";

import { createDartyPiTool } from "../../src/pi.ts";

const tool = createDartyPiTool();
const assignedTool: ToolDefinition = tool;
const sessionOptions: Pick<CreateAgentSessionOptions, "customTools" | "tools"> = {
  customTools: [tool],
  tools: ["darty"],
};

void assignedTool;
void sessionOptions;
