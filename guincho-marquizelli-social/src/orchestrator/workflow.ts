import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { config, projectRoot } from "../config.js";
import { ContentStrategistAgent } from "../agents/content-strategist.js";
import { CopywriterAgent } from "../agents/copywriter.js";
import { CopyReviewerAgent } from "../agents/copy-reviewer.js";
import { ArtDirectorAgent } from "../agents/art-director.js";
import { VisualReviewerAgent } from "../agents/visual-reviewer.js";
import { MockAssetProvider, type AssetProvider } from "../assets/provider.js";
import { InMemoryContentStore, type ContentStore } from "../database/store.js";
import { MockApprovalManager, simulatedApproval, type ApprovalManager } from "../approval/manager.js";
import { createMediaStorage, type MediaStorage } from "../storage/provider.js";
import { InstagramPublisher } from "../instagram/publisher.js";
import {
  BriefSchema,
  ChangeRequestSchema,
  type Approval,
  type Brief,
  type ContentRecord,
  type ContentState,
  type PublicationTarget
} from "../schemas/index.js";
import { transition } from "./state-machine.js";
import { hashJson } from "../utils/hash.js";
import { WorkflowError } from "../utils/errors.js";
import { renderSocialArt } from "../renderer/render.js";

export interface WorkflowDependencies {
  store?: ContentStore;
  assets?: AssetProvider;
  approval?: ApprovalManager;
  storage?: MediaStorage;
  publisher?: InstagramPublisher;
}

export class WorkflowService {
  readonly store: ContentStore;
  private readonly assets: AssetProvider;
  private readonly approval: ApprovalManager;
  private readonly storage: MediaStorage;
  private readonly publisher: InstagramPublisher;
  private readonly strategist = new ContentStrategistAgent();
  private readonly copywriter = new CopywriterAgent();
  private readonly copyReviewer = new CopyReviewerAgent();
  private readonly artDirector = new ArtDirectorAgent();
  private readonly visualReviewer = new VisualReviewerAgent();

  constructor(dependencies: WorkflowDependencies = {}) {
    this.store = dependencies.store ?? new InMemoryContentStore();
    this.assets = dependencies.assets ?? new MockAssetProvider();
    this.approval = dependencies.approval ?? new MockApprovalManager();
    this.storage = dependencies.storage ?? createMediaStorage();
    this.publisher = dependencies.publisher ?? new InstagramPublisher();
  }

  createBrief(input: Brief): ContentRecord {
    return this.store.create(BriefSchema.parse(input));
  }

  generateStrategy(id: string): ContentRecord {
    const record = this.store.get(id);
    this.requireState(record, "IDEA");
    const recentTopics = this.store.list().filter((item) => item.id !== id).map((item) => item.brief.topic);
    record.strategy = this.strategist.run(record.brief, recentTopics);
    if (record.strategy.commercial_claims_to_confirm.length > 0) {
      throw new WorkflowError("Estratégia contém informações comerciais a confirmar.", "COMMERCIAL_CONFIRMATION_REQUIRED", true, { claims: record.strategy.commercial_claims_to_confirm });
    }
    transition(record, "STRATEGY_READY", "content-strategist", "Estratégia validada por schema e regras comerciais");
    return this.saved(record);
  }

  generateCopy(id: string): ContentRecord {
    const record = this.store.get(id);
    if (record.state !== "STRATEGY_READY" && record.state !== "COPY_DRAFT") this.requireState(record, "STRATEGY_READY");
    if (!record.strategy) throw new WorkflowError("Estratégia ausente.", "STRATEGY_REQUIRED");
    record.copy = this.copywriter.run(record.strategy, record.changeRequests.at(-1)?.instruction);
    if (record.state === "STRATEGY_READY") transition(record, "COPY_DRAFT", "copywriter", "Rascunho de copy estruturado");
    return this.saved(record);
  }

  reviewCopy(id: string): ContentRecord {
    const record = this.store.get(id);
    this.requireState(record, "COPY_DRAFT");
    if (!record.copy) throw new WorkflowError("Copy ausente.", "COPY_REQUIRED");
    transition(record, "COPY_REVIEW", "copy-reviewer", "Início da revisão de copy");
    record.copyReview = this.copyReviewer.run(record.copy);
    if (record.copyReview.approved) {
      record.copy = record.copyReview.final_copy;
      transition(record, "COPY_APPROVED", "copy-reviewer", "Nota mínima atingida e nenhuma infração grave", { score: record.copyReview.score });
    } else {
      transition(record, "COPY_DRAFT", "copy-reviewer", "Correções obrigatórias na copy", { score: record.copyReview.score });
    }
    return this.saved(record);
  }

  generateVisualDirection(id: string): ContentRecord {
    const record = this.store.get(id);
    this.requireState(record, "COPY_APPROVED");
    if (!record.strategy || !record.copyReview) throw new WorkflowError("Estratégia/copy revisada ausente.", "COPY_REVIEW_REQUIRED");
    record.visualDirection = this.artDirector.run(record.strategy, record.copyReview.final_copy);
    transition(record, "VISUAL_DIRECTION", "art-director", "Direção visual estruturada e validada");
    return this.saved(record);
  }

  async produceAssets(id: string): Promise<ContentRecord> {
    const record = this.store.get(id);
    this.requireState(record, "VISUAL_DIRECTION");
    await this.assets.generate({
      id: "warning-triangle-3d",
      prompt: "Triângulo automotivo genérico isolado, sem texto, logo ou marcas de terceiros.",
      transparent: true
    });
    transition(record, "ASSET_PRODUCTION", "asset-generator", "Assets genéricos preparados; assets bloqueados preservados");
    return this.saved(record);
  }

  async render(id: string): Promise<ContentRecord> {
    const record = this.store.get(id);
    this.requireState(record, "ASSET_PRODUCTION");
    if (!record.copyReview || !record.visualDirection) throw new WorkflowError("Entradas de render incompletas.", "RENDER_INPUT_REQUIRED");
    transition(record, "VISUAL_PRODUCTION", "brand-renderer", "Início da renderização determinística");
    record.render = await renderSocialArt({
      contentId: record.id,
      version: record.version,
      copyReview: record.copyReview,
      visualDirection: record.visualDirection
    });
    transition(record, "VISUAL_REVIEW", "brand-renderer", "PNG, preview, manifesto e hashes gerados");
    return this.saved(record);
  }

  async reviewVisual(id: string): Promise<ContentRecord> {
    const record = this.store.get(id);
    this.requireState(record, "VISUAL_REVIEW");
    if (!record.render) throw new WorkflowError("Render ausente.", "RENDER_REQUIRED");
    record.visualReview = this.visualReviewer.run(record.render);
    record.render.visual_review = record.visualReview;
    await this.persistManifest(record);
    if (record.visualReview.approved) {
      transition(record, "AWAITING_APPROVAL", "visual-reviewer", "Revisão visual aprovada", { score: record.visualReview.score });
    } else if (record.automaticRevisionAttempts < config.MAX_AUTOMATIC_REVISIONS) {
      record.automaticRevisionAttempts += 1;
      transition(record, "VISUAL_PRODUCTION", "visual-reviewer", "Correção automática solicitada", { attempt: record.automaticRevisionAttempts, problems: record.visualReview.problems });
    } else {
      transition(record, "AWAITING_APPROVAL", "visual-reviewer", "Limite automático atingido; revisão humana obrigatória", { manual_visual_review: true, problems: record.visualReview.problems });
    }
    return this.saved(record);
  }

  async requestApproval(id: string): Promise<{ record: ContentRecord; dispatchId: string; simulated: boolean }> {
    const record = this.store.get(id);
    this.requireState(record, "AWAITING_APPROVAL");
    const dispatch = await this.approval.request(record);
    await this.writeRecord(record, { approval_dispatch: dispatch });
    return { record, dispatchId: dispatch.externalId, simulated: dispatch.simulated };
  }

  approve(id: string, approval: Approval = simulatedApproval(this.store.get(id))): ContentRecord {
    const record = this.store.get(id);
    this.requireState(record, "AWAITING_APPROVAL");
    record.approvals.push(approval);
    transition(record, "APPROVED", "approval-manager", "Aprovação humana explícita registrada", { approver: approval.approver_user, simulated: approval.simulated });
    return this.saved(record);
  }

  reject(id: string, approval: Approval): ContentRecord {
    const record = this.store.get(id);
    this.requireState(record, "AWAITING_APPROVAL");
    if (approval.decision !== "rejected") throw new WorkflowError("Decisão precisa ser rejected.", "INVALID_APPROVAL_DECISION");
    record.approvals.push(approval);
    transition(record, "REJECTED", "approval-manager", "Conteúdo rejeitado pelo aprovador", { approver: approval.approver_user });
    return this.saved(record);
  }

  requestChanges(
    id: string,
    instruction: string,
    requestedBy = "human-approver",
    explicitReturnStage?: "COPY_DRAFT" | "VISUAL_DIRECTION" | "ASSET_PRODUCTION" | "VISUAL_PRODUCTION"
  ): ContentRecord {
    const record = this.store.get(id);
    if (record.state !== "AWAITING_APPROVAL" && record.state !== "APPROVED" && record.state !== "SCHEDULED") {
      throw new WorkflowError("Alterações só podem ser solicitadas após envio para aprovação.", "INVALID_CHANGE_REQUEST_STATE");
    }
    this.snapshotVersion(record);
    const fromVersion = record.version;
    transition(record, "CHANGES_REQUESTED", "approval-manager", "Alteração solicitada pelo aprovador", { instruction });
    record.version += 1;
    const copyChange = /copy|headline|legenda|texto|cta|hashtag|frase/i.test(instruction);
    const returnStage = explicitReturnStage ?? (copyChange ? "COPY_DRAFT" : "VISUAL_DIRECTION");
    record.changeRequests.push(ChangeRequestSchema.parse({
      content_id: record.id,
      from_version: fromVersion,
      to_version: record.version,
      instruction,
      requested_by: requestedBy,
      requested_at: new Date().toISOString(),
      return_stage: returnStage
    }));
    record.render = undefined;
    record.visualReview = undefined;
    record.automaticRevisionAttempts = 0;
    if (copyChange) {
      record.copyReview = undefined;
    }
    if (returnStage === "VISUAL_DIRECTION" && record.strategy && record.copyReview) {
      record.visualDirection = this.artDirector.run(record.strategy, record.copyReview.final_copy);
    }
    transition(record, returnStage, "orchestrator", "Retorno à etapa adequada para nova versão", { from_version: fromVersion, to_version: record.version });
    return this.saved(record);
  }

  redoStep(
    id: string,
    step: "copy" | "visual_direction" | "asset_production" | "visual_production",
    requestedBy = "human-approver"
  ): ContentRecord {
    const returnStage = {
      copy: "COPY_DRAFT",
      visual_direction: "VISUAL_DIRECTION",
      asset_production: "VISUAL_DIRECTION",
      visual_production: "ASSET_PRODUCTION"
    } as const;
    return this.requestChanges(id, `Refazer etapa: ${step}`, requestedBy, returnStage[step]);
  }

  schedule(id: string, scheduledFor: string): ContentRecord {
    const record = this.store.get(id);
    this.requireState(record, "APPROVED");
    const date = new Date(scheduledFor);
    if (Number.isNaN(date.getTime())) throw new WorkflowError("Data de agendamento inválida.", "INVALID_SCHEDULE");
    record.scheduledFor = date.toISOString();
    transition(record, "SCHEDULED", "scheduler", "Conteúdo aprovado agendado", { scheduled_for: record.scheduledFor });
    return this.saved(record);
  }

  async publish(id: string, target?: PublicationTarget): Promise<ContentRecord> {
    const record = this.store.get(id);
    if (record.state !== "APPROVED" && record.state !== "SCHEDULED") throw new WorkflowError("Conteúdo não aprovado/agendado.", "CONTENT_NOT_APPROVED");
    transition(record, "PUBLISHING", "instagram-publisher", "Validações pré-publicação iniciadas");
    try {
      if (!record.render) throw new WorkflowError("Render ausente.", "RENDER_REQUIRED");
      const publicationTarget = target ?? (record.brief.requested_format === "story" ? "story" : "feed");
      const publication = await this.publisher.publish({
        record,
        publicImageUrl: await this.storage.publicUrl(record.render, publicationTarget),
        idempotencyKey: `${record.id}:v${record.version}:${publicationTarget}:${record.render.image_hash}:${record.render.caption_hash}`,
        target: publicationTarget
      });
      record.publications.push(publication);
      transition(record, publication.simulated ? "PUBLISHED_SIMULATED" : "PUBLISHED", "instagram-publisher", publication.simulated ? "Publicação simulada registrada" : "Publicação confirmada pela API", { media_id: publication.media_id });
    } catch (error) {
      transition(record, "FAILED", "instagram-publisher", "Falha permanente ou retries esgotados", { message: error instanceof Error ? error.message : String(error) });
      this.saved(record);
      throw error;
    }
    await this.writeRecord(record);
    return this.saved(record);
  }

  async runDryRun(input?: Partial<Brief>): Promise<ContentRecord> {
    const id = input?.content_id ?? `demo-pane-${new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}`;
    const record = this.createBrief(BriefSchema.parse({
      content_id: id,
      objective: "Educar sobre sinais de pane e orientar uma parada segura",
      topic: "Sinais de pane automotiva e quando solicitar reboque",
      audience: "motoristas e proprietários de veículos",
      requested_format: "feed",
      planned_date: null,
      notes: "Demonstração ponta a ponta sem dados comerciais não confirmados",
      commercial_data: {},
      ...input
    }));
    this.generateStrategy(record.id);
    this.generateCopy(record.id);
    this.reviewCopy(record.id);
    this.generateVisualDirection(record.id);
    await this.produceAssets(record.id);
    await this.render(record.id);
    let reviewed = await this.reviewVisual(record.id);
    while (reviewed.state === "VISUAL_PRODUCTION" && reviewed.automaticRevisionAttempts <= config.MAX_AUTOMATIC_REVISIONS) {
      if (!reviewed.copyReview || !reviewed.visualDirection) break;
      reviewed.render = await renderSocialArt({ contentId: reviewed.id, version: reviewed.version, copyReview: reviewed.copyReview, visualDirection: reviewed.visualDirection });
      transition(reviewed, "VISUAL_REVIEW", "brand-renderer", "Render corrigido automaticamente", { attempt: reviewed.automaticRevisionAttempts });
      reviewed = await this.reviewVisual(reviewed.id);
    }
    await this.requestApproval(record.id);
    this.approve(record.id);
    await this.publish(record.id);
    await this.writeRecord(record);
    return record;
  }

  get(id: string): ContentRecord { return this.store.get(id); }
  list(): ContentRecord[] { return this.store.list(); }

  private requireState(record: ContentRecord, expected: ContentState): void {
    if (record.state !== expected) throw new WorkflowError(`Etapa requer ${expected}; atual: ${record.state}.`, "INVALID_WORKFLOW_STATE");
  }

  private saved(record: ContentRecord): ContentRecord {
    this.store.save(record);
    return record;
  }

  private snapshotVersion(record: ContentRecord): void {
    record.versionHistory.push({
      version: record.version,
      state: record.state,
      snapshot_hash: hashJson({ brief: record.brief, strategy: record.strategy, copy: record.copy, render: record.render }),
      created_at: new Date().toISOString(),
      render_image_hash: record.render?.image_hash ?? null,
      caption_hash: record.render?.caption_hash ?? null
    });
  }

  private async persistManifest(record: ContentRecord): Promise<void> {
    if (!record.render) return;
    const renderDirectory = dirname(join(projectRoot, ...record.render.final_png.split("/")));
    await mkdir(renderDirectory, { recursive: true });
    await writeFile(join(renderDirectory, "manifest.json"), JSON.stringify(record.render, null, 2));
    const directory = join(projectRoot, "output", record.id, `v${record.version}`);
    await writeFile(join(directory, "visual-review.json"), JSON.stringify(record.visualReview, null, 2));
  }

  private async writeRecord(record: ContentRecord, extra: Record<string, unknown> = {}): Promise<void> {
    const directory = join(projectRoot, "output", record.id, `v${record.version}`);
    await mkdir(directory, { recursive: true });
    const safeRecord = { ...record, ...extra };
    await Promise.all([
      writeFile(join(directory, "workflow-record.json"), JSON.stringify(safeRecord, null, 2)),
      writeFile(join(directory, "transitions.json"), JSON.stringify(record.transitions, null, 2)),
      writeFile(join(directory, "approvals.json"), JSON.stringify(record.approvals, null, 2)),
      writeFile(join(directory, "publications.json"), JSON.stringify(record.publications, null, 2)),
      writeFile(join(directory, "version-history.json"), JSON.stringify(record.versionHistory, null, 2))
    ]);
  }
}
