import { McpAgent } from 'agents/mcp';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerLocationTools } from '../tools/location';
import { initialize } from '../../../shared/db_client';

type Env = {
  LOCATION_MCP_OBJECT: DurableObjectNamespace<McpAgent>;
  NEON_CONNECTION_STRING: { get(): string };
};

export class LocationAgent extends McpAgent<Env> {
  server = new McpServer({ name: 'Location MCP', version: '1.0.0' });

  async init() {
    const conn = await this.env.NEON_CONNECTION_STRING.get();
    initialize(conn);
    registerLocationTools(this.server);
  }
}

// ––––––––––– Exports: basePath + handler –––––––––
export const basePath = '/mcp/location';
export const handler = LocationAgent.mount(`${basePath}/sse`, { binding: 'LOCATION_MCP_OBJECT' });
