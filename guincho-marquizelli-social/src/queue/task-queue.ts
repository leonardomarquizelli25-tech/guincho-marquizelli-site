import { WorkflowError } from "../utils/errors.js";

export interface QueueJob<T = unknown> {
  id: string;
  run: () => Promise<T>;
  attempts?: number;
}

export class TaskQueue {
  private active = 0;
  private readonly pending: Array<QueueJob & { resolve: (value: unknown) => void; reject: (error: unknown) => void }> = [];
  private readonly ids = new Set<string>();

  constructor(private readonly concurrency = 2, private readonly maxAttempts = 3) {}

  add<T>(job: QueueJob<T>): Promise<T> {
    if (this.ids.has(job.id)) return Promise.reject(new WorkflowError("Job duplicado bloqueado.", "DUPLICATE_QUEUE_JOB"));
    this.ids.add(job.id);
    return new Promise<T>((resolve, reject) => {
      this.pending.push({ ...job, resolve: resolve as (value: unknown) => void, reject });
      this.drain();
    });
  }

  private drain(): void {
    while (this.active < this.concurrency && this.pending.length > 0) {
      const job = this.pending.shift()!;
      this.active += 1;
      this.execute(job).then(job.resolve, job.reject).finally(() => {
        this.active -= 1;
        this.ids.delete(job.id);
        this.drain();
      });
    }
  }

  private async execute(job: QueueJob): Promise<unknown> {
    let error: unknown;
    for (let attempt = 1; attempt <= (job.attempts ?? this.maxAttempts); attempt += 1) {
      try { return await job.run(); } catch (caught) {
        error = caught;
        if (caught instanceof WorkflowError && caught.permanent) throw caught;
        if (attempt < (job.attempts ?? this.maxAttempts)) await new Promise((resolve) => setTimeout(resolve, 100 * 2 ** attempt));
      }
    }
    throw error;
  }
}
