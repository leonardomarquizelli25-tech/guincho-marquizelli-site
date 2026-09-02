export class WorkflowError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly permanent = true,
    public readonly details: Record<string, unknown> = {}
  ) {
    super(message);
    this.name = "WorkflowError";
  }
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
