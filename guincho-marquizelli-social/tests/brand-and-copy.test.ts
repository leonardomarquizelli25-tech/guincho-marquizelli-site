import { describe, expect, it } from "vitest";
import { BriefSchema } from "../src/schemas/index.js";
import { validateCommercialClaims } from "../src/brand/commercial-validator.js";
import { CopyReviewerAgent } from "../src/agents/copy-reviewer.js";
import { safeCopy } from "./fixtures.js";
import { validateBrandAssets } from "../src/brand/validator.js";

describe("briefing, marca e revisão comercial", () => {
  it("valida briefing estruturado", () => {
    expect(BriefSchema.parse({ content_id: "abc-001", objective: "Educar motoristas", topic: "Sinais de pane", audience: "motoristas", requested_format: "feed", planned_date: null, notes: "", commercial_data: {} }).content_id).toBe("abc-001");
    expect(() => BriefSchema.parse({ content_id: "x", objective: "a", topic: "b" })).toThrow();
  });

  it("permite educação mecânica sem oferecer oficina", () => {
    expect(validateCommercialClaims("A luz da bateria pode indicar atenção. Se não puder seguir, solicite o reboque.")).toEqual([]);
  });

  it("permite os telefones confirmados da marca", () => {
    expect(validateCommercialClaims("Ligue (14) 99703-6966 ou (14) 99904-1010.")).toEqual([]);
  });

  it.each([
    ["Nós consertamos seu veículo.", "PROHIBITED"],
    ["Nossos mecânicos irão até você.", "PROHIBITED"],
    ["Atendimento 24 horas.", "UNCONFIRMED"],
    ["Ligue (14) 99999-9999.", "UNCONFIRMED"],
    ["Guincho Marquizeli", "PROHIBITED"]
  ])("bloqueia serviço/dado indevido: %s", (text) => {
    expect(validateCommercialClaims(text).some((item) => item.severity === "high")).toBe(true);
  });

  it("aprova copy segura e rejeita aparência de oficina", () => {
    const reviewer = new CopyReviewerAgent();
    expect(reviewer.run(safeCopy).approved).toBe(true);
    const unsafe = reviewer.run({ ...safeCopy, caption: `${safeCopy.caption} Nós consertamos seu veículo.` });
    expect(unsafe.approved).toBe(false);
    expect(unsafe.problems.some((item) => item.severity === "high")).toBe(true);
  });

  it("valida logo, fontes, paleta e dimensões oficiais", async () => {
    const report = await validateBrandAssets();
    expect(report.approved).toBe(true);
  });
});
