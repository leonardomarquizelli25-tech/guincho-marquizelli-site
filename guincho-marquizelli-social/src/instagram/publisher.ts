import { createHash } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { config, projectRoot, type AppConfig } from "../config.js";
import { PublicationSchema, type ContentRecord, type Publication, type PublicationTarget } from "../schemas/index.js";
import { WorkflowError } from "../utils/errors.js";
import { logger } from "../utils/logger.js";

export interface PublishInput {
  record: ContentRecord;
  publicImageUrl: string;
  idempotencyKey: string;
  target?: PublicationTarget;
}

export interface InstagramTransport {
  createContainer(imageUrl: string, caption: string, target?: PublicationTarget): Promise<{ id: string }>;
  containerStatus(id: string): Promise<{ status_code: string; status?: string }>;
  publishContainer(id: string): Promise<{ id: string }>;
  permalink(mediaId: string): Promise<string | null>;
}

export interface IdempotencyStore {
  has(key: string): boolean;
  reserve(key: string): void;
}

export class IdempotencyRegistry implements IdempotencyStore {
  private readonly used = new Set<string>();
  has(key: string): boolean { return this.used.has(key); }
  reserve(key: string): void {
    if (this.used.has(key)) throw new WorkflowError("Chave de idempotência já utilizada.", "IDEMPOTENCY_KEY_REUSED");
    this.used.add(key);
  }
}

export class FileIdempotencyRegistry implements IdempotencyStore {
  private readonly directory: string;

  constructor(directory = resolve(projectRoot, config.IDEMPOTENCY_DIRECTORY)) {
    this.directory = directory;
    mkdirSync(this.directory, { recursive: true });
  }

  private pathFor(key: string): string {
    return resolve(this.directory, `${createHash("sha256").update(key).digest("hex")}.lock`);
  }

  has(key: string): boolean {
    return existsSync(this.pathFor(key));
  }

  reserve(key: string): void {
    try {
      writeFileSync(this.pathFor(key), JSON.stringify({ reserved_at: new Date().toISOString(), key_hash: createHash("sha256").update(key).digest("hex") }), { flag: "wx" });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "EEXIST") throw new WorkflowError("Chave de idempotência já utilizada.", "IDEMPOTENCY_KEY_REUSED");
      throw error;
    }
  }
}

function createIdempotencyStore(appConfig: AppConfig): IdempotencyStore {
  return appConfig.APP_ENV === "dry-run"
    ? new IdempotencyRegistry()
    : new FileIdempotencyRegistry(resolve(projectRoot, appConfig.IDEMPOTENCY_DIRECTORY));
}

function currentApproval(record: ContentRecord) {
  return record.approvals.at(-1);
}

export function assertPublishable(record: ContentRecord, target: PublicationTarget = "feed"): void {
  if (record.state !== "APPROVED" && record.state !== "SCHEDULED" && record.state !== "PUBLISHING") {
    throw new WorkflowError(`Status ${record.state} não permite publicação.`, "CONTENT_NOT_APPROVED");
  }
  const approval = currentApproval(record);
  if (!approval || approval.decision !== "approved" || approval.version !== record.version || !approval.approver_user) {
    throw new WorkflowError("Aprovador/versão aprovada ausente.", "HUMAN_APPROVAL_REQUIRED");
  }
  if (!record.render || approval.approved_image_hash !== record.render.image_hash || approval.approved_caption_hash !== record.render.caption_hash) {
    throw new WorkflowError("Imagem ou legenda diverge da versão aprovada.", "APPROVAL_HASH_MISMATCH");
  }
  const validDimensions = target === "story"
    ? record.render.dimensions.width === 1080 && record.render.dimensions.height === 1920
    : record.render.dimensions.width === 1080 && [1080, 1350, 1440].includes(record.render.dimensions.height);
  if (!validDimensions) {
    throw new WorkflowError("Dimensões de mídia inválidas.", "INVALID_MEDIA_DIMENSIONS");
  }
  if (record.publications.some((publication) => publication.target === target)) throw new WorkflowError(`Conteúdo já publicado no destino ${target}.`, "DUPLICATE_PUBLICATION");
}

function fullCaption(record: ContentRecord): string {
  const copy = record.render?.texts;
  if (!copy) throw new WorkflowError("Copy renderizada ausente.", "RENDER_REQUIRED");
  const caption = copy.caption.trim();
  const normalizedCaption = caption.toLocaleLowerCase("pt-BR");
  const missingHashtags = copy.hashtags.filter((hashtag) => !normalizedCaption.includes(hashtag.toLocaleLowerCase("pt-BR")));
  return [caption, missingHashtags.join(" ")].filter(Boolean).join("\n\n");
}

export class GraphInstagramTransport implements InstagramTransport {
  constructor(private readonly appConfig: AppConfig = config) {}

  private url(path: string): string {
    const host = this.appConfig.INSTAGRAM_LOGIN_MODE === "instagram" ? "graph.instagram.com" : "graph.facebook.com";
    return `https://${host}/${this.appConfig.INSTAGRAM_API_VERSION}/${path.replace(/^\//, "")}`;
  }

  private async request(path: string, init: RequestInit): Promise<Record<string, unknown>> {
    if (!this.appConfig.META_ACCESS_TOKEN) throw new WorkflowError("META_ACCESS_TOKEN ausente.", "META_NOT_CONFIGURED");
    const response = await fetch(this.url(path), {
      ...init,
      headers: { ...init.headers, authorization: `Bearer ${this.appConfig.META_ACCESS_TOKEN}` }
    });
    const body = await response.json().catch(() => ({})) as Record<string, unknown>;
    const retryable = response.status === 429 || response.status >= 500;
    if (!response.ok) {
      const providerError = typeof body.error === "object" && body.error !== null
        ? body.error as Record<string, unknown>
        : {};
      throw new WorkflowError(
        `Instagram API respondeu ${response.status}.`,
        "INSTAGRAM_API_ERROR",
        !retryable,
        {
          status: response.status,
          provider_code: providerError.code,
          provider_subcode: providerError.error_subcode,
          provider_type: providerError.type
        }
      );
    }
    return body;
  }

  async verifyConnection(): Promise<{ id: string; username: string | null; account_type: string | null }> {
    if (!this.appConfig.INSTAGRAM_ACCOUNT_ID) throw new WorkflowError("INSTAGRAM_ACCOUNT_ID ausente.", "META_NOT_CONFIGURED");
    const response = await this.request(`${this.appConfig.INSTAGRAM_ACCOUNT_ID}?fields=id,username,account_type`, { method: "GET" });
    if (typeof response.id !== "string") throw new WorkflowError("Conta do Instagram sem id na resposta.", "INSTAGRAM_INVALID_RESPONSE");
    return {
      id: response.id,
      username: typeof response.username === "string" ? response.username : null,
      account_type: typeof response.account_type === "string" ? response.account_type : null
    };
  }

  async createContainer(imageUrl: string, caption: string, target: PublicationTarget = "feed"): Promise<{ id: string }> {
    if (!this.appConfig.INSTAGRAM_ACCOUNT_ID) throw new WorkflowError("INSTAGRAM_ACCOUNT_ID ausente.", "META_NOT_CONFIGURED");
    const body = new URLSearchParams({ image_url: imageUrl });
    if (target === "feed") body.set("caption", caption);
    if (target === "story") body.set("media_type", "STORIES");
    const response = await this.request(`${this.appConfig.INSTAGRAM_ACCOUNT_ID}/media`, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body });
    if (typeof response.id !== "string") throw new WorkflowError("Container sem id.", "INSTAGRAM_INVALID_RESPONSE");
    return { id: response.id };
  }

  async containerStatus(id: string): Promise<{ status_code: string; status?: string }> {
    const response = await this.request(`${id}?fields=status_code,status`, { method: "GET" });
    return { status_code: String(response.status_code ?? "UNKNOWN"), status: typeof response.status === "string" ? response.status : undefined };
  }

  async publishContainer(id: string): Promise<{ id: string }> {
    if (!this.appConfig.INSTAGRAM_ACCOUNT_ID) throw new WorkflowError("INSTAGRAM_ACCOUNT_ID ausente.", "META_NOT_CONFIGURED");
    const body = new URLSearchParams({ creation_id: id });
    const response = await this.request(`${this.appConfig.INSTAGRAM_ACCOUNT_ID}/media_publish`, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body });
    if (typeof response.id !== "string") throw new WorkflowError("Publicação sem id.", "INSTAGRAM_INVALID_RESPONSE");
    return { id: response.id };
  }

  async permalink(mediaId: string): Promise<string | null> {
    const response = await this.request(`${mediaId}?fields=permalink`, { method: "GET" });
    return typeof response.permalink === "string" ? response.permalink : null;
  }
}

async function retry<T>(operation: () => Promise<T>, attempts = 4): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try { return await operation(); } catch (error) {
      lastError = error;
      if (!(error instanceof WorkflowError) || error.permanent || attempt === attempts - 1) throw error;
      const delay = Math.min(8_000, 500 * 2 ** attempt) + Math.floor(Math.random() * 150);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}

export class InstagramPublisher {
  constructor(
    private readonly registry: IdempotencyStore = createIdempotencyStore(config),
    private readonly transport: InstagramTransport = new GraphInstagramTransport(),
    private readonly appConfig: AppConfig = config
  ) {}

  async publish(input: PublishInput): Promise<Publication> {
    const target = input.target ?? "feed";
    assertPublishable(input.record, target);
    if (!input.publicImageUrl.startsWith("https://")) throw new WorkflowError("Imagem precisa de URL HTTPS pública.", "PUBLIC_MEDIA_URL_REQUIRED");
    this.registry.reserve(input.idempotencyKey);
    const mode = this.appConfig.APP_ENV;
    if (mode !== "production" || !this.appConfig.ENABLE_REAL_PUBLISHING) {
      logger.info({ contentId: input.record.id, version: input.record.version, mode }, "Instagram dry-run simulado");
      return PublicationSchema.parse({
        content_id: input.record.id,
        version: input.record.version,
        target,
        mode,
        idempotency_key: input.idempotencyKey,
        media_id: `simulated-${input.record.id}-v${input.record.version}`,
        permalink: null,
        published_at: new Date().toISOString(),
        simulated: true,
        response: { status: "PUBLISHED_SIMULATED", container_created: true, processing_checked: true, token_logged: false }
      });
    }
    const caption = fullCaption(input.record);
    const container = await retry(() => this.transport.createContainer(input.publicImageUrl, caption, target));
    let status = await retry(() => this.transport.containerStatus(container.id));
    for (let poll = 0; poll < this.appConfig.INSTAGRAM_POLL_ATTEMPTS && status.status_code === "IN_PROGRESS"; poll += 1) {
      await new Promise((resolve) => setTimeout(resolve, this.appConfig.INSTAGRAM_POLL_INTERVAL_MS));
      status = await retry(() => this.transport.containerStatus(container.id));
    }
    if (status.status_code !== "FINISHED") throw new WorkflowError(`Container não ficou pronto: ${status.status_code}`, "INSTAGRAM_CONTAINER_FAILED", status.status_code === "IN_PROGRESS");
    const media = await retry(() => this.transport.publishContainer(container.id));
    const permalink = await retry(() => this.transport.permalink(media.id));
    return PublicationSchema.parse({
      content_id: input.record.id,
      version: input.record.version,
      target,
      mode,
      idempotency_key: input.idempotencyKey,
      media_id: media.id,
      permalink,
      published_at: new Date().toISOString(),
      simulated: false,
      response: { container_id: container.id, status_code: status.status_code, media_id: media.id }
    });
  }
}
