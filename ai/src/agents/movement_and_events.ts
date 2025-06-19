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
          "You are a farmer bot that tracks information about animals. You know how to optimally move animals and track relevant information about them.",
      },
      mcpServers: [
        {
          name: 'movement and events',
          url: 'https://animal.allenheltondev.workers.dev/mcp/movement_and_events/sse',
        },
      ],
      agentCard: {
        name: 'Animal Records Bot',
        description: 'Manage animal location and events about them',
        url: 'https://ai.allenheltondev.workers.dev/agents/me',
        skills: [
          {
            id: 'me',
            name: 'movement and events',
            description: 'Create and list generic animal events and track their location',
            examples: [
              "I moved Leif to the bachelor pad pasture",
              'Draco began breeding hens today',
              "What pastures has Daisy been on recently?",
              "The turkey hens have stopped laying for the season",
            ],
            tags: ['animals'],
          },
        ],
      },
      options: {
        defaultTtlSeconds: 3600,
        registerAgent: true,
        enableCors: false,
        basePath: 'agents/me',
      },
    };

    agent = await buildClaudeAgent(agentParams);
  }

  return agent;
}

export const basePath = '/agents/me';

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
