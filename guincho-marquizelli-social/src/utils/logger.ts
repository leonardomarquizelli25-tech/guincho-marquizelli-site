import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  redact: {
    paths: [
      "*.token",
      "*.accessToken",
      "*.apiKey",
      "*.authorization",
      "req.headers.authorization",
      "META_ACCESS_TOKEN",
      "TELEGRAM_BOT_TOKEN",
      "OPENAI_API_KEY",
      "SUPABASE_SERVICE_ROLE_KEY"
    ],
    censor: "[REDACTED]"
  },
  base: { service: "guincho-marquizelli-social" }
});
