import * as schema from "../schema.js";

// Helper type for the simplified store
export interface TaskAndHistory {
  task: schema.Task;
  history: schema.Message[];
}

/**
 * Simplified interface for task storage providers.
 * Stores and retrieves both the task and its full message history together.
 */
export interface TaskStore {
  /**
   * Saves a task and its associated message history.
   * Overwrites existing data if the task ID exists.
   * @param data An object containing the task and its history.
   * @returns A promise resolving when the save operation is complete.
   */
  save(data: TaskAndHistory): Promise<void>;

  /**
   * Loads a task and its history by task ID.
   * @param taskId The ID of the task to load.
   * @returns A promise resolving to an object containing the Task and its history, or null if not found.
   */
  load(taskId: string): Promise<TaskAndHistory | null>;
}

// ========================
// InMemoryTaskStore
// ========================

// Use TaskAndHistory directly for storage
export class InMemoryTaskStore implements TaskStore {
  private store: Map<string, TaskAndHistory> = new Map();

  async load(taskId: string): Promise<TaskAndHistory | null> {
    const entry = this.store.get(taskId);
    // Return copies to prevent external mutation
    return entry
      ? { task: { ...entry.task }, history: [...entry.history] }
      : null;
  }

  async save(data: TaskAndHistory): Promise<void> {
    // Store copies to prevent internal mutation if caller reuses objects
    this.store.set(data.task.id, {
      task: { ...data.task },
      history: [...data.history],
    });
  }
}

// ========================
// MomentoTaskStore
// ========================
export class MomentoTaskStore implements TaskStore {
  private cacheName: string;
  private baseUrl: string;
  private apiKey: string;

  constructor(cacheName: string, apiKey: string) {
    this.cacheName = cacheName;
    this.apiKey = apiKey;

    const base64 = apiKey.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, '=');
    const jsonString = new TextDecoder().decode(Uint8Array.from(atob(padded), c => c.charCodeAt(0)));
    const decodedToken = JSON.parse(jsonString);
    this.baseUrl = `https://api.cache.${decodedToken.endpoint}`;
  }

  async load(taskId: string): Promise<TaskAndHistory | null> {
    const response: Response = await fetch(`${this.baseUrl}/cache/${this.cacheName}?key=${encodeURIComponent(taskId)}&token=${this.apiKey}`);
    if (response.ok) {
      const data = await response.json() as any;
      if (data.value) {
        return JSON.parse(data.value) as TaskAndHistory;
      }
    }
    return null;
  }

  async save(data: TaskAndHistory): Promise<void> {
    await fetch(`${this.baseUrl}/cache/${this.cacheName}?key=${data.task.id}&token=${this.apiKey}&ttl_seconds=300`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
  }
}
