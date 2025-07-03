import { AmazonBedrockOrchestrator } from 'momento-a2a-agent';

export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body);
    const orchestrator = new AmazonBedrockOrchestrator({
      momento: {
        cacheName: 'mcp',
        apiKey: process.env.MOMENTO_AUTH_TOKEN,
      },
      config: {
        maxTokens: 2000,
        debug: true
      }
    });

    orchestrator.registerAgents([
      'https://ai.allenheltondev.workers.dev/agents/ap', 'https://ai.allenheltondev.workers.dev/agents/ar',
      'https://ai.allenheltondev.workers.dev/agents/gb', 'https://ai.allenheltondev.workers.dev/agents/gr'
    ]);
    const result = await orchestrator.sendMessage({
      message: body.message,
      contextId: 'allen'
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ message: result }),
      headers: { 'Content-Type': 'application/json' }

    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Something went wrong' }),
      headers: { 'Content-Type': 'application/json' }
    };
  }
};
