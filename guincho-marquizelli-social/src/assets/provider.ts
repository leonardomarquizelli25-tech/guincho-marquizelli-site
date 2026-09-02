import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { config, projectRoot } from "../config.js";
import { WorkflowError } from "../utils/errors.js";

export interface AssetRequest {
  id: string;
  prompt: string;
  transparent: boolean;
}

export interface AssetResult {
  provider: "mock" | "openai";
  path: string;
  model: string | null;
  simulated: boolean;
}

export interface AssetProvider {
  generate(request: AssetRequest): Promise<AssetResult>;
}

export class MockAssetProvider implements AssetProvider {
  async generate(_request: AssetRequest): Promise<AssetResult> {
    return {
      provider: "mock",
      path: join(projectRoot, "brand", "generated-assets", "warning-triangle-3d.png"),
      model: null,
      simulated: true
    };
  }
}

export class OpenAIAssetProvider implements AssetProvider {
  async generate(request: AssetRequest): Promise<AssetResult> {
    if (!config.OPENAI_API_KEY || !config.OPENAI_IMAGE_MODEL) {
      throw new WorkflowError("OPENAI_API_KEY e OPENAI_IMAGE_MODEL são obrigatórios para geração real.", "ASSET_PROVIDER_NOT_CONFIGURED");
    }
    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { authorization: `Bearer ${config.OPENAI_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({
        model: config.OPENAI_IMAGE_MODEL,
        prompt: request.prompt,
        size: "1024x1024",
        quality: "high",
        output_format: "png"
      })
    });
    if (!response.ok) throw new WorkflowError(`Falha no provedor de imagem (${response.status}).`, "ASSET_PROVIDER_ERROR", response.status < 400 || response.status >= 500);
    const body = await response.json() as { data?: Array<{ b64_json?: string }> };
    const data = body.data?.[0]?.b64_json;
    if (!data) throw new WorkflowError("Provedor de imagem não retornou dados.", "ASSET_PROVIDER_EMPTY_RESPONSE");
    const directory = join(projectRoot, "brand", "generated-assets");
    await mkdir(directory, { recursive: true });
    const path = join(directory, `${request.id}.png`);
    await writeFile(path, Buffer.from(data, "base64"));
    return { provider: "openai", path, model: config.OPENAI_IMAGE_MODEL, simulated: false };
  }
}
