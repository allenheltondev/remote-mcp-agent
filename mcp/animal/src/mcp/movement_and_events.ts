import { McpAgent } from 'agents/mcp';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { initialize } from '../../../shared/db_client';
import { registerMovementAndEventsTools } from '../tools/movement_and_events';

type Env = {
  MOVEMENT_AND_EVENTS_MCP_OBJECT: DurableObjectNamespace<McpAgent>;
  NEON_CONNECTION_STRING: { get(): string }
};

export class MovementAndEventsAgent extends McpAgent<Env> {
  server = new McpServer({ name: 'Movement and Events MCP', version: '1.0.0' });

  async init() {
    const conn = await this.env.NEON_CONNECTION_STRING.get();
    initialize(conn);
    registerMovementAndEventsTools(this.server);
  }
}

// ––––––––––– Exports: basePath + handler –––––––––
export const basePath = '/mcp/movement_and_events';
export const handler  = MovementAndEventsAgent.mount(`${basePath}/sse`, { binding: 'MOVEMENT_AND_EVENTS_MCP_OBJECT'});
