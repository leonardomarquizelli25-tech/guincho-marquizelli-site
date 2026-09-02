import { VisualDirectionSchema, type Copy, type Strategy, type VisualDirection } from "../schemas/index.js";

export class ArtDirectorAgent {
  run(strategy: Strategy, copy: Copy): VisualDirection {
    return VisualDirectionSchema.parse({
      concept: "Sinais antes da pane",
      content_type: "educational",
      visual_metaphor: "Triângulo de sinalização antecipando a interrupção segura da viagem",
      main_element: "Fotografia real bloqueada do caminhão e triângulo 3D genérico",
      composition: "Bloco tipográfico assimétrico no alto à esquerda; fotografia real em grande escala no terço inferior e direito; diagonal vermelha conduzindo o olhar ao CTA",
      background: "Preto industrial com massa clara e recorte diagonal vermelho de 10 graus",
      accent: "Amarelo somente no marcador de alerta e no pequeno filete do CTA",
      hierarchy: ["headline", "supporting_text", "truck_photo", "cta", "official_logo"],
      depth: "Sobreposição da foto sobre a diagonal, com sombra externa discreta no asset genérico, nunca na logo",
      headline: copy.headline,
      supporting_text: copy.supporting_text,
      cta: copy.cta,
      template: "educativo-alerta",
      colors: ["#E31E24", "#1A1A1A", "#FFC72C", "#F4F4F4"],
      fonts: ["Oswald 700", "Barlow 400/700"],
      shadow_style: "Sombra suave e curta somente nos objetos, sem glow",
      safe_areas: { top: 64, right: 64, bottom: 64, left: 64 },
      generated_assets: ["brand/generated-assets/warning-triangle-3d.png"],
      locked_assets: ["brand/logos/logo-oficial.png", "brand/trucks/approved/IMG_1773.JPG"]
    });
  }
}
