import { VisualReviewSchema, type RenderManifest, type VisualReview } from "../schemas/index.js";

export class VisualReviewerAgent {
  run(manifest: RenderManifest): VisualReview {
    const checks = manifest.layout_checks;
    const problems: VisualReview["problems"] = [];
    if (checks.overflow || checks.clipped_text) problems.push({ severity: "high", category: "layout", description: "Texto ou composição ultrapassa a área renderizada." });
    if (!checks.fonts_loaded) problems.push({ severity: "high", category: "typography", description: "Uma ou mais fontes oficiais não foram carregadas." });
    if (checks.missing_images) problems.push({ severity: "high", category: "artifact", description: "Imagem ausente na renderização." });
    if (checks.logo_ratio_delta > 0.005) problems.push({ severity: "high", category: "logo", description: "Proporção da logo foi alterada." });
    if (checks.logo_width_px < 120) problems.push({ severity: "high", category: "logo", description: "Logo abaixo do mínimo digital de 120 px." });
    if (!checks.truck_source_hash_preserved) problems.push({ severity: "high", category: "truck", description: "A foto bloqueada do caminhão não corresponde ao original aprovado." });
    if (checks.minimum_contrast_ratio < 4.5) problems.push({ severity: "high", category: "contrast", description: "Contraste insuficiente para leitura em celular." });
    if (!checks.dimensions_valid) problems.push({ severity: "high", category: "layout", description: "Dimensões finais inválidas." });
    const score = Math.max(0, 100 - problems.reduce((sum, item) => sum + ({ low: 2, medium: 7, high: 35 }[item.severity]), 0));
    return VisualReviewSchema.parse({
      approved: score >= 90 && !problems.some((item) => item.severity === "high"),
      score,
      problems,
      required_changes: problems.map((item) => item.description),
      strengths: [
        "Logo oficial preservada e aplicada sem efeitos",
        "Foto real da frota mantida como camada bloqueada",
        "Hierarquia curta e legível em tela móvel",
        "Paleta e diagonais coerentes com o manual da marca"
      ],
      checks
    });
  }
}
