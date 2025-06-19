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
          "You are a farmer bot that manages animal health. You recommend treatments based on past records and weight.",
      },
      mcpServers: [
        {
          name: 'animal care',
          url: 'https://animal.allenheltondev.workers.dev/mcp/animal_care/sse',
        },
      ],
      agentCard: {
        name: 'Animal Care Bot',
        description: 'Manage animal health through treatments and weight tracking',
        url: 'https://ai.allenheltondev.workers.dev/agents/ac',
        skills: [
          {
            id: 'ac',
            name: 'health management',
            description: 'Create and list weight tracking and animal treatments',
            examples: [
              "I gave Daisy her annual vaccines",
              'Has Leif had his shots this year?',
              "How much do my animals weigh right now",
              "Bruce weighed in at 7.8lbs",
            ],
            tags: ['animals'],
          },
        ],
      },
      options: {
        defaultTtlSeconds: 3600,
        registerAgent: true,
        enableCors: false,
        basePath: 'agents/ac',
      },
    };

    agent = await buildClaudeAgent(agentParams);
  }

  return agent;
}

export const basePath = '/agents/ac';

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
