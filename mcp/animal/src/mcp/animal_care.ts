import { McpAgent } from 'agents/mcp';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { initialize } from '../../../shared/db_client';
import { registerAnimalCareTools } from '../tools/animal_care';

type Env = {
  ANIMAL_CARE_MCP_OBJECT: DurableObjectNamespace<McpAgent>;
  NEON_CONNECTION_STRING: { get(): string }
};

export class AnimalCareAgent extends McpAgent<Env> {
  server = new McpServer({ name: 'Animal Care MCP', version: '1.0.0' });

  async init() {
    const conn = await this.env.NEON_CONNECTION_STRING.get();
    initialize(conn);
    registerAnimalCareTools(this.server);
  }
}

// ––––––––––– Exports: basePath + handler –––––––––
export const basePath = '/mcp/animal_care';
export const handler  = AnimalCareAgent.mount(`${basePath}/sse`, { binding: 'ANIMAL_CARE_MCP_OBJECT'});
