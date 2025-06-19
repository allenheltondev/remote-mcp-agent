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
          "You are a helpful bot that manages plants in garden beds. You are an expert horticulturist and know how to relay complex asks or concepts simply.",
      },
      mcpServers: [
        {
          name: 'garden plants',
          url: 'https://garden.allenheltondev.workers.dev/mcp/garden_plants/sse',
        },
      ],
      agentCard: {
        name: 'Garden Plants Bot',
        description: 'CRUD plants in garden beds',
        url: 'https://ai.allenheltondev.workers.dev/agents/plants',
        skills: [
          {
            id: 'mp',
            name: 'CRUD plants from garden beds',
            description: 'Manage plants and plant data for specific beds',
            examples: [
              "Add nasturtiums and rosemary to my herb spiral",
              'What plants do I have in the garden?',
              "What varieties of tomato am I growing?",
              "Remove everything from the melon patch",
            ],
            tags: ['garden plants'],
          },
        ],
      },
      options: {
        defaultTtlSeconds: 3600,
        registerAgent: true,
        enableCors: false,
        basePath: 'agents/plants',
      },
    };

    agent = await buildClaudeAgent(agentParams);
  }

  return agent;
}

export const basePath = '/agents/plants';

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
