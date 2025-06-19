import { createMomentoAgent, CreateMomentoAgentOptions } from 'momento-a2a-agent';
import type { Message, Task } from 'momento-a2a-agent';
import Anthropic from "@anthropic-ai/sdk";
import { BetaMessageParam } from '@anthropic-ai/sdk/resources/beta.js';

export type ClaudeAgentParams = {
  momento: {
    apiKey: string;
    cacheName: string;
  },
  agentCard: {
    name: string;
    description: string;
    url: string;
    skills: AgentSkill[];
  };
  options?: CreateMomentoAgentOptions;
  mcpServers?: RemoteMCPServer[];
  anthropic: {
    apiKey: string;
    model?: string;
    max_tokens?: number;
    system_prompt?: string;
  };
};

export type RemoteMCPServer = {
  name: string;
  url: string;
};

export type AgentSkill = {
  id: string;
  name: string;
  description: string;
  examples: string[];
  tags: string[];
};

export async function buildClaudeAgent(params: ClaudeAgentParams): Promise<ReturnType<typeof createMomentoAgent>> {
  const claude = new Anthropic({ apiKey: params.anthropic.apiKey });

  const handler = async (message: Message, { task }: { task: Task; }): Promise<string> => {
    const messages: BetaMessageParam[] = (task?.history ?? [])
      .map(mapMessageToAnthropicFormat)
      .filter(m => m.content.length > 0);
    const incomingMessage = mapMessageToAnthropicFormat(message);
    messages.push(incomingMessage);

    const response = await claude.beta.messages.create({
      model: params.anthropic.model ?? "claude-3-5-sonnet-latest",
      max_tokens: params.anthropic.max_tokens ?? 1000,
      messages,
      mcp_servers: params.mcpServers?.map(server => { return { type: 'url', name: server.name, url: server.url }; }) ?? [],
      betas: ["mcp-client-2025-04-04"],
      ...params.anthropic.system_prompt && { system: params.anthropic.system_prompt }
    });

    const assistantText =
      typeof response.content === "string"
        ? response.content
        : response.content
          .filter((b: any) => b.type === "text")
          .map((b: any) => b.text)
          .join("\n");

    return assistantText;
  };

  function mapMessageToAnthropicFormat(m: Message): BetaMessageParam {
    return {
      role: m.role === "agent" ? "assistant" : "user",
      content: m.parts
        .filter((p: any) => p.kind === 'text' && !!p.text)
        .map((p: any) => p.text)
        .join("\n"),
    };
  }
  const momentoAgent = await createMomentoAgent({
    cacheName: params.momento.cacheName,
    apiKey: params.momento.apiKey,
    skills: params.agentCard.skills,
    handler,
    agentCard: params.agentCard,
    options: {
      defaultTtlSeconds: 3600,
      registerAgent: true,
      enableCors: false,
      ...params.options
    }
  });

  return momentoAgent;
}
