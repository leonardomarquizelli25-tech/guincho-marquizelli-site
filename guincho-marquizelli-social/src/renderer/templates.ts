import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import { projectRoot } from "../config.js";

export const TemplateSchema = z.object({
  id: z.string(),
  format: z.string(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  safe_margin: z.number().int().min(48),
  layout: z.string(),
  description: z.string(),
  slots: z.array(z.string()).min(3)
});
export type TemplateConfig = z.infer<typeof TemplateSchema>;

export async function loadTemplate(id: string): Promise<TemplateConfig> {
  if (!/^[a-z0-9-]+$/.test(id)) throw new Error("Template id inválido.");
  const raw = await readFile(join(projectRoot, "templates", id, "template.json"), "utf8");
  const template = TemplateSchema.parse(JSON.parse(raw));
  if (template.id !== id) throw new Error("Template id não corresponde ao diretório.");
  return template;
}
