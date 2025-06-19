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
          "You are a farmer bot that tracks animal yield. You know the industry terms for everything related to farm animals. You don't need to ask follow up questions or say what tools you'll be using."
      },
      mcpServers: [
        {
          name: 'production',
          url: 'https://animal.allenheltondev.workers.dev/mcp/animal_production/sse',
        },
      ],
      agentCard: {
        name: 'Animal Production Bot',
        description: 'Track animal production like egg count',
        url: 'https://ai.allenheltondev.workers.dev/agents/ap',
        skills: [
          {
            id: 'ap',
            name: 'track yield',
            description: 'CRU production yielded from animals',
            examples: [
              "I collected 12 chicken eggs today and 1 turkey egg",
              'How many eggs have I gotten this week?',
              "How much milk have I gotten from Rose?",
              "I got 1 quart of milk from Daisy yesterday",
            ],
            tags: ['animals'],
          },
        ],
      },
      options: {
        defaultTtlSeconds: 3600,
        registerAgent: true,
        enableCors: false,
        basePath: 'agents/ap',
      },
    };

    agent = await buildClaudeAgent(agentParams);
  }

  return agent;
}

export const basePath = '/agents/ap';

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
