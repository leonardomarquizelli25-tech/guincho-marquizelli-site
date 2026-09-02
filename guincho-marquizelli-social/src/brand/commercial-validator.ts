import type { Brand } from "./load.js";
import { loadBrand } from "./load.js";

export interface ClaimFinding {
  severity: "low" | "medium" | "high";
  code: string;
  message: string;
  match: string;
  requiresConfirmation: boolean;
}

const normalize = (value: string) => value
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase();

const prohibitedPatterns: Array<[RegExp, string]> = [
  [/\b(nos|a gente)\s+(consertamos|reparamos|diagnosticamos|trocamos)\b/i, "Oferta direta de reparo mecânico"],
  [/\bnoss[ao]s?\s+mec[aâ]nic[oa]s?\b/i, "Atribuição de equipe mecânica"],
  [/\b(resolve|resolvemos|resolveremos)\s+(a\s+)?pane\s+(no\s+local|aqui)\b/i, "Promessa de resolver pane no local"],
  [/\b(fa[cç]a|agende)\s+(sua\s+)?manuten[cç][aã]o\s+(conosco|aqui)\b/i, "Oferta de manutenção"],
  [/\b(traga|leve)\s+.{0,30}\s+(nossa\s+)?oficina\b/i, "Apresentação como oficina"],
  [/\bdiagn[oó]stico\s+mec[aâ]nico\s+(conosco|pela\s+marquizelli|na\s+marquizelli)\b/i, "Oferta de diagnóstico mecânico"],
  [/\b(autoel[eé]trica|borracharia|troca\s+de\s+[oó]leo|troca\s+de\s+pe[cç]as)\s+(marquizelli|conosco|aqui)\b/i, "Serviço proibido"],
  [/\bmarquiselle\b|\bmarquezelli\b|\bmarquizeli\b/i, "Grafia incorreta da marca"]
];

const confirmationPatterns: Array<[RegExp, string]> = [
  [/\b24\s*(h|horas)\b/i, "Horário 24 horas"],
  [/\bR\$\s*\d|\b(pre[cç]o|valor)\s+(a partir|fixo|promocional)/i, "Preço"],
  [/\b(pix|cart[aã]o|dinheiro|d[eé]bito|cr[eé]dito|parcel)/i, "Forma de pagamento"],
  [/\bwhats(app)?\b/i, "WhatsApp"],
  [/\b(em|para|na regi[aã]o de)\s+(mar[ií]lia|bauru|assis|tup[aã]|gar[cç]a)\b/i, "Área atendida"],
  [/\b(chegamos|atendemos|atendimento)\s+em\s+\d+\s*(min|minutos|horas)\b/i, "Tempo de chegada"],
  [/\b(reboque|guincho)\s+(leve|pesado|de caminh[oõ]es|de tratores)\b/i, "Modalidade específica"]
];

export function validateCommercialClaims(text: string, brand: Brand = loadBrand()): ClaimFinding[] {
  const findings: ClaimFinding[] = [];
  const digitsOnly = (value: string) => value.replace(/\D/g, "");
  const confirmedPhones = new Set(
    [brand.company.phone, ...brand.company.phones]
      .filter((value): value is string => Boolean(value))
      .map(digitsOnly)
  );
  for (const [pattern, description] of prohibitedPatterns) {
    const match = text.match(pattern)?.[0];
    if (match) findings.push({
      severity: "high",
      code: "PROHIBITED_SERVICE_OR_BRAND",
      message: description,
      match,
      requiresConfirmation: false
    });
  }
  for (const claim of brand.prohibited_claims) {
    if (normalize(text).includes(normalize(claim))) findings.push({
      severity: "high",
      code: "PROHIBITED_CLAIM",
      message: `Afirmação proibida: ${claim}`,
      match: claim,
      requiresConfirmation: false
    });
  }
  for (const [pattern, description] of confirmationPatterns) {
    const match = text.match(pattern)?.[0];
    if (match) findings.push({
      severity: "high",
      code: "UNCONFIRMED_COMMERCIAL_DATA",
      message: `${description} não confirmado em brand/brand.json`,
      match,
      requiresConfirmation: true
    });
  }
  for (const match of text.matchAll(/\(?\d{2}\)?\s*9?\d{4}[-\s]?\d{4}/g)) {
    if (!confirmedPhones.has(digitsOnly(match[0]))) findings.push({
      severity: "high",
      code: "UNCONFIRMED_COMMERCIAL_DATA",
      message: "Telefone não confirmado em brand/brand.json",
      match: match[0],
      requiresConfirmation: true
    });
  }
  return findings.filter((finding, index, all) =>
    all.findIndex((item) => item.code === finding.code && item.match === finding.match) === index
  );
}

export function assertCommerciallySafe(text: string, brand: Brand = loadBrand()): void {
  const findings = validateCommercialClaims(text, brand);
  if (findings.some((item) => item.severity === "high")) {
    throw new Error(`Conteúdo comercial bloqueado: ${findings.map((item) => item.message).join("; ")}`);
  }
}
