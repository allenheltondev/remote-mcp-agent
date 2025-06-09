import { createAgent, agentCard } from "../dist/agents/garden.js";
import { A2AServer } from '../dist/a2a/server/server.js';

const agent = createAgent({ apiKey: process.env.ANTHROPIC });
const server = new A2AServer(agent, {
  card: agentCard
});

server.app();
