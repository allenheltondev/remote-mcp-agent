import { DynamoDBClient, QueryCommand } from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import { ChatOpenAI } from "@langchain/openai";
import { createReactAgent } from "@langchain/langgraph/prebuilt";

const ddb = new DynamoDBClient();
let client; // MCP client
let agent; // LangChain agent

export const handler = async (event) => {
  try {
    const { message } = JSON.parse(event.body);

    await setupAgent();
    const response = await agent.invoke({
      messages: [{ role: "user", content: message }],
    });

    return {
      statusCode: 200,
      body: JSON.stringify(response),
    };
  } catch (err) {
    console.error(err);
    if (client) {
      await client.close();
      client = null;
    }

    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};

const setupAgent = async () => {
  if (client && agent) return;

  const mcpServers = await loadMCPConfig();
  console.log(mcpServers);
  client = new MultiServerMCPClient({
    throwOnLoadError: true,
    prefixToolNameWithServerName: true,
    mcpServers,
  });


  const tools = await client.getTools();
  const model = new ChatOpenAI({
    modelName: "gpt-4o",
    temperature: 0,
  });

  agent = createReactAgent({
    llm: model,
    tools,
  });
};

const loadMCPConfig = async () => {
  const response = await ddb.send(new QueryCommand({
    TableName: process.env.TABLE_NAME,
    KeyConditionExpression: "pk = :pk AND begins_with(sk, :sk)",
    ExpressionAttributeValues: marshall({
      ":pk": "mcp",
      ":sk": "server#"
    })
  }));

  const config = {};

  for (const item of response.Items ?? []) {
    const { sk, url } = unmarshall(item);
    const name = sk.split("#")[1];

    config[name] = {
      transport: "sse",
      url,
      reconnection: {
        enabled: true,
        delay: 1000,
        maxAttempts: 10,
      },
    };
  }

  return config;
};

