import { z } from "zod";

export const ContentStateSchema = z.enum([
  "IDEA",
  "STRATEGY_READY",
  "COPY_DRAFT",
  "COPY_REVIEW",
  "COPY_APPROVED",
  "VISUAL_DIRECTION",
  "ASSET_PRODUCTION",
  "VISUAL_PRODUCTION",
  "VISUAL_REVIEW",
  "CHANGES_REQUESTED",
  "AWAITING_APPROVAL",
  "APPROVED",
  "SCHEDULED",
  "PUBLISHING",
  "PUBLISHED",
  "PUBLISHED_SIMULATED",
  "REJECTED",
  "FAILED"
]);
export type ContentState = z.infer<typeof ContentStateSchema>;

export const ContentFormatSchema = z.enum(["feed", "story", "carousel", "reel_cover", "square"]);
export type ContentFormat = z.infer<typeof ContentFormatSchema>;

export const PublicationTargetSchema = z.enum(["feed", "story"]);
export type PublicationTarget = z.infer<typeof PublicationTargetSchema>;

export const BriefSchema = z.object({
  content_id: z.string().min(3),
  objective: z.string().min(5),
  topic: z.string().min(5),
  audience: z.string().min(3).default("motoristas e proprietários de veículos"),
  requested_format: ContentFormatSchema.default("feed"),
  planned_date: z.string().datetime().nullable().default(null),
  notes: z.string().default(""),
  commercial_data: z.record(z.string(), z.unknown()).default({})
});
export type Brief = z.infer<typeof BriefSchema>;

export const StrategySchema = z.object({
  content_id: z.string(),
  objective: z.string(),
  pillar: z.string(),
  funnel_stage: z.enum(["awareness", "consideration", "conversion", "relationship"]),
  format: ContentFormatSchema,
  topic: z.string(),
  angle: z.string(),
  hook: z.string(),
  cta_goal: z.string(),
  requires_real_truck_photo: z.boolean(),
  requires_generated_asset: z.boolean(),
  commercial_claims_to_confirm: z.array(z.string())
});
export type Strategy = z.infer<typeof StrategySchema>;

export const CopySchema = z.object({
  headline: z.string().min(3).max(80),
  supporting_text: z.string().min(3).max(180),
  cta: z.string().min(3).max(120),
  caption: z.string().min(20).max(2200),
  hashtags: z.array(z.string().regex(/^#[\p{L}\p{N}_]+$/u)).max(12),
  carousel_slides: z.array(z.object({
    slide: z.number().int().positive(),
    title: z.string(),
    body: z.string()
  })).default([]),
  accessibility_description: z.string().min(10),
  alt_text: z.string().min(10).max(1000)
});
export type Copy = z.infer<typeof CopySchema>;

export const ReviewProblemSchema = z.object({
  severity: z.enum(["low", "medium", "high"]),
  category: z.string(),
  description: z.string()
});

export const CopyReviewSchema = z.object({
  approved: z.boolean(),
  score: z.number().int().min(0).max(100),
  problems: z.array(ReviewProblemSchema),
  required_changes: z.array(z.string()),
  final_copy: CopySchema
});
export type CopyReview = z.infer<typeof CopyReviewSchema>;

export const VisualDirectionSchema = z.object({
  concept: z.string(),
  content_type: z.enum(["educational", "commercial", "institutional", "campaign"]),
  visual_metaphor: z.string(),
  main_element: z.string(),
  composition: z.string(),
  background: z.string(),
  accent: z.string(),
  hierarchy: z.array(z.string()),
  depth: z.string(),
  headline: z.string(),
  supporting_text: z.string(),
  cta: z.string(),
  template: z.string(),
  colors: z.array(z.string()),
  fonts: z.array(z.string()),
  shadow_style: z.string(),
  safe_areas: z.object({ top: z.number(), right: z.number(), bottom: z.number(), left: z.number() }),
  generated_assets: z.array(z.string()),
  locked_assets: z.array(z.string())
});
export type VisualDirection = z.infer<typeof VisualDirectionSchema>;

export const LayoutChecksSchema = z.object({
  overflow: z.boolean(),
  clipped_text: z.boolean(),
  fonts_loaded: z.boolean(),
  missing_images: z.boolean(),
  logo_ratio_delta: z.number(),
  logo_width_px: z.number(),
  truck_source_hash_preserved: z.boolean(),
  minimum_contrast_ratio: z.number(),
  dimensions_valid: z.boolean()
});

export const VisualReviewSchema = z.object({
  approved: z.boolean(),
  score: z.number().int().min(0).max(100),
  problems: z.array(ReviewProblemSchema),
  required_changes: z.array(z.string()),
  strengths: z.array(z.string()),
  checks: LayoutChecksSchema
});
export type VisualReview = z.infer<typeof VisualReviewSchema>;

export const RenderManifestSchema = z.object({
  content_id: z.string(),
  version: z.number().int().positive(),
  template: z.string(),
  created_at: z.string().datetime(),
  dimensions: z.object({ width: z.number().int(), height: z.number().int() }),
  final_png: z.string(),
  preview_png: z.string(),
  image_hash: z.string().length(64),
  caption_hash: z.string().length(64),
  texts: CopySchema,
  assets: z.array(z.object({
    role: z.string(),
    path: z.string(),
    sha256: z.string().length(64),
    locked: z.boolean()
  })),
  visual_direction: VisualDirectionSchema,
  copy_review: CopyReviewSchema,
  visual_review: VisualReviewSchema.nullable(),
  layout_checks: LayoutChecksSchema,
  reference_files: z.array(z.string())
});
export type RenderManifest = z.infer<typeof RenderManifestSchema>;

export const ApprovalSchema = z.object({
  content_id: z.string(),
  version: z.number().int().positive(),
  decision: z.enum(["approved", "changes_requested", "rejected", "postponed"]),
  approver_user: z.string(),
  chat_id: z.string(),
  decided_at: z.string().datetime(),
  approved_image_hash: z.string().length(64).nullable(),
  approved_caption_hash: z.string().length(64).nullable(),
  comment: z.string().default(""),
  simulated: z.boolean().default(false)
});
export type Approval = z.infer<typeof ApprovalSchema>;

export const ChangeRequestSchema = z.object({
  content_id: z.string(),
  from_version: z.number().int().positive(),
  to_version: z.number().int().positive(),
  instruction: z.string().min(3),
  requested_by: z.string(),
  requested_at: z.string().datetime(),
  return_stage: z.enum(["COPY_DRAFT", "VISUAL_DIRECTION", "ASSET_PRODUCTION", "VISUAL_PRODUCTION"])
});

export const TransitionSchema = z.object({
  content_id: z.string(),
  version: z.number().int().positive(),
  from: ContentStateSchema,
  to: ContentStateSchema,
  at: z.string().datetime(),
  actor: z.string(),
  reason: z.string(),
  metadata: z.record(z.string(), z.unknown()).default({})
});
export type Transition = z.infer<typeof TransitionSchema>;

export const PublicationSchema = z.object({
  content_id: z.string(),
  version: z.number().int().positive(),
  target: PublicationTargetSchema.default("feed"),
  mode: z.enum(["dry-run", "staging", "production"]),
  idempotency_key: z.string(),
  media_id: z.string(),
  permalink: z.string().url().nullable(),
  published_at: z.string().datetime(),
  simulated: z.boolean(),
  response: z.record(z.string(), z.unknown())
});
export type Publication = z.infer<typeof PublicationSchema>;

export interface ContentRecord {
  id: string;
  state: ContentState;
  version: number;
  brief: Brief;
  strategy?: Strategy;
  copy?: Copy;
  copyReview?: CopyReview;
  visualDirection?: VisualDirection;
  render?: RenderManifest;
  visualReview?: VisualReview;
  approvals: Approval[];
  changeRequests: z.infer<typeof ChangeRequestSchema>[];
  transitions: Transition[];
  publications: Publication[];
  automaticRevisionAttempts: number;
  scheduledFor?: string;
  versionHistory: Array<{
    version: number;
    state: ContentState;
    snapshot_hash: string;
    created_at: string;
    render_image_hash: string | null;
    caption_hash: string | null;
  }>;
}
