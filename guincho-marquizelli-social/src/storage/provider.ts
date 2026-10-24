import { mkdir } from "node:fs/promises";
import sharp from "sharp";
import { config, type AppConfig } from "../config.js";
import type { PublicationTarget, RenderManifest } from "../schemas/index.js";
import { WorkflowError } from "../utils/errors.js";
import { containedPath, privateOutputPath, publicMediaRoot } from "../security/paths.js";

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
    const sourcePath = privateOutputPath(render.final_png);
    if (!/^[a-f0-9]{64}$/.test(render.image_hash)) throw new WorkflowError("Hash de mídia inválido.", "INVALID_MEDIA_HASH");
    const filename = `${render.image_hash}-${target}.jpg`;
    const outputPath = containedPath(publicMediaRoot, filename);
    await mkdir(publicMediaRoot, { recursive: true });
    const image = sharp(sourcePath).rotate().flatten({ background: "#1A1A1A" });
    const metadata = await image.metadata();
    if (metadata.width !== 1080) throw new WorkflowError("A imagem de publicação precisa ter 1080 px de largura.", "INVALID_MEDIA_DIMENSIONS");
    if (target === "story" && metadata.height !== 1920) throw new WorkflowError("O Story precisa ter 1080x1920.", "INVALID_MEDIA_DIMENSIONS");
    if (target === "feed" && ![1080, 1350, 1440].includes(metadata.height ?? 0)) throw new WorkflowError("Dimensão de Feed não suportada pelo fluxo.", "INVALID_MEDIA_DIMENSIONS");
    await image.jpeg({ quality: 95, chromaSubsampling: "4:4:4" }).toFile(outputPath);
    return new URL(filename, `${this.appConfig.PUBLIC_MEDIA_BASE_URL.replace(/\/$/, "")}/`).toString();
  }
}

export function createMediaStorage(appConfig: AppConfig = config): MediaStorage {
  return appConfig.APP_ENV === "dry-run" ? new MockMediaStorage() : new ConfiguredPublicStorage(appConfig);
}
