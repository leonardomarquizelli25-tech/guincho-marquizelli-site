import { mkdir } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import sharp from "sharp";
import { config, projectRoot, type AppConfig } from "../config.js";
import type { PublicationTarget, RenderManifest } from "../schemas/index.js";
import { WorkflowError } from "../utils/errors.js";

export interface MediaStorage {
  publicUrl(render: RenderManifest, target?: PublicationTarget): Promise<string>;
}

export class MockMediaStorage implements MediaStorage {
  async publicUrl(render: RenderManifest, target: PublicationTarget = "feed"): Promise<string> {
    return `https://dry-run.invalid/${encodeURIComponent(render.content_id)}/v${render.version}/${render.image_hash}-${target}.jpg`;
  }
}

export class ConfiguredPublicStorage implements MediaStorage {
  constructor(private readonly appConfig: AppConfig = config) {}

  async publicUrl(render: RenderManifest, target: PublicationTarget = "feed"): Promise<string> {
    if (!this.appConfig.PUBLIC_MEDIA_BASE_URL) throw new WorkflowError("PUBLIC_MEDIA_BASE_URL não configurada.", "PUBLIC_MEDIA_URL_REQUIRED");
    const sourcePath = resolve(projectRoot, render.final_png);
    const outputPath = resolve(dirname(sourcePath), `instagram-${target}.jpg`);
    await mkdir(dirname(outputPath), { recursive: true });
    const image = sharp(sourcePath).rotate().flatten({ background: "#1A1A1A" });
    const metadata = await image.metadata();
    if (metadata.width !== 1080) throw new WorkflowError("A imagem de publicação precisa ter 1080 px de largura.", "INVALID_MEDIA_DIMENSIONS");
    if (target === "story" && metadata.height !== 1920) throw new WorkflowError("O Story precisa ter 1080x1920.", "INVALID_MEDIA_DIMENSIONS");
    if (target === "feed" && ![1080, 1350, 1440].includes(metadata.height ?? 0)) throw new WorkflowError("Dimensão de Feed não suportada pelo fluxo.", "INVALID_MEDIA_DIMENSIONS");
    await image.jpeg({ quality: 95, chromaSubsampling: "4:4:4" }).toFile(outputPath);
    const relativeMediaPath = relative(resolve(projectRoot, "output"), outputPath).replaceAll("\\", "/");
    return new URL(relativeMediaPath, `${this.appConfig.PUBLIC_MEDIA_BASE_URL.replace(/\/$/, "")}/`).toString();
  }
}

export function createMediaStorage(appConfig: AppConfig = config): MediaStorage {
  return appConfig.APP_ENV === "dry-run" ? new MockMediaStorage() : new ConfiguredPublicStorage(appConfig);
}
