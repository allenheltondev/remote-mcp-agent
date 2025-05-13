import { A2AServer } from '../dist/a2a/server/index.js';

async function* TestAgent({ task, history }) {
  const messages = (history ?? [])
    .map((m) => ({
      role: (m.role === "agent" ? "model" : "user"),
      content: m.parts
        .filter((p) => !!(p).text)
        .map((p) => ({ text: p.text })),
    }))
    .filter((m) => m.content.length > 0);

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

  for (let i = 1; i <= 5; i++) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    yield {
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

const agentCard = {
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

const server = new A2AServer(TestAgent, {
  card: agentCard,
});

server.start(); // Default port 41241

console.log("[TestAgent] Server started on http://localhost:41241");
console.log("[TestAgent] Press Ctrl+C to stop the server");
