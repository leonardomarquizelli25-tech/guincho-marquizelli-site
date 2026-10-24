import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Server } from "node:http";
import { gzipSync } from "node:zlib";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import { join } from "node:path";
import { createApp } from "../src/api/app.js";
import { config } from "../src/config.js";
import { BriefSchema } from "../src/schemas/index.js";
import { contentDirectory, privateOutputPath, publicMediaRoot } from "../src/security/paths.js";

describe("limites da API e isolamento de arquivos", () => {
  let server: Server;
  let base: string;
  const originalKey = config.PUBLISHER_API_KEY;
  const originalEnv = config.APP_ENV;
  const key = "test-api-access-" + "x".repeat(32);
  const filename = `${"d".repeat(64)}-feed.jpg`;

  beforeAll(async () => {
    config.APP_ENV = "dry-run";
    config.PUBLISHER_API_KEY = key;
    await mkdir(publicMediaRoot, { recursive: true });
    await writeFile(join(publicMediaRoot, filename), Buffer.from([0xff, 0xd8, 0xff, 0xd9]));
    const app = createApp().app;
    server = await new Promise<Server>(resolve => {
      const running = app.listen(0, "127.0.0.1", () => resolve(running));
    });
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Servidor de teste indisponível");
    base = `http://127.0.0.1:${address.port}`;
  });
  afterAll(async () => {
    config.PUBLISHER_API_KEY = originalKey;
    config.APP_ENV = originalEnv;
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    await unlink(join(publicMediaRoot, filename));
  });

  it("bloqueia requisições sem chave antes de processar JSON", async () => {
    const r = await fetch(`${base}/api/briefings`, { method: "POST", headers: { "content-type": "application/json" }, body: "{invalid" });
    expect(r.status).toBe(401);
  });
  it("mantém a API fechada em dry-run se a chave faltar", async () => {
    config.PUBLISHER_API_KEY = undefined;
    try { expect((await fetch(`${base}/api/contents`)).status).toBe(503); }
    finally { config.PUBLISHER_API_KEY = key; }
  });
  it("aceita uma chamada autenticada de leitura", async () => {
    const r = await fetch(`${base}/api/contents`, { headers: { authorization: `Bearer ${key}` } });
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual([]);
  });
  it("rejeita descompressão de corpos mesmo com autenticação", async () => {
    const r = await fetch(`${base}/api/briefings`, { method: "POST", headers: { authorization: `Bearer ${key}`, "content-type": "application/json", "content-encoding": "gzip" }, body: gzipSync("{}") });
    expect(r.status).toBe(415);
  });
  it("serve somente a imagem pública e bloqueia registros e traversal", async () => {
    expect((await fetch(`${base}/media/${filename}`)).status).toBe(200);
    for (const route of ["/media/fixture-001/v1/approvals.json", "/media/workflow-record.json", "/media/.env", "/media/%2e%2e%2f.env"]) {
      expect((await fetch(base + route)).status).toBe(404);
    }
  });
  it("rejeita identificadores e caminhos fora da pasta privada", () => {
    for (const id of ["../escape", "x/y", "C:\\temp", "..\\escape", "a".repeat(81)]) {
      expect(() => contentDirectory(id, 1)).toThrow();
      expect(BriefSchema.safeParse({ content_id: id, objective: "Objetivo válido", topic: "Assunto válido" }).success).toBe(false);
    }
    expect(() => contentDirectory("safe-id", -1)).toThrow();
    expect(() => privateOutputPath(".env")).toThrow();
    expect(() => privateOutputPath("output/../.env")).toThrow();
  });
});
