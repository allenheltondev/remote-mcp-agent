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
          "You are a helpful bot that manages a seed catalog. You are an expert in horticulture and know everything about seeds from gardening at a master level. Add missing information if not provided.",
      },
      mcpServers: [
        {
          name: 'seed catalog',
          url: 'https://garden.allenheltondev.workers.dev/mcp/seed_catalog/sse',
        },
      ],
      agentCard: {
        name: 'Seed Catalog Bot',
        description: 'CRUD seeds the user owns',
        url: 'https://ai.allenheltondev.workers.dev/agents/sc',
        skills: [
          {
            id: 'sc',
            name: 'CRUD seeds in the catalog',
            description: 'Maintain a catalog of seeds available for planting',
            examples: [
              "Add clemson spineless to my catalog",
              'What do I have that would be a companion plant to tomatoes?',
              "I used 50 of the gardenia seeds"
            ],
            tags: ['seeds', 'plants'],
          },
        ],
      },
      options: {
        defaultTtlSeconds: 3600,
        registerAgent: true,
        enableCors: false,
        basePath: 'agents/sc',
      },
    };

    agent = await buildClaudeAgent(agentParams);
  }

  return agent;
}

export const basePath = '/agents/sc';

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
