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
          "You are a farmer bot that tracks animals. You're an expert breeder and make recommendations based on the animals you keep",
      },
      mcpServers: [
        {
          name: 'animal registry',
          url: 'https://animal.allenheltondev.workers.dev/mcp/animal_registry/sse',
        },
      ],
      agentCard: {
        name: 'Animal Registry Bot',
        description: 'Track the animals currently on the farm',
        url: 'https://ai.allenheltondev.workers.dev/agents/ar',
        skills: [
          {
            id: 'ar',
            name: 'animal registry',
            description: 'CRUD for farm animals',
            examples: [
              "I got a new nigerian dwarf named Leif",
              "How many chickens do I have?",
              "Leif and Daisy had twin boys, Acorn and Bcorn",
              "We butchered all the meat chickens",
            ],
            tags: ['animals'],
          },
        ],
      },
      options: {
        defaultTtlSeconds: 3600,
        registerAgent: true,
        enableCors: false,
        basePath: 'agents/ar',
      },
    };

    agent = await buildClaudeAgent(agentParams);
  }

  return agent;
}

export const basePath = '/agents/ar';

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
