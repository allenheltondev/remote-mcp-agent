import { createMomentoAgent } from 'momento-a2a-agent';
import { buildClaudeAgent, ClaudeAgentParams } from '../utils/helpers';

type Env = {
  MOMENTO_API_KEY: { get(): Promise<string>; };
  ANTHROPIC_KEY: { get(): Promise<string>; };
};

let agent: Awaited<ReturnType<typeof createMomentoAgent>> | undefined;

async function getAgent(env: Env): Promise<ReturnType<typeof createMomentoAgent>> {
  if (!agent) {
    const agentParams: ClaudeAgentParams = {
      momento: {
        cacheName: 'mcp',
        apiKey: await env.MOMENTO_API_KEY.get(),
      },
      anthropic: {
        apiKey: await env.ANTHROPIC_KEY.get(),
        system_prompt:
          "You are a farmer that tracks pens and locations on the farm. Make recommendations for optimal layout and production when needed"
      },
      mcpServers: [
        {
          name: 'farm locations',
          url: 'https://animal.allenheltondev.workers.dev/mcp/location/sse',
        },
      ],
      agentCard: {
        name: 'Farm Location Bot',
        description: 'Manage pens, pastures, and locations',
        url: 'https://ai.allenheltondev.workers.dev/agents/fl',
        skills: [
          {
            id: 'fl',
            name: 'farm locations',
            description: 'CRUD pens, pastures, and locations',
            examples: [
              "List all the cattle pastures",
              'Get rid of the chicken tractor',
              "Remember that the inner pasture has a flooding issue",
              "Add a new pasture named 'outer pasture'"
            ],
            tags: ['farm'],
          },
        ],
      },
      options: {
        defaultTtlSeconds: 3600,
        registerAgent: true,
        enableCors: false,
        basePath: 'agents/fl',
      },
    };

    agent = await buildClaudeAgent(agentParams);
  }

  return agent;
}

export const basePath = '/agents/fl';

export const handler = {
  async fetch(req: Request, env: Env, ctx: ExecutionContext) {
    try {
      const agent = await getAgent(env);
      return agent.fetch(req, env, ctx);
    } catch (err: any) {
      console.error(JSON.stringify(err, null, 2));
      return new Response(err.message || 'Internal Error', { status: 500 });
    }
  },
};
