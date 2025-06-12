import { McpAgent } from 'agents/mcp';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerProductionTools } from '../tools/production';
import { initialize } from '../../../shared/db_client';

type Env = {
  PRODUCTION_MCP_OBJECT: DurableObjectNamespace<McpAgent>;
  NEON_CONNECTION_STRING: { get(): string };
};

export class ProductionAgent extends McpAgent<Env> {
  server = new McpServer({ name: 'Animal Production MCP', version: '1.0.0' });

  async init() {
    const conn = await this.env.NEON_CONNECTION_STRING.get();
    initialize(conn);
    registerProductionTools(this.server);
  }
}

// ––––––––––– Exports: basePath + handler –––––––––
export const basePath = '/mcp/animal_production';
export const handler = ProductionAgent.mount(`${basePath}/sse`, { binding: 'PRODUCTION_MCP_OBJECT' });
