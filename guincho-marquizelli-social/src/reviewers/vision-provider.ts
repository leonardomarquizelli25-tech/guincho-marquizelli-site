import { readFile } from "node:fs/promises";
import { extname } from "node:path";
import type { z } from "zod";
import { config } from "../config.js";
import { requestStructuredOutput } from "../providers/openai-responses.js";
import { WorkflowError } from "../utils/errors.js";

export interface VisionReviewRequest<T> {
  imagePath: string;
  schemaName: string;
  jsonSchema: Record<string, unknown>;
  instructions: string;
  mockValue: T;
}

export interface VisionReviewResult<T> {
  data: T;
  model: string | null;
  simulated: boolean;
}

export interface VisionProvider {
  reviewStructured<T>(request: VisionReviewRequest<T>, schema: z.ZodType<T>): Promise<VisionReviewResult<T>>;
}

export class MockVisionProvider implements VisionProvider {
  async reviewStructured<T>(request: VisionReviewRequest<T>, schema: z.ZodType<T>): Promise<VisionReviewResult<T>> {
    return { data: schema.parse(request.mockValue), model: null, simulated: true };
  }
}

function mimeType(path: string): string {
  const extension = extname(path).toLowerCase();
  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
  if (extension === ".webp") return "image/webp";
  return "image/png";
}

export class OpenAIVisionProvider implements VisionProvider {
  async reviewStructured<T>(request: VisionReviewRequest<T>, schema: z.ZodType<T>): Promise<VisionReviewResult<T>> {
    if (!config.OPENAI_VISION_MODEL) {
      throw new WorkflowError("OPENAI_VISION_MODEL é obrigatório para revisão visual real.", "OPENAI_VISION_MODEL_NOT_CONFIGURED");
    }
    const image = await readFile(request.imagePath);
    const dataUri = `data:${mimeType(request.imagePath)};base64,${image.toString("base64")}`;
    const raw = await requestStructuredOutput({
      model: config.OPENAI_VISION_MODEL,
      schemaName: request.schemaName,
      jsonSchema: request.jsonSchema,
      system: "Você é um revisor visual de publicidade automotiva. Não invente fatos comerciais e reporte incerteza.",
      userContent: [
        { type: "input_text", text: request.instructions },
        { type: "input_image", image_url: dataUri, detail: "high" }
      ]
    });
    return { data: schema.parse(raw), model: config.OPENAI_VISION_MODEL, simulated: false };
  }
}
