import { readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { projectRoot } from "../config.js";

const nullableString = z.string().nullable();
export const BrandSchema = z.object({
  company: z.object({
    official_name: z.literal("Guincho Marquizelli"),
    short_name: z.literal("Marquizelli"),
    description: z.string(),
    phone: nullableString,
    phones: z.array(z.string()).default([]),
    website: nullableString,
    whatsapp: nullableString,
    instagram: nullableString,
    address: nullableString,
    service_area: nullableString,
    opening_hours: nullableString
  }),
  services: z.object({
    confirmed: z.array(z.string()),
    requires_confirmation: z.array(z.string()),
    prohibited: z.array(z.string())
  }),
  visual_identity: z.object({
    colors: z.record(z.string(), z.union([z.string(), z.boolean()])),
    fonts: z.record(z.string(), z.unknown()),
    logo_rules: z.record(z.string(), z.unknown()),
    layout_rules: z.record(z.string(), z.unknown())
  }),
  prohibited_claims: z.array(z.string()),
  required_confirmations: z.array(z.string())
});

export type Brand = z.infer<typeof BrandSchema>;

let cachedBrand: Brand | undefined;
export function loadBrand(): Brand {
  cachedBrand ??= BrandSchema.parse(
    JSON.parse(readFileSync(join(projectRoot, "brand", "brand.json"), "utf8"))
  );
  return cachedBrand;
}
