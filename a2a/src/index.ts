import { OpenAIOrchestrator } from 'momento-a2a-agent';

type OrchestratorMessage = {
	message: string,
	contextId?: string;
};

let orchestrator: OpenAIOrchestrator | undefined;
export default {
	async fetch(request: Request, env: any, ctx: ExecutionContext): Promise<Response> {
		if (!orchestrator) {
			orchestrator = new OpenAIOrchestrator({
				momento: {
					cacheName: 'mcp',
					apiKey: await env.MOMENTO_API_KEY.get()
				},
				openai: {
					apiKey: await env.OPENAI_API_KEY.get()
				},
				agentLoadingConcurrency: 1
			});
			orchestrator.registerAgents([
				'https://ai.allenheltondev.workers.dev/agents/ac',
				'https://ai.allenheltondev.workers.dev/agents/ar',
				'https://ai.allenheltondev.workers.dev/agents/gb',
				'https://ai.allenheltondev.workers.dev/agents/gr',
				'https://ai.allenheltondev.workers.dev/agents/fl',
				'https://ai.allenheltondev.workers.dev/agents/me',
				'https://ai.allenheltondev.workers.dev/agents/plants',
				'https://ai.allenheltondev.workers.dev/agents/ap',
				'https://ai.allenheltondev.workers.dev/agents/sc'
			]);
		}

		const body = await request.json() as OrchestratorMessage;
		if (!body.message) {
			return Response.json({ message: 'Missing message in request body' }, { status: 400 });
		}
		try {
			const response = await orchestrator.sendMessage({
				message: body.message,
				...body.contextId && { contextId: body.contextId }
			});
			return Response.json({ text: response });
		} catch (err: any) {
			console.error(err);
			return Response.json({ message: 'Something went wrong', error: err.message }, { status: 500 });
		}
	},
} satisfies ExportedHandler<Env>;
