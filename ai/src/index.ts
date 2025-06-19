import * as agents from './agents';

const agentHandlers = Object.values(agents) as {
  basePath: string;
  handler: any;
}[];

export default {
  async fetch(req: Request, env: any, ctx: ExecutionContext) {
    const { pathname } = new URL(req.url);

    for (const mod of agentHandlers) {
      if (pathname.startsWith(mod.basePath)) {
        return mod.handler.fetch(req, env, ctx);
      }
    }

    return new Response('Not Found', { status: 404 });
  },
};
