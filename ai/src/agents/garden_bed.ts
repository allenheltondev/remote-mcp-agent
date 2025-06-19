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
          'You are a helpful bot that manages garden beds. You give back direct answers that offer enough information to answer follow up questions.',
      },
      mcpServers: [
        {
          name: 'garden beds',
          url: 'https://garden.allenheltondev.workers.dev/mcp/garden_beds/sse',
        },
      ],
      agentCard: {
        name: 'Garden Bed Bot',
        description: 'CRU operations for garden bed objects',
        url: 'https://ai.allenheltondev.workers.dev/agents/gb',
        skills: [
          {
            id: 'mgb',
            name: 'Maintain garden beds',
            description: 'CRU operations for garden beds.',
            examples: [
              "Add a garden bed named 'melon patch' that's in full sun, hard clay soil, rectangle shape, on the east side",
              'List my garden beds',
              "What plants are in 'bed 1'",
              "I amended the 'butterfly garden' with heavy compost",
            ],
            tags: ['garden beds'],
          },
        ],
      },
      options: {
        defaultTtlSeconds: 3600,
        registerAgent: true,
        enableCors: false,
        basePath: 'agents/gb',
      },
    };

    agent = await buildClaudeAgent(agentParams);
  }

  return agent;
}

export const basePath = '/agents/gb';

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
