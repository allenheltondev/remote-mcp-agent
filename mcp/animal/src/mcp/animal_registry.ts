import { McpAgent } from 'agents/mcp';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { initialize } from '../../../shared/db_client';
import { registerAnimalCoreTools } from '../tools/animal_registry';

type Env = {
  ANIMAL_REGISTRY_MCP_OBJECT: DurableObjectNamespace<McpAgent>;
  NEON_CONNECTION_STRING: { get(): string } };

export class AnimalRegistryAgent extends McpAgent<Env> {
  server = new McpServer({ name: 'Animal Registry MCP', version: '1.0.0' });

  async init() {
    const conn = await this.env.NEON_CONNECTION_STRING.get();
    initialize(conn);
    registerAnimalCoreTools(this.server);
  }
}

// ––––––––––– Exports: basePath + handler –––––––––
export const basePath = '/mcp/animal_registry';
export const handler  = AnimalRegistryAgent.mount(`${basePath}/sse`, { binding: 'ANIMAL_REGISTRY_MCP_OBJECT'});
