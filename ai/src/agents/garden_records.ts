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
          "You are a helpful bot that manages garden harvests and observations. Add helpful intuition when prompted with vague instruction. You don't ask follow up questions.",
      },
      mcpServers: [
        {
          name: 'garden records',
          url: 'https://garden.allenheltondev.workers.dev/mcp/garden_records/sse',
        },
      ],
      agentCard: {
        name: 'Garden Records Bot',
        description: 'Record and view harvests and observations for garden beds',
        url: 'https://ai.allenheltondev.workers.dev/agents/gr',
        skills: [
          {
            id: 'mgr',
            name: 'Log and view harvests/observations',
            description: 'Create and view harvests and observations for garden beds',
            examples: [
              "I harvested 10 okra from the okra patch",
              'What is my total yield this year?',
              "I noticed some yellowing in the watermelon leaves",
              "What have I noticed in the melon patch?",
            ],
            tags: ['garden records'],
          },
        ],
      },
      options: {
        defaultTtlSeconds: 3600,
        registerAgent: true,
        enableCors: false,
        basePath: 'agents/gr',
      },
    };

    agent = await buildClaudeAgent(agentParams);
  }

  return agent;
}

export const basePath = '/agents/gr';

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
