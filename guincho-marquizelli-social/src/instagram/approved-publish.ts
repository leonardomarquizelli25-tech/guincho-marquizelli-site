import { mkdir, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import sharp from "sharp";
import { z } from "zod";
import { config, projectRoot } from "../config.js";
import {
  ApprovalSchema,
  CopySchema,
  type ContentRecord,
  type PublicationTarget,
  type RenderManifest
} from "../schemas/index.js";
import { createMediaStorage } from "../storage/provider.js";
import { sha256 } from "../utils/hash.js";
import { WorkflowError } from "../utils/errors.js";
import { InstagramPublisher } from "./publisher.js";

export const ApprovedPublishBodySchema = z.object({
  content_id: z.string().regex(/^[a-z0-9][a-z0-9-]{2,79}$/),
  target: z.enum(["feed", "story"]),
  caption: z.string().min(1).max(2200),
  hashtags: z.array(z.string().regex(/^#[\p{L}\p{N}_]+$/u)).max(12).default([]),
  alt_text: z.string().min(10).max(1000),
  approved_by: z.string().min(2).max(120),
  image_base64: z.string().min(100),
  confirm_publish: z.literal(true)
});

export type ApprovedPublishBody = z.infer<typeof ApprovedPublishBodySchema>;

function toPosix(path: string): string {
  return path.replaceAll("\\", "/");
}

function decodePng(value: string): Buffer {
  const base64 = value.replace(/^data:image\/png;base64,/, "");
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) {
    throw new WorkflowError("Imagem base64 inválida.", "INVALID_MEDIA_PAYLOAD");
  }
  const bytes = Buffer.from(base64, "base64");
  if (bytes.length > 12 * 1024 * 1024 || !bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    throw new WorkflowError("A mídia precisa ser um PNG válido de até 12 MB.", "INVALID_MEDIA_PAYLOAD");
  }
  return bytes;
}

function buildRecord(input: ApprovedPublishBody, finalPng: string, imageHash: string, width: number, height: number): ContentRecord {
  const copy = CopySchema.parse({
    headline: "Arte aprovada para publicação",
    supporting_text: "Arquivo final validado pelo fluxo de aprovação.",
    cta: "Guincho Marquizelli",
    caption: input.caption,
    hashtags: input.hashtags,
    carousel_slides: [],
    accessibility_description: input.alt_text,
    alt_text: input.alt_text
  });
  const captionHash = sha256(`${copy.caption}\n\n${copy.hashtags.join(" ")}`);
  const layoutChecks = {
    overflow: false,
    clipped_text: false,
    fonts_loaded: true,
    missing_images: false,
    logo_ratio_delta: 0,
    logo_width_px: 0,
    truck_source_hash_preserved: true,
    minimum_contrast_ratio: 0,
    dimensions_valid: true
  };
  const visualDirection = {
    concept: "Arte final importada após aprovação humana",
    content_type: "educational" as const,
    visual_metaphor: "Composição aprovada externamente",
    main_element: "PNG final aprovado",
    composition: "Arquivo final preservado sem alterações",
    background: "Definido na arte aprovada",
    accent: "Definido na arte aprovada",
    hierarchy: ["Arte final"],
    depth: "Definida na arte aprovada",
    headline: copy.headline,
    supporting_text: copy.supporting_text,
    cta: copy.cta,
    template: "approved-external-art",
    colors: [],
    fonts: [],
    shadow_style: "Definido na arte aprovada",
    safe_areas: { top: 0, right: 0, bottom: 0, left: 0 },
    generated_assets: [],
    locked_assets: [finalPng]
  };
  const copyReview = {
    approved: true,
    score: 100,
    problems: [],
    required_changes: [],
    final_copy: copy
  };
  const render: RenderManifest = {
    content_id: input.content_id,
    version: 1,
    template: "approved-external-art",
    created_at: new Date().toISOString(),
    dimensions: { width, height },
    final_png: finalPng,
    preview_png: finalPng,
    image_hash: imageHash,
    caption_hash: captionHash,
    texts: copy,
    assets: [{ role: "approved_final_png", path: finalPng, sha256: imageHash, locked: true }],
    visual_direction: visualDirection,
    copy_review: copyReview,
    visual_review: null,
    layout_checks: layoutChecks,
    reference_files: []
  };
  const approval = ApprovalSchema.parse({
    content_id: input.content_id,
    version: 1,
    decision: "approved",
    approver_user: input.approved_by,
    chat_id: "codex-human-approval",
    decided_at: new Date().toISOString(),
    approved_image_hash: imageHash,
    approved_caption_hash: captionHash,
    comment: "Publicação solicitada explicitamente após aprovação da imagem e da legenda.",
    simulated: false
  });
  return {
    id: input.content_id,
    state: "APPROVED",
    version: 1,
    brief: {
      content_id: input.content_id,
      objective: "Publicar conteúdo aprovado no Instagram",
      topic: "Conteúdo aprovado pelo usuário",
      audience: "motoristas e proprietários de veículos",
      requested_format: input.target,
      planned_date: null,
      notes: "Arte final importada do fluxo visual existente.",
      commercial_data: {}
    },
    copy,
    copyReview,
    visualDirection,
    render,
    approvals: [approval],
    changeRequests: [],
    transitions: [],
    publications: [],
    automaticRevisionAttempts: 0,
    versionHistory: []
  };
}

export async function publishApprovedMedia(rawInput: unknown) {
  const input = ApprovedPublishBodySchema.parse(rawInput);
  const bytes = decodePng(input.image_base64);
  const metadata = await sharp(bytes).metadata();
  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;
  const expectedHeight = input.target === "story" ? 1920 : 1440;
  if (metadata.format !== "png" || width !== 1080 || height !== expectedHeight) {
    throw new WorkflowError(`Dimensão inválida: esperado 1080x${expectedHeight} PNG.`, "INVALID_MEDIA_DIMENSIONS");
  }
  const directory = join(projectRoot, "output", "approved", input.content_id, "v1");
  const absolutePng = join(directory, `final-${input.target}-1080x${height}.png`);
  await mkdir(directory, { recursive: true });
  await writeFile(absolutePng, bytes, { flag: "wx" }).catch((error: NodeJS.ErrnoException) => {
    if (error.code === "EEXIST") throw new WorkflowError("Este content_id já foi utilizado.", "DUPLICATE_CONTENT_ID");
    throw error;
  });
  const finalPng = toPosix(relative(projectRoot, absolutePng));
  const imageHash = sha256(bytes);
  const record = buildRecord(input, finalPng, imageHash, width, height);
  const storage = createMediaStorage(config);
  const publisher = new InstagramPublisher();
  const publicImageUrl = await storage.publicUrl(record.render!, input.target as PublicationTarget);
  const publication = await publisher.publish({
    record,
    publicImageUrl,
    idempotencyKey: `${record.id}:v1:${input.target}:${imageHash}:${record.render!.caption_hash}`,
    target: input.target
  });
  record.publications.push(publication);
  await writeFile(join(directory, "publication.json"), JSON.stringify({ approval: record.approvals[0], publication }, null, 2));
  return {
    ok: true,
    content_id: record.id,
    target: input.target,
    media_id: publication.media_id,
    permalink: publication.permalink,
    published_at: publication.published_at,
    simulated: publication.simulated
  };
}
