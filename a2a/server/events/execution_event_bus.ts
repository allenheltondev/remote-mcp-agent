import { EventEmitter } from 'events';
import { Message, Task, TaskStatusUpdateEvent, TaskArtifactUpdateEvent, } from "../../schema.js";

export type AgentExecutionEvent = | Message | Task | TaskStatusUpdateEvent | TaskArtifactUpdateEvent;

export interface IExecutionEventBus {
  publish(event: AgentExecutionEvent): void;
  on(eventName: 'event', listener: (event: AgentExecutionEvent) => void): this;
  off(eventName: 'event', listener: (event: AgentExecutionEvent) => void): this;
  once(eventName: 'event', listener: (event: AgentExecutionEvent) => void): this;
  removeAllListeners(eventName?: 'event'): this;
}

export class ExecutionEventBus extends EventEmitter implements IExecutionEventBus {
  constructor() {
    super();
  }

  publish(event: AgentExecutionEvent): void {
    this.emit('event', event);
  }
}

interface PollState {
  seqNum: number;
  seqPage: number;
  ctrl: AbortController;
}

export class MomentoEventBus  extends EventEmitter  implements IExecutionEventBus {
  private readonly baseUrl: string;
  private readonly pollers = new Map<string, PollState>();

  constructor(private readonly cacheName: string, private readonly apiKey: string) {
    super();

    const urlSafe = apiKey.replace(/-/g, '+').replace(/_/g, '/');
    const padded = urlSafe.padEnd(urlSafe.length + (4 - urlSafe.length % 4) % 4, '=');
    const { endpoint } = JSON.parse(
      new TextDecoder().decode(
        Uint8Array.from(atob(padded), c => c.charCodeAt(0)),
      ),
    ) as { endpoint: string; };

    this.baseUrl = `https://api.cache.${endpoint}`;
  }

  async publish(event: AgentExecutionEvent): Promise<void> {
    if (!('contextId' in event) || !event.contextId) {
      throw new Error('publish(): event.contextId is required');
    }

    const topicsUrl = `${this.baseUrl}/topics/${this.cacheName}/${event.contextId}`;
    console.log(topicsUrl);
    const res = await fetch(
      topicsUrl,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: this.apiKey,
        },
        body: JSON.stringify(event),
      },
    );

    if (!res.ok) {
      throw new Error(`Momento publish failed ${res.status}: ${res.statusText}`);
    }
  }

  registerContext(contextId: string): void {
    if (this.pollers.has(contextId)) return;

    const state: PollState = {
      seqNum: 0,
      seqPage: 0,
      ctrl: new AbortController(),
    };
    this.pollers.set(contextId, state);

    const poll = async () => {
      while (!state.ctrl.signal.aborted) {
        const url =
          `${this.baseUrl}/topics/${this.cacheName}/${contextId}` +
          `?sequence_number=${state.seqNum}&sequence_page=${state.seqPage}`;

        try {
          const res = await fetch(url, {
            headers: { Authorization: this.apiKey },
            signal: state.ctrl.signal,
          });

          if (res.ok) {
            const body = await res.json() as {
              items: Array<
                | { item: { value: { text: string; }, topic_sequence_number: number, sequence_page: number; }; }
                | { discontinuity: { new_topic_sequence: number, new_sequence_page: number; }; }
              >;
            };

            for (const entry of body.items) {
              if ('item' in entry) {
                const event = JSON.parse(entry.item.value.text) as AgentExecutionEvent;
                this.emit('event', event);

                state.seqNum = entry.item.topic_sequence_number + 1;
                state.seqPage = entry.item.sequence_page;
              } else if ('discontinuity' in entry) {
                state.seqNum = entry.discontinuity.new_topic_sequence + 1;
                state.seqPage = entry.discontinuity.new_sequence_page;
              }
            }
          }
        } catch (err: any) {
          if (err.name !== 'AbortError') {
            console.error(`Momento long-poll error [${contextId}]`, err);
          }
        }

        await new Promise(r => setTimeout(r, 100));
      }
    };

    poll();
  }

  unregisterContext(contextId: string): void {
    this.pollers.get(contextId)?.ctrl.abort();
    this.pollers.delete(contextId);
  }

  onContext(contextId: string, listener: (e: AgentExecutionEvent) => void): this {
    this.registerContext(contextId);
    return this.on('event', e => {
      if (e.contextId === contextId) listener(e);
    });
  }

  on(eventName: 'event', listener: (e: AgentExecutionEvent) => void): this {
    return super.on(eventName, listener);
  }
  off(eventName: 'event', listener: (e: AgentExecutionEvent) => void): this {
    return super.off(eventName, listener);
  }
  once(eventName: 'event', listener: (e: AgentExecutionEvent) => void): this {
    return super.once(eventName, listener);
  }
  removeAllListeners(eventName?: 'event'): this {
    if (!eventName || eventName === 'event') {
      for (const ctx of this.pollers.keys()) this.unregisterContext(ctx);
    }
    return super.removeAllListeners(eventName);
  }
}
