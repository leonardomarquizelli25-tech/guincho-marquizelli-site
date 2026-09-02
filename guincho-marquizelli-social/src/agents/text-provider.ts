import type { z } from "zod";
import { config } from "../config.js";
import { requestStructuredOutput } from "../providers/openai-responses.js";
import { WorkflowError } from "../utils/errors.js";

export interface TextGenerationRequest<T> {
  schemaName: string;
  jsonSchema: Record<string, unknown>;
  system: string;
  prompt: string;
  mockValue: T;
}

export interface TextGenerationResult<T> {
  data: T;
  model: string | null;
  simulated: boolean;
}

export interface TextProvider {
  generateStructured<T>(request: TextGenerationRequest<T>, schema: z.ZodType<T>): Promise<TextGenerationResult<T>>;
}

export class MockTextProvider implements TextProvider {
  async generateStructured<T>(request: TextGenerationRequest<T>, schema: z.ZodType<T>): Promise<TextGenerationResult<T>> {
    return { data: schema.parse(request.mockValue), model: null, simulated: true };
  }
}

export class OpenAITextProvider implements TextProvider {
  async generateStructured<T>(request: TextGenerationRequest<T>, schema: z.ZodType<T>): Promise<TextGenerationResult<T>> {
    if (!config.OPENAI_TEXT_MODEL) {
      throw new WorkflowError("OPENAI_TEXT_MODEL é obrigatório para geração real.", "OPENAI_TEXT_MODEL_NOT_CONFIGURED");
    }
    const raw = await requestStructuredOutput({
      model: config.OPENAI_TEXT_MODEL,
      schemaName: request.schemaName,
      jsonSchema: request.jsonSchema,
      system: request.system,
      userContent: [{ type: "input_text", text: request.prompt }]
    });
    return { data: schema.parse(raw), model: config.OPENAI_TEXT_MODEL, simulated: false };
  }
}
