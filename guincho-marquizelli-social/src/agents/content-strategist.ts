import { StrategySchema, type Brief, type Strategy } from "../schemas/index.js";
import { validateCommercialClaims } from "../brand/commercial-validator.js";

export class ContentStrategistAgent {
  run(brief: Brief, recentTopics: string[] = []): Strategy {
    const claims = validateCommercialClaims(JSON.stringify(brief.commercial_data));
    const repeated = recentTopics.some((topic) => topic.toLowerCase() === brief.topic.toLowerCase());
    return StrategySchema.parse({
      content_id: brief.content_id,
      objective: brief.objective,
      pillar: "educação automotiva",
      funnel_stage: "awareness",
      format: brief.requested_format,
      topic: brief.topic,
      angle: repeated
        ? "abordagem de segurança: sinais, parada segura e decisão de solicitar reboque"
        : "orientação preventiva, sem diagnóstico, com foco em parada segura",
      hook: "O CARRO DEU SINAIS?",
      cta_goal: "orientar a solicitar reboque quando o veículo não puder seguir com segurança",
      requires_real_truck_photo: true,
      requires_generated_asset: true,
      commercial_claims_to_confirm: claims.filter((item) => item.requiresConfirmation).map((item) => item.message)
    });
  }
}
