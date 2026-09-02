import type { WorkflowService } from "../orchestrator/workflow.js";
import { TaskQueue } from "../queue/task-queue.js";

export class ContentScheduler {
  constructor(private readonly workflow: WorkflowService, private readonly queue = new TaskQueue(1)) {}

  async tick(now = new Date()): Promise<number> {
    const due = this.workflow.list().filter((record) => record.state === "SCHEDULED" && record.scheduledFor && new Date(record.scheduledFor) <= now);
    await Promise.all(due.map((record) => this.queue.add({ id: `publish:${record.id}:v${record.version}`, run: () => this.workflow.publish(record.id) })));
    return due.length;
  }
}
