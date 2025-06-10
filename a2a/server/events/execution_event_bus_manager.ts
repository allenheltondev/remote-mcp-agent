import { MomentoEventBus } from './execution_event_bus.js';

export class ExecutionEventBusManager {
  private readonly messageIdToBus = new Map<string, MomentoEventBus>();
  private readonly taskIdToMessageId = new Map<string, string>();

  constructor(private readonly cacheName: string, private readonly apiKey: string) { }

  /* ------------------------------------------------------------- *
   *  1. Create (or fetch) a bus keyed by ORIGINAL messageId       *
   *     and ensure it’s already polling the supplied contextId.   *
   * ------------------------------------------------------------- */
  public createOrGetByMessageId(originalMessageId: string, contextId: string): MomentoEventBus {
    let bus = this.messageIdToBus.get(originalMessageId);

    if (!bus) {
      bus = new MomentoEventBus(this.cacheName, this.apiKey);
      this.messageIdToBus.set(originalMessageId, bus);
    }

    bus.registerContext(contextId);
    return bus;
  }

  /* ------------------------------------------------------------- *
   *  2. Link a taskId to an existing bus so later look-ups work.   *
   * ------------------------------------------------------------- */
  public associateTask(taskId: string, originalMessageId: string): void {
    if (this.messageIdToBus.has(originalMessageId)) {
      this.taskIdToMessageId.set(taskId, originalMessageId);
    } else {
      console.warn(`ExecutionEventBusManager: no bus for messageId ${originalMessageId}; cannot bind task ${taskId}`);
    }
  }

  /* ------------------------------------------------------------- *
   *  3. Fetch the bus when you only know the taskId.               *
   * ------------------------------------------------------------- */
  public getByTaskId(taskId: string): MomentoEventBus | undefined {
    const msgId = this.taskIdToMessageId.get(taskId);
    return msgId ? this.messageIdToBus.get(msgId) : undefined;
  }

  /* ------------------------------------------------------------- *
   *  4. Clean-up: stop polling, free maps, drop task aliases.      *
   * ------------------------------------------------------------- */
  public cleanupByMessageId(originalMessageId: string): void {
    const bus = this.messageIdToBus.get(originalMessageId);
    if (bus) {
      bus.removeAllListeners('event');
    }
    this.messageIdToBus.delete(originalMessageId);

    for (const [taskId, msgId] of this.taskIdToMessageId) {
      if (msgId === originalMessageId) this.taskIdToMessageId.delete(taskId);
    }
  }
}
