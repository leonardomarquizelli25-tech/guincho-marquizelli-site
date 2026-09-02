import { access } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { MockTextProvider } from "../src/agents/text-provider.js";
import { MockAssetProvider } from "../src/assets/provider.js";
import { MockVisionProvider } from "../src/reviewers/vision-provider.js";

const ResultSchema = z.object({ approved: z.boolean(), score: z.number().int().min(0).max(100) });

describe("provedores configuráveis e mocks", () => {
  it("valida as saídas mock de texto e visão com Zod", async () => {
    const request = {
      schemaName: "review_result",
      jsonSchema: { type: "object" },
      system: "revisar",
      prompt: "conteúdo seguro",
      instructions: "analise a imagem",
      imagePath: "não-lido-no-mock.png",
      mockValue: { approved: true, score: 100 }
    };
    const text = await new MockTextProvider().generateStructured(request, ResultSchema);
    const vision = await new MockVisionProvider().reviewStructured(request, ResultSchema);
    expect(text).toEqual({ data: request.mockValue, model: null, simulated: true });
    expect(vision).toEqual({ data: request.mockValue, model: null, simulated: true });
  });

  it("retorna o asset local gerado sem chamar serviço externo", async () => {
    const asset = await new MockAssetProvider().generate({ id: "triangulo", prompt: "triângulo", transparent: true });
    await expect(access(asset.path)).resolves.toBeUndefined();
    expect(asset.provider).toBe("mock");
    expect(asset.simulated).toBe(true);
  });
});
