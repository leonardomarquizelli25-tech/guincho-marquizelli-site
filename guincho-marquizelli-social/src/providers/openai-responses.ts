import { config } from "../config.js";
import { WorkflowError } from "../utils/errors.js";

export interface StructuredOutputRequest {
  model: string;
  schemaName: string;
  jsonSchema: Record<string, unknown>;
  system: string;
  userContent: Array<Record<string, unknown>>;
}

interface ResponsesApiPayload {
  output?: Array<{
    content?: Array<{ type?: string; text?: string }>;
  }>;
}

export async function requestStructuredOutput(request: StructuredOutputRequest): Promise<unknown> {
  if (!config.OPENAI_API_KEY) {
    throw new WorkflowError("OPENAI_API_KEY é obrigatória para o provedor OpenAI.", "OPENAI_NOT_CONFIGURED");
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      authorization: `Bearer ${config.OPENAI_API_KEY}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model: request.model,
      store: false,
      input: [
        { role: "system", content: [{ type: "input_text", text: request.system }] },
        { role: "user", content: request.userContent }
      ],
      text: {
        format: {
          type: "json_schema",
          name: request.schemaName,
          strict: true,
          schema: request.jsonSchema
        }
      }
    })
  });

  if (!response.ok) {
    throw new WorkflowError(
      `OpenAI respondeu ${response.status}.`,
      "OPENAI_API_ERROR",
      response.status === 408 || response.status === 409 || response.status === 429 || response.status >= 500
    );
  }

  const body = await response.json() as ResponsesApiPayload;
  const text = body.output
    ?.flatMap((item) => item.content ?? [])
    .find((item) => item.type === "output_text" && typeof item.text === "string")
    ?.text;
  if (!text) throw new WorkflowError("OpenAI não retornou saída estruturada.", "OPENAI_EMPTY_RESPONSE");

  try {
    return JSON.parse(text);
  } catch {
    throw new WorkflowError("OpenAI retornou JSON inválido.", "OPENAI_INVALID_JSON");
  }
}
