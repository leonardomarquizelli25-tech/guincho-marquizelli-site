import { createHmac, timingSafeEqual } from "node:crypto";
import type { RequestHandler } from "express";
import { config } from "../config.js";

export function verifyHmacSha256(rawBody: Buffer, signature: string | undefined, secret: string | undefined): boolean {
  if (!signature || !secret || !signature.startsWith("sha256=")) return false;
  const supplied = Buffer.from(signature.slice("sha256=".length), "hex");
  const expected = createHmac("sha256", secret).update(rawBody).digest();
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

export const verifyMetaWebhook: RequestHandler = (request, response, next) => {
  const rawBody = (request as typeof request & { rawBody?: Buffer }).rawBody ?? Buffer.alloc(0);
  const signature = request.header("x-hub-signature-256");
  if (!verifyHmacSha256(rawBody, signature, config.META_APP_SECRET)) {
    response.status(401).json({ error: "invalid_webhook_signature" });
    return;
  }
  next();
};

export const verifyTelegramSecret: RequestHandler = (request, response, next) => {
  if (!config.TELEGRAM_WEBHOOK_SECRET || request.header("x-telegram-bot-api-secret-token") !== config.TELEGRAM_WEBHOOK_SECRET) {
    response.status(401).json({ error: "invalid_telegram_secret" });
    return;
  }
  next();
};
