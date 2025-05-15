import { A2AServer } from '../../a2a/server/server';
import { TestAgent, agentCard } from '../../agents/test.js';
import { MomentoTaskStore } from '../../a2a/server/store';
import type { TaskHandler } from '../../a2a/server/handler';

type Env = {
  MOMENTO_API_KEY: { get(): Promise<string> };
};

class A2AWorker {
  private server!: A2AServer;

  async init(env: Env) {
    const apiKey = await env.MOMENTO_API_KEY.get();
    const store = new MomentoTaskStore('chatgpt', apiKey);
    this.server = new A2AServer(TestAgent as TaskHandler, {
      card: agentCard,
      taskStore: store,
    });
  }

  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (!this.server) {
      await this.init(env);
    }

    const app = this.server.app();
    return app.fetch(request, env, ctx);
  }
}

const worker = new A2AWorker();

export default {
  fetch: (req: Request, env: Env, ctx: ExecutionContext) => worker.fetch(req, env, ctx),
} satisfies ExportedHandler<Env>;
