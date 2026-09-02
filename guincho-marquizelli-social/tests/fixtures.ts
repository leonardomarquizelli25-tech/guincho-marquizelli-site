import type { AppConfig } from "../src/config.js";
import { config } from "../src/config.js";
import type { ContentRecord, RenderManifest } from "../src/schemas/index.js";

export const safeCopy = {
  headline: "O CARRO DEU SINAIS?",
  supporting_text: "Pare com segurança e evite insistir.",
  cta: "Se não puder seguir, solicite o reboque.",
  caption: "Ruídos e luzes podem indicar atenção. Se houver risco, pare com segurança. Caso não possa seguir, solicite o reboque.",
  hashtags: ["#GuinchoMarquizelli", "#Reboque"],
  carousel_slides: [],
  accessibility_description: "Arte educativa com caminhão real e mensagem de segurança.",
  alt_text: "Arte educativa da Guincho Marquizelli sobre sinais de pane."
};

export const fakeRender: RenderManifest = {
  content_id: "fixture-001",
  version: 1,
  template: "educativo-alerta",
  created_at: new Date().toISOString(),
  dimensions: { width: 1080, height: 1350 },
  final_png: "output/fixture-001/v1/final.png",
  preview_png: "output/fixture-001/v1/preview.png",
  image_hash: "a".repeat(64),
  caption_hash: "b".repeat(64),
  texts: safeCopy,
  assets: [],
  visual_direction: {
    concept: "Sinais", content_type: "educational", visual_metaphor: "alerta", main_element: "foto real", composition: "assimétrica", background: "preto", accent: "amarelo", hierarchy: ["headline", "foto", "cta"], depth: "sobreposição", headline: safeCopy.headline, supporting_text: safeCopy.supporting_text, cta: safeCopy.cta, template: "educativo-alerta", colors: ["#E31E24", "#1A1A1A"], fonts: ["Oswald", "Barlow"], shadow_style: "suave", safe_areas: { top: 64, right: 64, bottom: 64, left: 64 }, generated_assets: [], locked_assets: []
  },
  copy_review: { approved: true, score: 100, problems: [], required_changes: [], final_copy: safeCopy },
  visual_review: null,
  layout_checks: { overflow: false, clipped_text: false, fonts_loaded: true, missing_images: false, logo_ratio_delta: 0, logo_width_px: 250, truck_source_hash_preserved: true, minimum_contrast_ratio: 14.1, dimensions_valid: true },
  reference_files: []
};

export function approvedRecord(): ContentRecord {
  return {
    id: "fixture-001",
    state: "APPROVED",
    version: 1,
    brief: { content_id: "fixture-001", objective: "Educar motoristas", topic: "Sinais de pane", audience: "motoristas", requested_format: "feed", planned_date: null, notes: "", commercial_data: {} },
    approvals: [{ content_id: "fixture-001", version: 1, decision: "approved", approver_user: "human", chat_id: "1", decided_at: new Date().toISOString(), approved_image_hash: fakeRender.image_hash, approved_caption_hash: fakeRender.caption_hash, comment: "", simulated: false }],
    changeRequests: [], transitions: [], publications: [], automaticRevisionAttempts: 0, versionHistory: [],
    render: structuredClone(fakeRender),
    visualReview: { approved: true, score: 100, problems: [], required_changes: [], strengths: [], checks: fakeRender.layout_checks }
  };
}

export function productionConfig(): AppConfig {
  return { ...config, APP_ENV: "production", ENABLE_REAL_PUBLISHING: true, APPROVAL_REQUIRED: true, META_ACCESS_TOKEN: "secret", INSTAGRAM_ACCOUNT_ID: "123", PUBLIC_MEDIA_BASE_URL: "https://media.example/", INSTAGRAM_API_VERSION: "v24.0" };
}
