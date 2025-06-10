import Anthropic from "@anthropic-ai/sdk";
import { v4 as uuidv4 } from 'uuid';
import { AgentExecutor, IExecutionEventBus, RequestContext, schema } from '../a2a/server/index.js';
import type { BetaMessageParam } from "@anthropic-ai/sdk/resources/beta/messages/messages.mjs";
import { buildUpdate } from "../a2a/server/utils.js";

export class GardenAgent implements AgentExecutor {
  private claude: Anthropic;
  constructor(apiKey: string) {
    this.claude = new Anthropic({ apiKey });
  }

  async execute(requestContext: RequestContext, eventBus: IExecutionEventBus): Promise<void> {
    const userMessage = requestContext.userMessage;
    const existingTask = requestContext.task;

    const taskId = existingTask?.id || uuidv4();
    const contextId = userMessage.contextId || existingTask?.contextId || uuidv4();

    if (!existingTask) {
      const initialTask: schema.Task = {
        kind: 'task',
        id: taskId,
        contextId: contextId,
        status: {
          state: schema.TaskState.Submitted,
          timestamp: new Date().toISOString(),
        },
        history: [userMessage],
        metadata: userMessage.metadata,
        artifacts: []
      };
      await eventBus.publish(initialTask);
    }

    // 2. Publish "working" status update
    const workingUpdate = buildUpdate(taskId, contextId, schema.TaskState.Working, 'Processing message', false);
    await eventBus.publish(workingUpdate);

    try {
      const messages: BetaMessageParam[] = (existingTask?.history ?? [])
        .map(mapMessageToAnthropicFormat)
        .filter(m => m.content.length > 0);
      const incomingMessage = mapMessageToAnthropicFormat(userMessage);
      messages.push(incomingMessage);
      console.log(messages);

      const response = await this.claude.beta.messages.create({
        model: "claude-3-5-sonnet-latest",
        max_tokens: 1000,
        messages,
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

      const completedUpdate = buildUpdate(taskId, contextId, schema.TaskState.Completed, assistantText, true);
      eventBus.publish(completedUpdate);
    } catch (err: any) {
      console.error(`[GardenAgent] Error processing task ${taskId}:`, err);
      const errorUpdate = buildUpdate(taskId, contextId, schema.TaskState.Failed, `Agent error: ${err.message}`, true);
      eventBus.publish(errorUpdate);
    }
  }
}

function mapMessageToAnthropicFormat(m: schema.Message): BetaMessageParam {
  return {
    role: m.role === "agent" ? "assistant" : "user",
    content: m.parts
      .filter((p): p is schema.TextPart => p.kind === 'text' && !!(p as schema.TextPart).text)
      .map((p: any) => p.text)
      .join("\n"),
  };
}

export const agentCard: schema.AgentCard = {
  name: "Garden Agent",
  description:
    "An agent that tracks and updates garden information",
  url: "https://garden-agent.allenheltondev.workers.dev/",
  provider: {
    organization: "allenheltondev",
    url: 'https://readysetcloud.io'
  },
  version: "0.0.1",
  capabilities: {
    streaming: true,
    pushNotifications: false,
    stateTransitionHistory: true,
  },
  defaultInputModes: ["text"],
  defaultOutputModes: ["text"],
  skills: [
    {
      id: "manage_beds",
      name: "Manage beds",
      description: "List, add, remove, or edit garden beds",
      tags: ["garden bed", "crud"],
      examples: [
        "What garden beds do I have?",
        "Add a new garden bed called 'melon patch' that is 4x8 ft with full sun",
        "Remove the melon patch bed"
      ],
    },
    {
      id: "seed_catalog",
      name: "Seed catalog",
      description: "CRUD seeds the caller owns",
      tags: ["seeds", "crud"],
      examples: [
        "What seeds do I have?",
        "Add these seeds to my catalog {comma separated list}",
        "I used 20 carrot seeds"
      ]
    },
    {
      id: "manage_plants",
      name: "Manage plants",
      description: "CRUD plants in garden beds",
      tags: ["plants", "crud"],
      examples: [
        "Add yellow squash to the triangle garden bed",
        "Add an observation on the melon patch that some watermelons look dry",
        "List all the observations on my melon patch bed",
        "What should I plant in the melon patch that would go well with what I already have using the seeds I own"
      ]
    },
    {
      id: "harvest_manager",
      name: "Harvest manager",
      description: "Track harvests for garden beds",
      tags: ["harvest", "garden bed"],
      examples: [
        "I harvested 10 tomatoes from the salsa garden beds",
        "What has been my total yield from the garden?",
        "How many zucchinis have I harvested this year?"
      ]
    }
  ]
};
