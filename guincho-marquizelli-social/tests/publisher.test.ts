import { describe, expect, it, vi } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FileIdempotencyRegistry, GraphInstagramTransport, InstagramPublisher, IdempotencyRegistry, type InstagramTransport } from "../src/instagram/publisher.js";
import { approvedRecord, productionConfig } from "./fixtures.js";
import { WorkflowError } from "../src/utils/errors.js";
import { config } from "../src/config.js";

describe("publicador Instagram", () => {
  it("bloqueia sem aprovação e versão/hash alterados", async () => {
    const record = approvedRecord();
    record.approvals = [];
    const publisher = new InstagramPublisher(new IdempotencyRegistry(), undefined, { ...config, APP_ENV: "dry-run" });
    await expect(publisher.publish({ record, publicImageUrl: "https://dry-run.invalid/a.png", idempotencyKey: "a" })).rejects.toMatchObject({ code: "HUMAN_APPROVAL_REQUIRED" });
  });

  it("simula em dry-run e previne chave duplicada", async () => {
    const record = approvedRecord();
    const registry = new IdempotencyRegistry();
    const publisher = new InstagramPublisher(registry, undefined, { ...config, APP_ENV: "dry-run", ENABLE_REAL_PUBLISHING: false });
    const result = await publisher.publish({ record, publicImageUrl: "https://dry-run.invalid/a.png", idempotencyKey: "same" });
    expect(result.simulated).toBe(true);
    await expect(publisher.publish({ record, publicImageUrl: "https://dry-run.invalid/a.png", idempotencyKey: "same" })).rejects.toMatchObject({ code: "IDEMPOTENCY_KEY_REUSED" });
  });

  it("persiste a reserva de idempotência entre instâncias", () => {
    const directory = mkdtempSync(join(tmpdir(), "guincho-idempotency-"));
    try {
      const first = new FileIdempotencyRegistry(directory);
      first.reserve("conteudo:v1:feed:hash");
      const second = new FileIdempotencyRegistry(directory);
      expect(second.has("conteudo:v1:feed:hash")).toBe(true);
      expect(() => second.reserve("conteudo:v1:feed:hash")).toThrowError(/idempotência/i);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("faz retry com backoff em erro temporário e publica uma vez", async () => {
    let creates = 0;
    const transport: InstagramTransport = {
      createContainer: vi.fn(async () => {
        creates += 1;
        if (creates < 3) throw new WorkflowError("temporário", "INSTAGRAM_API_ERROR", false);
        return { id: "container" };
      }),
      containerStatus: vi.fn(async () => ({ status_code: "FINISHED" })),
      publishContainer: vi.fn(async () => ({ id: "media" })),
      permalink: vi.fn(async () => "https://instagram.com/p/media")
    };
    const publisher = new InstagramPublisher(new IdempotencyRegistry(), transport, productionConfig());
    const result = await publisher.publish({ record: approvedRecord(), publicImageUrl: "https://media.example/a.png", idempotencyKey: "retry" });
    expect(creates).toBe(3);
    expect(result).toMatchObject({ simulated: false, media_id: "media" });
  });

  it("diferencia erro permanente sem retry", async () => {
    const create = vi.fn(async () => { throw new WorkflowError("permanente", "INSTAGRAM_API_ERROR", true); });
    const transport: InstagramTransport = { createContainer: create, containerStatus: vi.fn(), publishContainer: vi.fn(), permalink: vi.fn() };
    const publisher = new InstagramPublisher(new IdempotencyRegistry(), transport, productionConfig());
    await expect(publisher.publish({ record: approvedRecord(), publicImageUrl: "https://media.example/a.png", idempotencyKey: "permanent" })).rejects.toThrow("permanente");
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("aceita Feed 1080x1440 e não repete hashtags já presentes na legenda", async () => {
    const record = approvedRecord();
    record.render!.dimensions.height = 1440;
    record.render!.texts.caption += "\n\n#Reboque";
    let receivedCaption = "";
    let receivedTarget = "";
    const transport: InstagramTransport = {
      createContainer: vi.fn(async (_url, caption, target) => {
        receivedCaption = caption;
        receivedTarget = target ?? "";
        return { id: "container-feed" };
      }),
      containerStatus: vi.fn(async () => ({ status_code: "FINISHED" })),
      publishContainer: vi.fn(async () => ({ id: "media-feed" })),
      permalink: vi.fn(async () => "https://instagram.com/p/feed")
    };
    const publisher = new InstagramPublisher(new IdempotencyRegistry(), transport, productionConfig());
    const result = await publisher.publish({ record, publicImageUrl: "https://media.example/feed.jpg", idempotencyKey: "feed-1440", target: "feed" });
    expect(result.target).toBe("feed");
    expect(receivedTarget).toBe("feed");
    expect(receivedCaption.match(/#Reboque/gi)).toHaveLength(1);
  });

  it("publica Story 1080x1920 como destino separado", async () => {
    const record = approvedRecord();
    record.brief.requested_format = "story";
    record.render!.dimensions.height = 1920;
    let receivedTarget = "";
    const transport: InstagramTransport = {
      createContainer: vi.fn(async (_url, _caption, target) => {
        receivedTarget = target ?? "";
        return { id: "container-story" };
      }),
      containerStatus: vi.fn(async () => ({ status_code: "FINISHED" })),
      publishContainer: vi.fn(async () => ({ id: "media-story" })),
      permalink: vi.fn(async () => "https://instagram.com/stories/test")
    };
    const publisher = new InstagramPublisher(new IdempotencyRegistry(), transport, productionConfig());
    const result = await publisher.publish({ record, publicImageUrl: "https://media.example/story.jpg", idempotencyKey: "story-1920", target: "story" });
    expect(result.target).toBe("story");
    expect(receivedTarget).toBe("story");
  });

  it("usa graph.instagram.com, Bearer e payload de Story sem expor o token", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => new Response(JSON.stringify({ id: "container-story" }), {
      status: 200,
      headers: { "content-type": "application/json" }
    }));
    vi.stubGlobal("fetch", fetchMock);
    try {
      const transport = new GraphInstagramTransport({ ...productionConfig(), INSTAGRAM_LOGIN_MODE: "instagram" });
      await transport.createContainer("https://media.example/story.jpg", "legenda não usada", "story");
      const call = fetchMock.mock.calls[0];
      if (!call) throw new Error("fetch não foi chamado");
      const [url, init] = call;
      if (!init) throw new Error("RequestInit ausente");
      expect(url).toBe("https://graph.instagram.com/v24.0/123/media");
      expect((init.headers as Record<string, string>).authorization).toBe("Bearer secret");
      const body = init.body as URLSearchParams;
      expect(body.get("media_type")).toBe("STORIES");
      expect(body.has("caption")).toBe(false);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("marca 429 como temporário e preserva somente metadados seguros", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
      error: { message: "mensagem do provedor", type: "OAuthException", code: 4, error_subcode: 2207051 }
    }), { status: 429, headers: { "content-type": "application/json" } })));
    try {
      const transport = new GraphInstagramTransport(productionConfig());
      await expect(transport.verifyConnection()).rejects.toMatchObject({
        code: "INSTAGRAM_API_ERROR",
        permanent: false,
        details: { status: 429, provider_code: 4, provider_subcode: 2207051, provider_type: "OAuthException" }
      });
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
