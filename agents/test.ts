
import type { TaskContext } from "../a2a/server/handler.js";
export async function* TestAgent({ task, history, userMessage, isCancelled }: TaskContext) {
  const messages = (history ?? [])
    .map((m: any) => ({
      role: (m.role === "agent" ? "model" : "user"),
      content: m.parts
        .filter((p: any) => !!(p).text)
        .map((p: any) => ({ text: p.text })),
    }))
    .filter((m: any) => m.content.length > 0);

  if (messages.length === 0) {
    console.warn(`[TestAgent] No history/messages found for task ${task.id}`);
    yield {
      state: "failed",
      message: {
        role: "agent",
        parts: [{ type: "text", text: "No input message found." }],
      },
    };
    return;
  }

  yield {
    state: "working",
    message: {
      role: "agent",
      parts: [{ type: "text", text: "Starting work..." }],
    },
  };

  for (let i = 1; i <= 3; i++) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    yield {
      state: "working",
      message: {
        role: "agent",
        parts: [
          {
            type: "text",
            text: `Progress update: ${i * 20}% complete.`,
          },
        ],
      },
    };
  }

  yield {
    state: "completed",
    message: {
      role: "agent",
      parts: [
        {
          type: "text",
          text: "All steps completed successfully.",
        },
      ],
    },
  };
}

// --- Server Setup ---

export const agentCard = {
  name: "Test Agent",
  description:
    "An agent that provides progress updates once per second for 5 seconds.",
  url: "http://localhost:41241",
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
