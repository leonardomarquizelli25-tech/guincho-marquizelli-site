import { afterAll, describe, expect, it } from "vitest";
import { rm } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { publishApprovedMedia } from "../src/instagram/approved-publish.js";
import { projectRoot } from "../src/config.js";

const contentId = `approved-upload-${Date.now()}`;
const outputDirectory = join(projectRoot, "output", "approved", contentId);

describe("publicação de arte final aprovada", () => {
  afterAll(async () => {
    await rm(outputDirectory, { recursive: true, force: true });
  });

  it("aceita o PNG 1080x1440 e preserva a aprovação por hash", async () => {
    const png = await sharp({
      create: { width: 1080, height: 1440, channels: 4, background: "#1A1A1A" }
    }).png().toBuffer();
    const result = await publishApprovedMedia({
      content_id: contentId,
      target: "feed",
      caption: "Legenda final aprovada para o teste seguro.",
      hashtags: ["#GuinchoMarquizelli"],
      alt_text: "Arte final aprovada da Guincho Marquizelli.",
      approved_by: "teste-humano",
      image_base64: png.toString("base64"),
      confirm_publish: true
    });
    expect(result).toMatchObject({ ok: true, content_id: contentId, target: "feed", simulated: true });
  });

  it("recusa Story com dimensão de Feed", async () => {
    const png = await sharp({
      create: { width: 1080, height: 1440, channels: 4, background: "#1A1A1A" }
    }).png().toBuffer();
    await expect(publishApprovedMedia({
      content_id: `${contentId}-story`,
      target: "story",
      caption: "Legenda final aprovada para o teste seguro.",
      hashtags: [],
      alt_text: "Arte final aprovada da Guincho Marquizelli.",
      approved_by: "teste-humano",
      image_base64: png.toString("base64"),
      confirm_publish: true
    })).rejects.toMatchObject({ code: "INVALID_MEDIA_DIMENSIONS" });
  });
});
