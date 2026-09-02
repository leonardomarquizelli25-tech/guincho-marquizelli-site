import { describe, expect, it } from "vitest";
import { approvedRecord } from "./fixtures.js";
import { canTransition, transition } from "../src/orchestrator/state-machine.js";

describe("máquina de estados e auditoria", () => {
  it("impede pular revisão de copy e visual", () => {
    expect(canTransition("IDEA", "COPY_APPROVED")).toBe(false);
    expect(canTransition("COPY_DRAFT", "VISUAL_DIRECTION")).toBe(false);
    expect(canTransition("VISUAL_PRODUCTION", "AWAITING_APPROVAL")).toBe(false);
  });

  it("registra toda transição", () => {
    const record = approvedRecord();
    transition(record, "PUBLISHING", "test", "teste de auditoria");
    expect(record.transitions).toHaveLength(1);
    expect(record.transitions[0]).toMatchObject({ from: "APPROVED", to: "PUBLISHING", actor: "test" });
  });

  it("conteúdo publicado e rejeitado são terminais", () => {
    expect(canTransition("PUBLISHED", "PUBLISHING")).toBe(false);
    expect(canTransition("PUBLISHED_SIMULATED", "PUBLISHING")).toBe(false);
    expect(canTransition("REJECTED", "PUBLISHING")).toBe(false);
  });

  it("bloqueia aprovação com hash alterado", () => {
    const record = approvedRecord();
    record.state = "AWAITING_APPROVAL";
    record.approvals[0]!.approved_image_hash = "c".repeat(64);
    expect(() => transition(record, "APPROVED", "test", "hash errado")).toThrow(/Hashes aprovados/);
  });

  it("após duas correções permite somente revisão humana, nunca publicação de visual reprovado", () => {
    const record = approvedRecord();
    record.state = "VISUAL_REVIEW";
    record.copyReview = record.render!.copy_review;
    record.visualReview = { ...record.visualReview!, approved: false, score: 65, problems: [{ severity: "high", category: "layout", description: "overflow" }] };
    record.automaticRevisionAttempts = 2;
    record.approvals = [];
    transition(record, "AWAITING_APPROVAL", "visual-reviewer", "limite atingido");
    record.approvals.push({ content_id: record.id, version: 1, decision: "approved", approver_user: "human", chat_id: "1", decided_at: new Date().toISOString(), approved_image_hash: record.render!.image_hash, approved_caption_hash: record.render!.caption_hash, comment: "", simulated: false });
    expect(() => transition(record, "APPROVED", "approval-manager", "tentativa indevida")).toThrow(/revisão visual ainda reprovada/i);
  });
});
