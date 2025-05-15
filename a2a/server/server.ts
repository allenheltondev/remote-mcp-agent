import { Hono } from "hono";
import { streamSSE } from 'hono/streaming';
import type { Context } from "hono";
import * as schema from "../schema.js";
import { TaskStore, TaskAndHistory, InMemoryTaskStore } from "./store.js";
import { TaskHandler, TaskContext as OldTaskContext } from "./handler.js";
import { A2AError } from "./error.js";
import { getCurrentTimestamp, isTaskStatusUpdate, isArtifactUpdate } from "./utils.js";

export interface A2AServerOptions {
  taskStore?: TaskStore;
  basePath?: string;
  card?: schema.AgentCard;
}

export interface TaskContext extends Omit<OldTaskContext, "taskStore"> { }

export class A2AServer {
  private taskHandler: TaskHandler;
  private taskStore: TaskStore;
  private basePath: string;
  private activeCancellations: Set<string> = new Set();
  card!: schema.AgentCard;

  constructor(handler: TaskHandler, options: A2AServerOptions = {}) {
    this.taskHandler = handler;
    this.taskStore = options.taskStore ?? new InMemoryTaskStore();

    // Make sure base path starts and ends with a slash if it's not just "/"
    this.basePath = options.basePath ?? "/";
    if (this.basePath !== "/") {
      this.basePath = `/${this.basePath.replace(/^\/|\/$/g, "")}/`;
    }

    if (options.card) this.card = options.card;
  }

  app(): Hono {
    const app = new Hono();
    app.get('/.well-known/agent.json', (c) => c.json(this.card));

    app.post(this.basePath, async (c: Context) => {
      const requestBody = await c.req.json();
      if (!this.isValidJsonRpcRequest(requestBody)) {
        return c.json(this.createErrorResponse(null, A2AError.invalidRequest('Invalid JSON-RPC request.')));
      }

      const id = requestBody.id;
      const method = requestBody.method;
      const params = requestBody.params as schema.TaskSendParams;
      try {
        switch (method) {
          case 'tasks/send': {
            const result = await this.handleTaskSend(id, params);
            return c.json(this.createSuccessResponse(id, result));
          }
          case 'tasks/sendSubscribe': {
            return this.handleTaskSendSubscribe(c, id, params);
          }
          case 'tasks/get': {
            const result = await this.handleTaskGet(params);
            return c.json(this.createSuccessResponse(id, result));
          }
          case 'tasks/cancel': {
            const result = await this.handleTaskCancel(params);
            return c.json(this.createSuccessResponse(id, result));
          }
          default:
            return c.json(this.createErrorResponse(id, A2AError.methodNotFound(method)));
        }
      } catch (err) {
        return c.json(this.normalizeError(err, id));
      }
    });

    return app;
  }

  private async handleTaskSend(requestId: string | number | null | undefined, params: schema.TaskSendParams): Promise<schema.Task> {
    this.validateTaskSendParams(params);
    const { id, message, sessionId, metadata } = params;
    let currentData = await this.loadOrCreateTaskAndHistory(id, message, sessionId, metadata);
    const context = this.createTaskContext(currentData.task, message, currentData.history);
    const generator = this.taskHandler(context);

    try {
      for await (const yieldValue of generator) {
        currentData = this.applyUpdateToTaskAndHistory(currentData, yieldValue);
        await this.taskStore.save(currentData);
        context.task = currentData.task;
      }
    } catch (err) {
      const failureStatusUpdate: Omit<schema.TaskStatus, "timestamp"> = {
        state: "failed",
        message: {
          role: "agent",
          parts: [
            {
              text: `Handler failed: ${err instanceof Error ? err.message : String(err)}`,
              type: 'text'
            },
          ],
        },
      };
      currentData = this.applyUpdateToTaskAndHistory(currentData, failureStatusUpdate);
      try {
        await this.taskStore.save(currentData);
      } catch (saveError) {
        console.error(`Failed to save task ${id} after handler error:`, saveError);
      }
      throw this.normalizeError(err, requestId, id);
    }

    return currentData.task;
  }

  private handleTaskSendSubscribe(context: Context, id: string | number | null | undefined, params: schema.TaskSendParams): Response {
    this.validateTaskSendParams(params);
    const { message, sessionId, metadata } = params;
    const taskId = params.id;

    return streamSSE(context, async (stream) => {
      let currentData = await this.loadOrCreateTaskAndHistory(
        taskId,
        message,
        sessionId,
        metadata
      );

      const context = this.createTaskContext(
        currentData.task,
        message,
        currentData.history
      );

      const generator = this.taskHandler(context);

      let lastEventWasFinal = false;

      try {
        for await (const yieldValue of generator) {
          currentData = this.applyUpdateToTaskAndHistory(currentData, yieldValue);
          await this.taskStore.save(currentData);
          context.task = currentData.task;

          let event: schema.TaskStatusUpdateEvent | schema.TaskArtifactUpdateEvent;
          let isFinal = false;

          if (isTaskStatusUpdate(yieldValue)) {
            const terminalStates: schema.TaskState[] = ['completed', 'failed', 'canceled', 'input-required'];
            isFinal = terminalStates.includes(currentData.task.status.state);
            event = this.createTaskStatusEvent(taskId, currentData.task.status, isFinal);
          } else if (isArtifactUpdate(yieldValue)) {
            const updatedArtifact = currentData.task.artifacts?.find(
              (a) =>
                (a.index !== undefined && a.index === yieldValue.index) ||
                (a.name && a.name === yieldValue.name)
            ) ?? yieldValue;
            event = this.createTaskArtifactEvent(taskId, updatedArtifact, false);
          } else {
            console.warn('[SSE] Handler yielded unknown value:', yieldValue);
            continue;
          }

          const response = this.createSuccessResponse(id, event);
          await stream.write(`data: ${JSON.stringify(response)}\n\n`);
          lastEventWasFinal = isFinal;

          if (isFinal) break;
        }

        if (!lastEventWasFinal) {
          const finalStates: schema.TaskState[] = ['completed', 'failed', 'canceled', 'input-required'];
          if (!finalStates.includes(currentData.task.status.state)) {
            currentData = this.applyUpdateToTaskAndHistory(currentData, { state: 'completed' });
            await this.taskStore.save(currentData);
          }
          const finalEvent = this.createTaskStatusEvent(taskId, currentData.task.status, true);
          const finalResponse = this.createSuccessResponse(id, finalEvent);
          await stream.write(`data: ${JSON.stringify(finalResponse)}\n\n`);
        }
      } catch (err) {
        console.error(`[SSE ${taskId}] Error:`, err);
        const failureUpdate: schema.TaskStatus = {
          state: 'failed',
          timestamp: getCurrentTimestamp(),
          message: {
            role: 'agent',
            parts: [{ type: 'text', text: `Handler failed: ${err instanceof Error ? err.message : String(err)}` }],
          },
        };
        currentData = this.applyUpdateToTaskAndHistory(currentData, failureUpdate);
        await this.taskStore.save(currentData);
        const errorEvent = this.createTaskStatusEvent(taskId, currentData.task.status, true);
        const errorResponse = this.createSuccessResponse(id, errorEvent);
        await stream.write(`data: ${JSON.stringify(errorResponse)}\n\n`);
      }
    });
  }

  private applyUpdateToTaskAndHistory(current: TaskAndHistory, update: Omit<schema.TaskStatus, "timestamp"> | schema.Artifact): TaskAndHistory {
    let newTask = { ...current.task };
    let newHistory = [...current.history];

    if (isTaskStatusUpdate(update)) {
      newTask.status = {
        ...newTask.status,
        ...update,
        timestamp: getCurrentTimestamp(),
      };

      if (update.message?.role === "agent") {
        newHistory.push(update.message);
      }
    } else if (isArtifactUpdate(update)) {
      if (!newTask.artifacts) {
        newTask.artifacts = [];
      } else {
        newTask.artifacts = [...newTask.artifacts];
      }

      const existingIndex = update.index ?? -1;
      let replaced = false;

      if (existingIndex >= 0 && existingIndex < newTask.artifacts.length) {
        const existingArtifact = newTask.artifacts[existingIndex];
        if (update.append) {
          const appendedArtifact = JSON.parse(JSON.stringify(existingArtifact));
          appendedArtifact.parts.push(...update.parts);
          if (update.metadata) {
            appendedArtifact.metadata = {
              ...(appendedArtifact.metadata || {}),
              ...update.metadata,
            };
          }
          if (update.lastChunk !== undefined)
            appendedArtifact.lastChunk = update.lastChunk;
          if (update.description)
            appendedArtifact.description = update.description;
          newTask.artifacts[existingIndex] = appendedArtifact;
          replaced = true;
        } else {
          newTask.artifacts[existingIndex] = { ...update };
          replaced = true;
        }
      } else if (update.name) {
        const namedIndex = newTask.artifacts.findIndex((a) => a.name === update.name);
        if (namedIndex >= 0) {
          newTask.artifacts[namedIndex] = { ...update };
          replaced = true;
        }
      }

      if (!replaced) {
        newTask.artifacts.push({ ...update });
        if (newTask.artifacts.some((a) => a.index !== undefined)) {
          newTask.artifacts.sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
        }
      }
    }

    return { task: newTask, history: newHistory };
  }

  private async handleTaskGet(params: schema.TaskSendParams): Promise<schema.Task> {
    const { id } = params;
    const data = await this.taskStore.load(id);
    if (!data) throw A2AError.taskNotFound(id);
    return data.task;
  }

  private async handleTaskCancel(params: schema.TaskSendParams): Promise<schema.Task> {
    const { id } = params;
    let data = await this.taskStore.load(id);
    if (!data) throw A2AError.taskNotFound(id);

    const finalStates: schema.TaskState[] = ['completed', 'failed', 'canceled'];
    if (finalStates.includes(data.task.status.state)) {
      console.log(`Task ${id} already in final state ${data.task.status.state}, cannot cancel.`);
      return data.task;
    }

    this.activeCancellations.add(id);
    const cancelUpdate: schema.TaskStatus = {
      state: 'canceled',
      timestamp: getCurrentTimestamp(),
      message: {
        role: 'agent',
        parts: [{ type: 'text', text: 'Task cancelled by request.' }],
      },
    };
    data = this.applyUpdateToTaskAndHistory(data, cancelUpdate);
    await this.taskStore.save(data);
    this.activeCancellations.delete(id);
    return data.task;
  }

  private async loadOrCreateTaskAndHistory(
    taskId: string,
    initialMessage: schema.Message,
    sessionId?: string | null, // Allow null
    metadata?: Record<string, unknown> | null // Allow null
  ): Promise<TaskAndHistory> {
    let data = await this.taskStore.load(taskId);
    let needsSave = false;

    if (!data) {
      // Create new task and history
      const initialTask: schema.Task = {
        id: taskId,
        sessionId: sessionId ?? undefined, // Store undefined if null
        status: {
          state: "submitted", // Start as submitted
          timestamp: getCurrentTimestamp(),
          message: null, // Initial user message goes only to history for now
        },
        artifacts: [],
        metadata: metadata ?? undefined, // Store undefined if null
      };
      const initialHistory: schema.Message[] = [initialMessage]; // History starts with user message
      data = { task: initialTask, history: initialHistory };
      needsSave = true; // Mark for saving
      console.log(`[Task ${taskId}] Created new task and history.`);
    } else {
      console.log(`[Task ${taskId}] Loaded existing task and history.`);
      // Add current user message to history
      // Make a copy before potentially modifying
      data = { task: data.task, history: [...data.history, initialMessage] };
      needsSave = true; // History updated, mark for saving

      // Handle state transitions for existing tasks
      const finalStates: schema.TaskState[] = [
        "completed",
        "failed",
        "canceled",
      ];
      if (finalStates.includes(data.task.status.state)) {
        console.warn(
          `[Task ${taskId}] Received message for task already in final state ${data.task.status.state}. Handling as new submission (keeping history).`
        );
        // Option 1: Reset state to 'submitted' (keeps history, effectively restarts)
        const resetUpdate: Omit<schema.TaskStatus, "timestamp"> = {
          state: "submitted",
          message: null, // Clear old agent message
        };
        data = this.applyUpdateToTaskAndHistory(data, resetUpdate);
        // needsSave is already true

        // Option 2: Throw error (stricter)
        // throw A2AError.invalidRequest(`Task ${taskId} is already in a final state.`);
      } else if (data.task.status.state === "input-required") {
        console.log(
          `[Task ${taskId}] Received message while 'input-required', changing state to 'working'.`
        );
        // If it was waiting for input, update state to 'working'
        const workingUpdate: Omit<schema.TaskStatus, "timestamp"> = {
          state: "working",
        };
        data = this.applyUpdateToTaskAndHistory(data, workingUpdate);
        // needsSave is already true
      } else if (data.task.status.state === "working") {
        // If already working, maybe warn but allow? Or force back to submitted?
        console.warn(
          `[Task ${taskId}] Received message while already 'working'. Proceeding.`
        );
        // No state change needed, but history was updated, so needsSave is true.
      }
      // If 'submitted', receiving another message might be odd, but proceed.
    }

    // Save if created or modified before returning
    if (needsSave) {
      await this.taskStore.save(data);
    }

    // Return copies to prevent mutation by caller before handler runs
    return { task: { ...data.task }, history: [...data.history] };
  }

  // Update context creator to accept and include history
  private createTaskContext(
    task: schema.Task,
    userMessage: schema.Message,
    history: schema.Message[] // Add history parameter
  ): TaskContext {
    return {
      task: { ...task }, // Pass a copy
      userMessage: userMessage,
      history: [...history], // Pass a copy of the history
      isCancelled: () => this.activeCancellations.has(task.id),
      // taskStore is removed
    };
  }

  private isValidJsonRpcRequest(body: any): body is schema.JSONRPCRequest {
    return (
      typeof body === "object" &&
      body !== null &&
      body.jsonrpc === "2.0" &&
      typeof body.method === "string" &&
      (body.id === null ||
        typeof body.id === "string" ||
        typeof body.id === "number") && // ID is required for requests needing response
      (body.params === undefined ||
        typeof body.params === "object" || // Allows null, array, or object
        Array.isArray(body.params))
    );
  }

  private validateTaskSendParams(params: any): asserts params is schema.TaskSendParams {
    if (!params || typeof params !== "object") {
      throw A2AError.invalidParams("Missing or invalid params object.");
    }
    if (typeof params.id !== "string" || params.id === "") {
      throw A2AError.invalidParams("Invalid or missing task ID (params.id).");
    }
    if (!params.message || typeof params.message !== "object" || !Array.isArray(params.message.parts)) {
      throw A2AError.invalidParams("Invalid or missing message object (params.message).");
    }
  }

  private createSuccessResponse<T>(id: number | string | null | undefined, result: T): schema.JSONRPCResponse<T> {
    if (id === null) {
      throw A2AError.internalError("Cannot create success response for null ID.");
    }
    return {
      jsonrpc: "2.0",
      id: id,
      result: result,
    };
  }

  private createErrorResponse(id: number | string | null | undefined, error: schema.JSONRPCError<unknown>): schema.JSONRPCResponse<null, unknown> {
    return {
      jsonrpc: "2.0",
      id: id,
      error: error,
    };
  }

  private normalizeError(error: any, reqId: number | string | null | undefined, taskId?: string): schema.JSONRPCResponse<null, unknown> {
    let a2aError: A2AError;
    if (error instanceof A2AError) {
      a2aError = error;
    } else if (error instanceof Error) {
      a2aError = A2AError.internalError(error.message, { stack: error.stack });
    } else {
      a2aError = A2AError.internalError("An unknown error occurred.", error);
    }

    if (taskId && !a2aError.taskId) {
      a2aError.taskId = taskId;
    }

    console.error(
      `Error processing request (Task: ${a2aError.taskId ?? "N/A"}, ReqID: ${reqId ?? "N/A"
      }):`,
      a2aError
    );

    return this.createErrorResponse(reqId, a2aError.toJSONRPCError());
  }

  private createTaskStatusEvent(
    taskId: string,
    status: schema.TaskStatus,
    final: boolean
  ): schema.TaskStatusUpdateEvent {
    return {
      id: taskId,
      status: status,
      final: final
    };
  }

  private createTaskArtifactEvent(
    taskId: string,
    artifact: schema.Artifact,
    final: boolean
  ): schema.TaskArtifactUpdateEvent {
    return {
      id: taskId,
      artifact: artifact,
      final: final
    };
  }
}
