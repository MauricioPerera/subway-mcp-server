#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerDelegateTools } from "./tools/delegate.js";

const server = new McpServer({
  name: "subway-mcp-server",
  version: "1.0.0"
});

registerDelegateTools(server);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("subway-mcp-server running via stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
