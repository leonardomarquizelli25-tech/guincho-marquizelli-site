import type { ContentRecord, ContentState, Transition } from "../schemas/index.js";
import { TransitionSchema } from "../schemas/index.js";
import { WorkflowError } from "../utils/errors.js";

const allowedTransitions: Record<ContentState, readonly ContentState[]> = {
  IDEA: ["STRATEGY_READY", "FAILED"],
  STRATEGY_READY: ["COPY_DRAFT", "FAILED"],
  COPY_DRAFT: ["COPY_REVIEW", "FAILED"],
  COPY_REVIEW: ["COPY_APPROVED", "COPY_DRAFT", "FAILED"],
  COPY_APPROVED: ["VISUAL_DIRECTION", "FAILED"],
  VISUAL_DIRECTION: ["ASSET_PRODUCTION", "FAILED"],
  ASSET_PRODUCTION: ["VISUAL_PRODUCTION", "FAILED"],
  VISUAL_PRODUCTION: ["VISUAL_REVIEW", "FAILED"],
  VISUAL_REVIEW: ["AWAITING_APPROVAL", "VISUAL_PRODUCTION", "FAILED"],
  CHANGES_REQUESTED: ["COPY_DRAFT", "VISUAL_DIRECTION", "ASSET_PRODUCTION", "VISUAL_PRODUCTION", "FAILED"],
  AWAITING_APPROVAL: ["APPROVED", "CHANGES_REQUESTED", "REJECTED", "FAILED"],
  APPROVED: ["SCHEDULED", "PUBLISHING", "CHANGES_REQUESTED", "FAILED"],
  SCHEDULED: ["PUBLISHING", "CHANGES_REQUESTED", "FAILED"],
  PUBLISHING: ["PUBLISHED", "PUBLISHED_SIMULATED", "FAILED"],
  PUBLISHED: [],
  PUBLISHED_SIMULATED: [],
  REJECTED: [],
  FAILED: []
};

function guardTransition(record: ContentRecord, to: ContentState): void {
  if (to === "COPY_APPROVED") {
    const review = record.copyReview;
    if (!review?.approved || review.score < 90 || review.problems.some((item) => item.severity === "high")) {
      throw new WorkflowError("Copy não atende aos critérios mínimos.", "COPY_REVIEW_REQUIRED");
    }
  }
  if (to === "AWAITING_APPROVAL") {
    const review = record.visualReview;
    const exhaustedForManualReview = record.automaticRevisionAttempts >= 2;
    if ((!review?.approved || review.score < 90 || review.problems.some((item) => item.severity === "high")) && !exhaustedForManualReview) {
      throw new WorkflowError("Revisão visual não atende aos critérios mínimos.", "VISUAL_REVIEW_REQUIRED");
    }
    if (!record.copyReview?.approved) {
      throw new WorkflowError("Aprovação bloqueada sem copy revisada.", "COPY_REVIEW_REQUIRED");
    }
  }
  if (to === "APPROVED") {
    if (!record.visualReview?.approved || record.visualReview.score < 90 || record.visualReview.problems.some((item) => item.severity === "high")) {
      throw new WorkflowError("Aprovação final bloqueada: revisão visual ainda reprovada.", "VISUAL_REVIEW_REQUIRED");
    }
    const approval = record.approvals.at(-1);
    if (!approval || approval.decision !== "approved" || approval.version !== record.version) {
      throw new WorkflowError("Aprovação humana explícita ausente para a versão atual.", "HUMAN_APPROVAL_REQUIRED");
    }
    if (approval.approved_image_hash !== record.render?.image_hash ||
        approval.approved_caption_hash !== record.render?.caption_hash) {
      throw new WorkflowError("Hashes aprovados não correspondem à versão atual.", "APPROVAL_HASH_MISMATCH");
    }
  }
  if (to === "PUBLISHING") {
    const approval = record.approvals.at(-1);
    if (!approval || approval.decision !== "approved" || approval.version !== record.version) {
      throw new WorkflowError("Publicação bloqueada sem aprovação da versão atual.", "HUMAN_APPROVAL_REQUIRED");
    }
    if (record.publications.length > 0) {
      throw new WorkflowError("Conteúdo já publicado.", "DUPLICATE_PUBLICATION");
    }
  }
}

export function canTransition(from: ContentState, to: ContentState): boolean {
  return allowedTransitions[from].includes(to);
}

export function transition(
  record: ContentRecord,
  to: ContentState,
  actor: string,
  reason: string,
  metadata: Record<string, unknown> = {}
): Transition {
  if (!canTransition(record.state, to)) {
    throw new WorkflowError(
      `Transição inválida: ${record.state} -> ${to}`,
      "INVALID_STATE_TRANSITION",
      true,
      { from: record.state, to }
    );
  }
  guardTransition(record, to);
  const event = TransitionSchema.parse({
    content_id: record.id,
    version: record.version,
    from: record.state,
    to,
    at: new Date().toISOString(),
    actor,
    reason,
    metadata
  });
  record.state = to;
  record.transitions.push(event);
  return event;
}

export function getAllowedTransitions(state: ContentState): readonly ContentState[] {
  return allowedTransitions[state];
}
