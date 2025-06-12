import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { initialize as initDb } from '../../shared/db_client';
import { registerTools } from './tools';

type Env = {
  MCP_OBJECT: DurableObjectNamespace<McpAgent>;
  NEON_CONNECTION_STRING: { get(): string; };
};

export class MyMCP extends McpAgent<Env> {
  server = new McpServer({
    name: "Garden Buddy",
    version: "1.0.0",
  });

  async init() {
    const connectionString = await this.env.NEON_CONNECTION_STRING.get();
    initDb(connectionString);
    registerTools(this.server);
  }
}

const mcpHandler = MyMCP.mount("/sse");


export default {
  async fetch(request: Request, env: any, ctx: ExecutionContext) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/sse")) {
      return mcpHandler.fetch(request, env, ctx);
    }

    return new Response(
      `<html>
        <head><title>Uh oh</title></head>
        <body style="font-family: sans-serif;padding: 2rem;display: flex;flex-direction: column;align-items: center;">
          <img src="https://www.readysetcloud.io/images/logo.png" style="height:30px;"></img>
          <h1>Looking for something?</h1>
          <p>We couldn't find what you're looking for. Were you looking for an mcp server?</p>
        </body>
      </html>`,
      {
        status: 200,
        headers: {
          'Content-Type': 'text/html',
        },
      }
    );
  },
};
