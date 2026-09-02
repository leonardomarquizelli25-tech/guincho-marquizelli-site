import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

export function sha256(input: string | Buffer): string {
  return createHash("sha256").update(input).digest("hex");
}

export async function sha256File(path: string): Promise<string> {
  return sha256(await readFile(path));
}

export function stableJson(value: unknown): string {
  const sort = (input: unknown): unknown => {
    if (Array.isArray(input)) return input.map(sort);
    if (input && typeof input === "object") {
      return Object.fromEntries(
        Object.entries(input as Record<string, unknown>)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([key, item]) => [key, sort(item)])
      );
    }
    return input;
  };
  return JSON.stringify(sort(value));
}

export function hashJson(value: unknown): string {
  return sha256(stableJson(value));
}
