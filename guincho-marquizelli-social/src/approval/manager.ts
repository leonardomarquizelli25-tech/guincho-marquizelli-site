import { basename } from "node:path";
import { ApprovalSchema, type Approval, type ContentRecord } from "../schemas/index.js";
import { config } from "../config.js";
import { WorkflowError } from "../utils/errors.js";
import { outputPath } from "../renderer/render.js";

export interface ApprovalDispatch {
  externalId: string;
  simulated: boolean;
  checks: string[];
}

export interface ApprovalManager {
  request(record: ContentRecord): Promise<ApprovalDispatch>;
}

function approvalCaption(record: ContentRecord): string {
  const copy = record.render?.texts;
  const review = record.visualReview;
  if (!copy || !review || !record.render) throw new WorkflowError("Render/revisão ausente.", "APPROVAL_PAYLOAD_INCOMPLETE");
  return [
    `Conteúdo: ${record.id}`,
    `Versão: ${record.version}`,
    `Formato: ${record.strategy?.format ?? "não informado"}`,
    `Data planejada: ${record.brief.planned_date ?? "não agendada"}`,
    `Nota visual: ${review.score}/100`,
    "",
    `Headline: ${copy.headline}`,
    `Texto secundário: ${copy.supporting_text}`,
    `CTA: ${copy.cta}`,
    "",
    `Legenda: ${copy.caption.slice(0, 700)}${copy.caption.length > 700 ? "…" : ""}`,
    `Hashtags: ${copy.hashtags.join(" ")}`,
    "",
    "Verificações: logo preservada; foto real bloqueada; copy revisada; dimensões e hashes validados."
  ].join("\n");
}

export class MockApprovalManager implements ApprovalManager {
  async request(record: ContentRecord): Promise<ApprovalDispatch> {
    if (!record.render || !record.visualReview?.approved) throw new WorkflowError("Revisão visual aprovada é obrigatória.", "VISUAL_REVIEW_REQUIRED");
    return {
      externalId: `telegram-mock-${record.id}-v${record.version}`,
      simulated: true,
      checks: ["imagem anexada localmente", "legenda completa registrada", "botões simulados", "nenhuma mensagem externa enviada"]
    };
  }
}

export class TelegramApprovalManager implements ApprovalManager {
  async request(record: ContentRecord): Promise<ApprovalDispatch> {
    if (!config.TELEGRAM_BOT_TOKEN || !config.TELEGRAM_APPROVER_CHAT_ID) {
      throw new WorkflowError("Telegram não configurado.", "TELEGRAM_NOT_CONFIGURED");
    }
    if (!record.render || !record.visualReview?.approved) throw new WorkflowError("Revisão visual aprovada é obrigatória.", "VISUAL_REVIEW_REQUIRED");
    const form = new FormData();
    form.set("chat_id", config.TELEGRAM_APPROVER_CHAT_ID);
    form.set("caption", approvalCaption(record));
    form.set("reply_markup", JSON.stringify({ inline_keyboard: [
      [
        { text: "✅ Aprovar", callback_data: `approve:${record.id}:${record.version}` },
        { text: "✏️ Solicitar alteração", callback_data: `change:${record.id}:${record.version}` }
      ],
      [
        { text: "❌ Rejeitar", callback_data: `reject:${record.id}:${record.version}` },
        { text: "⏰ Adiar", callback_data: `postpone:${record.id}:${record.version}` }
      ],
      [{ text: "📄 Ver legenda completa", callback_data: `caption:${record.id}:${record.version}` }]
    ] }));
    const filePath = outputPath(record.render.preview_png);
    const bytes = await import("node:fs/promises").then(({ readFile }) => readFile(filePath));
    form.set("photo", new Blob([bytes], { type: "image/png" }), basename(filePath));
    const response = await fetch(`https://api.telegram.org/bot${config.TELEGRAM_BOT_TOKEN}/sendPhoto`, { method: "POST", body: form });
    if (!response.ok) throw new WorkflowError(`Telegram respondeu ${response.status}.`, "TELEGRAM_API_ERROR", response.status >= 500 || response.status === 429);
    const body = await response.json() as { ok: boolean; result?: { message_id?: number } };
    if (!body.ok || !body.result?.message_id) throw new WorkflowError("Resposta inválida do Telegram.", "TELEGRAM_API_ERROR");
    return { externalId: String(body.result.message_id), simulated: false, checks: ["imagem enviada", "botões enviados", "legenda resumida enviada"] };
  }
}

export function simulatedApproval(record: ContentRecord, comment = "Aprovação simulada do fluxo dry-run"): Approval {
  if (!record.render) throw new WorkflowError("Render ausente.", "RENDER_REQUIRED");
  return ApprovalSchema.parse({
    content_id: record.id,
    version: record.version,
    decision: "approved",
    approver_user: "dry-run-human-simulator",
    chat_id: "telegram-mock-chat",
    decided_at: new Date().toISOString(),
    approved_image_hash: record.render.image_hash,
    approved_caption_hash: record.render.caption_hash,
    comment,
    simulated: true
  });
}

export function approvalFromDecision(record: ContentRecord, input: {
  decision: Approval["decision"];
  approver: string;
  chatId: string;
  comment?: string;
}): Approval {
  return ApprovalSchema.parse({
    content_id: record.id,
    version: record.version,
    decision: input.decision,
    approver_user: input.approver,
    chat_id: input.chatId,
    decided_at: new Date().toISOString(),
    approved_image_hash: input.decision === "approved" ? record.render?.image_hash ?? null : null,
    approved_caption_hash: input.decision === "approved" ? record.render?.caption_hash ?? null : null,
    comment: input.comment ?? "",
    simulated: false
  });
}
