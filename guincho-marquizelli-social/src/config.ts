import "dotenv/config";
import { resolve } from "node:path";
import { z } from "zod";

const booleanFromString = z.preprocess(
  (value) => typeof value === "string" ? value.toLowerCase() === "true" : value,
  z.boolean()
);

const envSchema = z.object({
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_TEXT_MODEL: z.string().optional(),
  OPENAI_VISION_MODEL: z.string().optional(),
  OPENAI_IMAGE_MODEL: z.string().optional(),
  META_ACCESS_TOKEN: z.string().optional(),
  PUBLISHER_API_KEY: z.string().min(32).optional(),
  META_APP_SECRET: z.string().optional(),
  INSTAGRAM_ACCOUNT_ID: z.string().optional(),
  INSTAGRAM_API_VERSION: z.string().regex(/^v\d+\.\d+$/).default("v24.0"),
  INSTAGRAM_LOGIN_MODE: z.enum(["instagram", "facebook"]).default("instagram"),
  INSTAGRAM_POLL_INTERVAL_MS: z.coerce.number().int().min(1_000).max(120_000).default(60_000),
  INSTAGRAM_POLL_ATTEMPTS: z.coerce.number().int().min(1).max(10).default(5),
  IDEMPOTENCY_DIRECTORY: z.string().default(".state/instagram-idempotency"),
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_WEBHOOK_SECRET: z.string().optional(),
  TELEGRAM_APPROVER_CHAT_ID: z.string().optional(),
  DATABASE_URL: z.string().optional(),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  PUBLIC_MEDIA_BASE_URL: z.string().url().optional(),
  STORAGE_BUCKET: z.string().optional(),
  APP_ENV: z.enum(["dry-run", "staging", "production"]).default("dry-run"),
  ENABLE_REAL_PUBLISHING: booleanFromString.default(false),
  APPROVAL_REQUIRED: booleanFromString.default(true),
  MAX_AUTOMATIC_REVISIONS: z.coerce.number().int().min(0).max(2).default(2),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  CHROMIUM_EXECUTABLE_PATH: z.string().optional()
});

export type AppConfig = z.infer<typeof envSchema>;
export const config: AppConfig = envSchema.parse(process.env);
export const projectRoot = resolve(process.env.PROJECT_ROOT ?? process.cwd());

export function assertProductionConfiguration(value: AppConfig = config): void {
  if (value.APP_ENV !== "production") return;
  if (!value.ENABLE_REAL_PUBLISHING) {
    throw new Error("Produção bloqueada: ENABLE_REAL_PUBLISHING não está ativo.");
  }
  for (const key of ["META_ACCESS_TOKEN", "PUBLISHER_API_KEY", "INSTAGRAM_ACCOUNT_ID", "PUBLIC_MEDIA_BASE_URL"] as const) {
    if (!value[key]) throw new Error(`Produção bloqueada: ${key} não configurado.`);
  }
  if (!value.APPROVAL_REQUIRED) {
    throw new Error("Produção bloqueada: APPROVAL_REQUIRED deve permanecer true.");
  }
}
