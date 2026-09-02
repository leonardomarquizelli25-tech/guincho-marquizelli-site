import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyHmacSha256 } from "../src/security/webhook.js";

describe("segurança de webhook", () => {
  it("valida assinatura HMAC-SHA256 em tempo constante", () => {
    const body = Buffer.from('{"event":"approval"}');
    const secret = "test-secret";
    const signature = `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;
    expect(verifyHmacSha256(body, signature, secret)).toBe(true);
    expect(verifyHmacSha256(Buffer.from("alterado"), signature, secret)).toBe(false);
    expect(verifyHmacSha256(body, undefined, secret)).toBe(false);
  });
});
