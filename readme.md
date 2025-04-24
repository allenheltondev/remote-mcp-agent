# Inline Agents Worker Configuration

This repository contains a simple Lambda function setup using LangChain to dynamically create an AI agent that consumes remote MCP servers.

## Remote MCP Server

The code for the MCP server is contained in the [mcp folder](/mcp). This server uses Cloudflare for hosting. **You must have a Cloudflare account to deploy it**.

Once your account is created and logged in, you can run the following commands to deploy the worker into Cloudflare:

```bash
cd mcp
npm run deploy
```

## Lambda functions

This solution also deploys four Lambda functions into AWS for agent support using SAM. To deploy the resources into your AWS account you can use the following commands:

```bash
sam build
sam deploy --guided
```

This will walk you through the deployment. Once deployed, you will have access to a public API that allows you to configure MCP servers for the agent to consume.

### AI Agent

The [AI agent](/functions/agent.mjs) uses LangChainjs to create an inline agent and give it the configured MCP servers. It uses OpenAI as the LLM to perform the tasks.

## Endpoints

The base url for your deployment is an output of the stack. You can prepend that to the following endpoints:

`POST /agent` - executes the agent and provides it a prompt passed in from the `message` body variable
`GET /servers` - returns an html page allowing you to configure MCP servers for your agent to consume (only SSE/remote servers are supported)
`POST /servers` - adds or updates a remote MCP server for your agent. This is called via the html page
`DELETE /servers/{name}` - removes a remote MCP server from your agent configuration
