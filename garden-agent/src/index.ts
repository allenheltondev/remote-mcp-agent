import { A2AServer, MomentoRequestHandler } from '../../a2a/server/index';
import { GardenAgent, agentCard } from '../../agents/garden.js';

type Env = {
  MOMENTO_API_KEY: { get(): Promise<string>; };
  ANTHROPIC_KEY: { get(): Promise<string>; };
};


class A2AWorker {
  private server!: A2AServer;

  async init(env: Env) {
    const momentoApiKey = await env.MOMENTO_API_KEY.get();
    const anthropicApiKey = await env.ANTHROPIC_KEY.get();

    const agentExecutor = new GardenAgent(anthropicApiKey);
    const requestHandler = new MomentoRequestHandler(
      agentCard,
      agentExecutor,
      {
        cacheName: 'mcp',
        momentoApiKey,
        waitForAgentOnTaskCancellation: true,
      },
    );

    this.server = new A2AServer(requestHandler);
  }

  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    if (!this.server) await this.init(env);
    return this.server.app().fetch(request, env, ctx);
  }
}

const worker = new A2AWorker();

export default {
  fetch: (req: Request, env: Env, ctx: ExecutionContext) =>
    worker.fetch(req, env, ctx),
} satisfies ExportedHandler<Env>;
