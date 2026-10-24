import { randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const template = await readFile(join(root, ".env.example"), "utf8");
const content = template.replace(/^PUBLISHER_API_KEY=$/m, `PUBLISHER_API_KEY=${randomBytes(32).toString("hex")}`)
  .replace(/^POSTGRES_PASSWORD=$/m, `POSTGRES_PASSWORD=${randomBytes(32).toString("hex")}`);
await writeFile(join(root, ".env"), content, { flag: "wx", mode: 0o600 });
for (const name of ["output", "public-media", ".state"]) await mkdir(join(root, name), { recursive: true, mode: 0o700 });
console.log("Ambiente local criado. Credenciais ficam somente no .env; nenhum valor foi exibido.");
