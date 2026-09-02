import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { ConfiguredPublicStorage } from "../src/storage/provider.js";
import { projectRoot } from "../src/config.js";
import { fakeRender, productionConfig } from "./fixtures.js";

const testRoot = join(projectRoot, "output", "storage-instagram-test");
const feedPath = join(testRoot, "v1", "feed.png");
const storyPath = join(testRoot, "v1", "story.png");

describe("armazenamento de mídia para Instagram", () => {
  beforeAll(async () => {
    await mkdir(join(testRoot, "v1"), { recursive: true });
    await sharp({ create: { width: 1080, height: 1440, channels: 4, background: "#1A1A1A" } }).png().toFile(feedPath);
    await sharp({ create: { width: 1080, height: 1920, channels: 4, background: "#1A1A1A" } }).png().toFile(storyPath);
  });

  afterAll(async () => {
    await rm(testRoot, { recursive: true, force: true });
  });

  it("converte Feed PNG 1080x1440 para JPEG público", async () => {
    const storage = new ConfiguredPublicStorage({ ...productionConfig(), PUBLIC_MEDIA_BASE_URL: "https://media.example/media/" });
    const render = { ...structuredClone(fakeRender), content_id: "storage-instagram-test", dimensions: { width: 1080, height: 1440 }, final_png: "output/storage-instagram-test/v1/feed.png" };
    const url = await storage.publicUrl(render, "feed");
    expect(url).toBe("https://media.example/media/storage-instagram-test/v1/instagram-feed.jpg");
    await expect(sharp(join(testRoot, "v1", "instagram-feed.jpg")).metadata()).resolves.toMatchObject({ format: "jpeg", width: 1080, height: 1440 });
  });

  it("converte Story PNG 1080x1920 para JPEG público", async () => {
    const storage = new ConfiguredPublicStorage({ ...productionConfig(), PUBLIC_MEDIA_BASE_URL: "https://media.example/media/" });
    const render = { ...structuredClone(fakeRender), content_id: "storage-instagram-test", dimensions: { width: 1080, height: 1920 }, final_png: "output/storage-instagram-test/v1/story.png" };
    const url = await storage.publicUrl(render, "story");
    expect(url).toBe("https://media.example/media/storage-instagram-test/v1/instagram-story.jpg");
    await expect(sharp(join(testRoot, "v1", "instagram-story.jpg")).metadata()).resolves.toMatchObject({ format: "jpeg", width: 1080, height: 1920 });
  });
});
