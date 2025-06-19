# Remote MCP Agent

This repository implements a Model Context Protocol (MCP) agent that can be deployed as a remote service. The agent architecture is designed to work with Cloudflare Workers and integrates with various AI models and services.

## Project Structure

The project is organized into several key components:

- **garden-agent**: Implementation of the Garden Agent, which handles AI requests and responses
- **mcp/animal**: Animal-specific MCP implementation
- **mcp/garden**: Garden-specific MCP implementation
- **a2a**: Agent-to-Agent communication framework

## Key Features

- Integration with Momento for caching and state management
- Support for various AI models from providers like Meta (Llama), Hugging Face, and others
- Cloudflare Workers-based deployment
- R2 storage integration for object storage
- WebSocket support for real-time communication

## Technologies Used

- TypeScript
- Cloudflare Workers
- Momento Cache
- Various AI models including:
  - Meta Llama models (Llama 3, Llama 4 Scout)
  - Hugging Face models
  - Stability AI models
  - BAAI embedding models
  - And more

## Getting Started

To run this project, you'll need:

1. Cloudflare Workers account
2. Momento API key
3. Anthropic API key

## Environment Variables

The following environment variables are required:

- `MOMENTO_API_KEY`: API key for Momento cache
- `ANTHROPIC_KEY`: API key for Anthropic AI services

## Deployment

The agent is designed to be deployed as a Cloudflare Worker. The main entry point is in `garden-agent/src/index.ts`.

## Usage

The agent exposes an HTTP endpoint that can be called to interact with the MCP agent. The agent handles requests through the A2A (Agent-to-Agent) server implementation.

```typescript
// Example of how the agent is initialized
const agentExecutor = new GardenAgent(anthropicApiKey);
const requestHandler = new MomentoRequestHandler(
  agentCard,
  agentExecutor,
  {
    cacheName: 'mcp',
    momentoApiKey,
    waitForAgentOnTaskCancellation: true,
  },
);
```

## License

[Add license information here]