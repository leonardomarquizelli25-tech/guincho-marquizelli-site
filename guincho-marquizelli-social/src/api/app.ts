import { timingSafeEqual } from "node:crypto";
import express from "express";
import { join } from "node:path";
import { z } from "zod";
import { WorkflowService } from "../orchestrator/workflow.js";
import { BriefSchema } from "../schemas/index.js";
import { approvalFromDecision } from "../approval/manager.js";
import { rateLimit } from "../security/rate-limit.js";
import { verifyMetaWebhook, verifyTelegramSecret } from "../security/webhook.js";
import { WorkflowError } from "../utils/errors.js";
import { config, projectRoot } from "../config.js";
import { PublicationTargetSchema } from "../schemas/index.js";

const approvalBody = z.object({ approver: z.string().min(1), chat_id: z.string().min(1), comment: z.string().optional() });
const changeBody = z.object({ instruction: z.string().min(3), requested_by: z.string().default("human-approver") });
const redoBody = z.object({
  step: z.enum(["copy", "visual_direction", "asset_production", "visual_production"]),
  requested_by: z.string().default("human-approver")
});

export function createApp(workflow = new WorkflowService()) {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({
    limit: "2mb",
    verify: (request, _response, buffer) => { (request as typeof request & { rawBody?: Buffer }).rawBody = Buffer.from(buffer); }
  }));
  app.use(rateLimit());
  app.use("/media", express.static(join(projectRoot, "output"), { fallthrough: false, index: false, maxAge: "5m" }));

  app.get("/health", (_request, response) => response.json({
    ok: true,
    mode: config.APP_ENV,
    realPublishing: config.APP_ENV === "production" && config.ENABLE_REAL_PUBLISHING
  }));
  app.use("/api", (request, response, next) => {
    if (config.APP_ENV === "dry-run" && !config.PUBLISHER_API_KEY) return next();
    const supplied = request.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
    const expected = config.PUBLISHER_API_KEY;
    if (!expected) {
      response.status(503).json({ error: "publisher_access_not_configured" });
      return;
    }
    const suppliedBytes = Buffer.from(supplied);
    const expectedBytes = Buffer.from(expected);
    if (suppliedBytes.length !== expectedBytes.length || !timingSafeEqual(suppliedBytes, expectedBytes)) {
      response.status(401).json({ error: "unauthorized" });
      return;
    }
    next();
  });
  app.post("/api/briefings", (request, response) => response.status(201).json(workflow.createBrief(BriefSchema.parse(request.body))));
  app.post("/api/contents/:id/strategy", (request, response) => response.json(workflow.generateStrategy(request.params.id!)));
  app.post("/api/contents/:id/copy", (request, response) => response.json(workflow.generateCopy(request.params.id!)));
  app.post("/api/contents/:id/copy/review", (request, response) => response.json(workflow.reviewCopy(request.params.id!)));
  app.post("/api/contents/:id/visual-direction", (request, response) => response.json(workflow.generateVisualDirection(request.params.id!)));
  app.post("/api/contents/:id/assets", async (request, response) => response.json(await workflow.produceAssets(request.params.id!)));
  app.post("/api/contents/:id/render", async (request, response) => response.json(await workflow.render(request.params.id!)));
  app.post("/api/contents/:id/visual/review", async (request, response) => response.json(await workflow.reviewVisual(request.params.id!)));
  app.post("/api/contents/:id/approval/request", async (request, response) => response.json(await workflow.requestApproval(request.params.id!)));
  app.post("/api/contents/:id/approve", (request, response) => {
    const body = approvalBody.parse(request.body);
    const record = workflow.get(request.params.id!);
    response.json(workflow.approve(record.id, approvalFromDecision(record, { decision: "approved", approver: body.approver, chatId: body.chat_id, comment: body.comment })));
  });
  app.post("/api/contents/:id/reject", (request, response) => {
    const body = approvalBody.parse(request.body);
    const record = workflow.get(request.params.id!);
    response.json(workflow.reject(record.id, approvalFromDecision(record, { decision: "rejected", approver: body.approver, chatId: body.chat_id, comment: body.comment })));
  });
  app.post("/api/contents/:id/changes", (request, response) => {
    const body = changeBody.parse(request.body);
    response.json(workflow.requestChanges(request.params.id!, body.instruction, body.requested_by));
  });
  app.post("/api/contents/:id/redo", (request, response) => {
    const body = redoBody.parse(request.body);
    response.json(workflow.redoStep(request.params.id!, body.step, body.requested_by));
  });
  app.post("/api/contents/:id/schedule", (request, response) => {
    const { scheduled_for } = z.object({ scheduled_for: z.string().datetime() }).parse(request.body);
    response.json(workflow.schedule(request.params.id!, scheduled_for));
  });
  app.post("/api/contents/:id/publish", async (request, response) => {
    const target = PublicationTargetSchema.optional().parse(request.body?.target);
    response.json(await workflow.publish(request.params.id!, target));
  });
  app.post("/api/dry-run", async (request, response) => response.status(201).json(await workflow.runDryRun(request.body ?? {})));
  app.get("/api/contents", (_request, response) => response.json(workflow.list()));
  app.get("/api/contents/:id", (request, response) => response.json(workflow.get(request.params.id!)));
  app.get("/api/contents/:id/history", (request, response) => {
    const record = workflow.get(request.params.id!);
    response.json({ versions: record.versionHistory, transitions: record.transitions, approvals: record.approvals, changes: record.changeRequests, publications: record.publications });
  });

  app.post("/webhooks/telegram", verifyTelegramSecret, (request, response) => {
    const callback = request.body?.callback_query;
    if (!callback?.data || typeof callback.data !== "string") { response.json({ ok: true, ignored: true }); return; }
    const [action, contentId, version] = callback.data.split(":");
    const record = workflow.get(contentId);
    if (String(record.version) !== version) throw new WorkflowError("Callback de versão antiga bloqueado.", "STALE_APPROVAL_CALLBACK");
    const approver = callback.from?.username ?? String(callback.from?.id ?? "telegram-user");
    const chatId = String(callback.message?.chat?.id ?? "telegram-chat");
    if (action === "approve") workflow.approve(contentId, approvalFromDecision(record, { decision: "approved", approver, chatId }));
    else if (action === "reject") workflow.reject(contentId, approvalFromDecision(record, { decision: "rejected", approver, chatId }));
    else if (action === "postpone") record.approvals.push(approvalFromDecision(record, { decision: "postponed", approver, chatId }));
    response.json({ ok: true, action, content_id: contentId, version: record.version });
  });
  app.post("/webhooks/meta", verifyMetaWebhook, (_request, response) => response.json({ received: true }));

  app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
    if (error instanceof z.ZodError) { response.status(400).json({ error: "validation_error", issues: error.issues }); return; }
    if (error instanceof WorkflowError) { response.status(error.code.endsWith("NOT_FOUND") ? 404 : 409).json({ error: error.code, message: error.message, details: error.details }); return; }
    response.status(500).json({ error: "internal_error", message: error instanceof Error ? error.message : "Erro desconhecido" });
  });
  return { app, workflow };
}
