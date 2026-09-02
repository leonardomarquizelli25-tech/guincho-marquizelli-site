import type { Brief, ContentRecord } from "../schemas/index.js";
import { BriefSchema } from "../schemas/index.js";
import { WorkflowError } from "../utils/errors.js";

export interface ContentStore {
  create(brief: Brief): ContentRecord;
  get(id: string): ContentRecord;
  list(): ContentRecord[];
  save(record: ContentRecord): void;
}

export class InMemoryContentStore implements ContentStore {
  private readonly records = new Map<string, ContentRecord>();

  create(input: Brief): ContentRecord {
    const brief = BriefSchema.parse(input);
    if (this.records.has(brief.content_id)) {
      throw new WorkflowError("content_id já existe.", "DUPLICATE_CONTENT_ID");
    }
    const record: ContentRecord = {
      id: brief.content_id,
      state: "IDEA",
      version: 1,
      brief,
      approvals: [],
      changeRequests: [],
      transitions: [],
      publications: [],
      automaticRevisionAttempts: 0,
      versionHistory: []
    };
    this.records.set(record.id, record);
    return record;
  }

  get(id: string): ContentRecord {
    const record = this.records.get(id);
    if (!record) throw new WorkflowError(`Conteúdo ${id} não encontrado.`, "CONTENT_NOT_FOUND");
    return record;
  }

  list(): ContentRecord[] {
    return [...this.records.values()];
  }

  save(record: ContentRecord): void {
    this.records.set(record.id, record);
  }
}
