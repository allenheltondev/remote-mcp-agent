import Anthropic from "@anthropic-ai/sdk";
import type { TaskContext, TaskHandler, TaskYieldUpdate } from "../a2a/server/handler.js";
import type { Message } from "../a2a/schema.js";
import type { BetaMessageParam } from "@anthropic-ai/sdk/resources/beta/messages/messages.mjs";

export function createAgent(opts: { apiKey: string; }): TaskHandler {
  const claude = new Anthropic({ apiKey: opts.apiKey });

  const agent: TaskHandler = async function* GardenAgent(
    { history, userMessage }: TaskContext,
  ): AsyncGenerator<TaskYieldUpdate, void, unknown> {

    try {
      const messages: BetaMessageParam[] = (history ?? [])
        .map(mapMessageToAnthropicFormat)
        .filter(m => m.content.length > 0);

      const response = await claude.beta.messages.create({
        model: "claude-3-5-sonnet-latest",
        max_tokens: 1000,
        messages: [...messages, mapMessageToAnthropicFormat(userMessage)],
        mcp_servers: [
          {
            type: "url",
            url: "https://mcp.allenheltondev.workers.dev/sse",
            name: "garden-tools",
          },
        ],
        betas: ["mcp-client-2025-04-04"],
      });

      const assistantText =
        typeof response.content === "string"
          ? response.content
          : response.content
            .filter((b: any) => b.type === "text")
            .map((b: any) => b.text)
            .join("\n");

      yield {
        state: "completed",
        message: {
          role: "agent",
          parts: [{ type: "text", text: assistantText }],
        },
      };
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  return agent;
}

function mapMessageToAnthropicFormat(m: Message): BetaMessageParam {
  return {
    role: m.role === "agent" ? "assistant" : "user",
    content: m.parts
      .filter((p: any) => p.text)
      .map((p: any) => p.text)
      .join("\n"),
  };
}


export const agentCard = {
  name: "Garden Agent",
  description:
    "An agent that tracks and updates garden information",
  url: "https://garden-agent.allenheltondev.workers.dev/",
  provider: {
    organization: "allenheltondev",
  },
  version: "0.0.1",
  capabilities: {
    streaming: true,
    pushNotifications: false,
    stateTransitionHistory: true,
  },
  authentication: null,
  defaultInputModes: ["text"],
  defaultOutputModes: ["text"],
  skills: [
    {
      id: "progress_updates",
      name: "Progress Updates",
      description:
        "Yields periodic progress messages to demonstrate streaming behavior.",
      tags: ["progress", "status", "streaming"],
      examples: [
        "Show me progress over time.",
        "Simulate a multi-step process with updates.",
      ],
    },
  ],
};
