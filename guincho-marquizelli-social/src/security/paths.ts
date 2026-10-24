import { resolve, sep } from "node:path";
import { projectRoot } from "../config.js";
import { ContentIdSchema } from "../schemas/index.js";

export const privateOutputRoot = resolve(projectRoot, "output");
export const publicMediaRoot = resolve(projectRoot, "public-media");

export function containedPath(root: string, ...parts: string[]): string {
  const target = resolve(root, ...parts);
  if (!target.startsWith(resolve(root) + sep)) throw new Error("Caminho fora do diretório permitido.");
  return target;
}

export function contentDirectory(contentId: string, version: number): string {
  ContentIdSchema.parse(contentId);
  if (!Number.isSafeInteger(version) || version < 1) throw new Error("Versão inválida.");
  return containedPath(privateOutputRoot, contentId, `v${version}`);
}

export function privateOutputPath(relativePath: string): string {
  return containedPath(privateOutputRoot, resolve(projectRoot, relativePath));
}
