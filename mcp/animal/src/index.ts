import { api } from './api';
import * as mcpModules from './mcp';
import { initialize } from '../../shared/db_client';
export { LocationAgent } from './mcp/location';
export { ProductionAgent } from './mcp/production';
export { AnimalRegistryAgent } from './mcp/animal_registry';
export { AnimalCareAgent } from './mcp/animal_care';
export { MovementAndEventsAgent } from './mcp/movement_and_events';

let dbReady = false;

const mcpHandlers = Object.values(mcpModules) as {
	basePath: string;
	handler: ReturnType<typeof import('agents/mcp').McpAgent['mount']>;
}[];

export default {
	async fetch(req: Request, env: any, ctx: ExecutionContext){
		if(!dbReady){
			const conn = await env.NEON_CONNECTION_STRING.get();
			initialize(conn);
			dbReady = true;
		}

		const { pathname } = new URL(req.url);

		for (const mod of mcpHandlers) {
			if (pathname.startsWith(mod.basePath)) {
				return mod.handler.fetch(req, env, ctx);
			}
		}

		return api.fetch(req, env, ctx);
	},
};
