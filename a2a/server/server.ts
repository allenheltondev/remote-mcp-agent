import { Hono } from "hono";
import { streamSSE } from 'hono/streaming';
import type { Context } from "hono";
import * as schema from "../schema.js";
import { TaskStore, TaskAndHistory, InMemoryTaskStore } from "./store.js";
import { A2AError } from "./error.js";
import { A2ARequestHandler } from "./request_handler/a2a_request_handler.js";
import { JsonRpcTransportHandler } from "./transports/jsonrpc_handler.js";

export class A2AServerOptions {
  basePath?: string;
}

export class A2AServer {
  private requestHandler: A2ARequestHandler;
  private transportHandler: JsonRpcTransportHandler;
  private basePath: string;

  constructor(requestHandler: A2ARequestHandler, options?: A2AServerOptions) {
    this.requestHandler = requestHandler;
    this.transportHandler = new JsonRpcTransportHandler(requestHandler);
    this.basePath = options?.basePath ?? '/';
  }

  app(): Hono {
    const app = new Hono();
    app.get('/.well-known/agent.json', async (c: Context) => {
      const agentCard = await this.requestHandler.getAgentCard();
      return c.json(agentCard);
    });

    app.post(this.basePath, async (c: Context) => {
      let request: any;

      try {
        request = await c.req.json();
        const rpcResponseOrStream = await this.transportHandler.handle(request);

        // Check if it's a stream
        if (typeof (rpcResponseOrStream as any)?.[Symbol.asyncIterator] === 'function') {
          const stream = rpcResponseOrStream as AsyncGenerator<schema.JSONRPCResult, void, undefined>;

          c.header('Content-Type', 'text/event-stream');
          c.header('Cache-Control', 'no-cache');
          c.header('Connection', 'keep-alive');

          return streamSSE(c, async (streamingResponse) => {
            try {
              for await (const event of stream) {
                streamingResponse.write(`id: ${Date.now()}\n`);
                streamingResponse.write(`data: ${JSON.stringify(event)}\n\n`);
              }
            } catch (streamError: any) {
              console.error(`Error during SSE streaming (request ${request?.id}):`, streamError);

              const a2aError = streamError instanceof A2AError
                ? streamError
                : A2AError.internalError(streamError.message || 'Streaming error.');

              const errorResponse: schema.JSONRPCErrorResponse = {
                jsonrpc: '2.0',
                id: request?.id || null,
                error: a2aError.toJSONRPCError(),
              };

              // Attempt to send SSE error event
              streamingResponse.write(`id: ${Date.now()}\n`);
              streamingResponse.write(`event: error\n`);
              streamingResponse.write(`data: ${JSON.stringify(errorResponse)}\n\n`);
            }
          });
        }

        // Otherwise, respond with a single JSON-RPC result
        const rpcResponse = rpcResponseOrStream as schema.A2AResponse;
        return c.json(rpcResponse, 200);

      } catch (error: any) {
        console.error('Unhandled error in POST handler:', error);

        const a2aError = error instanceof A2AError
          ? error
          : A2AError.internalError('General processing error.');

        const errorResponse: schema.JSONRPCErrorResponse = {
          jsonrpc: '2.0',
          id: request?.id || null,
          error: a2aError.toJSONRPCError(),
        };

        return c.json(errorResponse, 500);
      }
    });

    return app;
  }


}
