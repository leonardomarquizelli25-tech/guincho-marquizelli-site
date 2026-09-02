import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { WorkflowService } from "./orchestrator/workflow.js";
import { projectRoot } from "./config.js";
import { validateBrandAssets } from "./brand/validator.js";
import { sha256File } from "./utils/hash.js";
import { config } from "./config.js";
import { GraphInstagramTransport } from "./instagram/publisher.js";

const command = process.argv[2] ?? "help";
const workflow = new WorkflowService();

function print(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

async function dryRun(): Promise<void> {
  const record = await workflow.runDryRun();
  print({
    content_id: record.id,
    state: record.state,
    version: record.version,
    copy_score: record.copyReview?.score,
    visual_score: record.visualReview?.score,
    final_png: record.render?.final_png,
    preview_png: record.render?.preview_png,
    image_hash: record.render?.image_hash,
    publication: record.publications.at(-1)
  });
}

async function renderOnly(): Promise<void> {
  const record = workflow.createBrief({
    content_id: `render-${Date.now()}`,
    objective: "Demonstrar render educativo seguro",
    topic: "Sinais de pane automotiva",
    audience: "motoristas",
    requested_format: "feed",
    planned_date: null,
    notes: "render local",
    commercial_data: {}
  });
  workflow.generateStrategy(record.id);
  workflow.generateCopy(record.id);
  workflow.reviewCopy(record.id);
  workflow.generateVisualDirection(record.id);
  await workflow.produceAssets(record.id);
  await workflow.render(record.id);
  await workflow.reviewVisual(record.id);
  print(workflow.get(record.id).render);
}

async function inventory(): Promise<void> {
  const inventory = JSON.parse(await readFile(join(projectRoot, "brand", "assets-inventory.json"), "utf8")) as Record<string, unknown>;
  const files = [
    "brand/logos/logo-oficial.png",
    "brand/trucks/originals/IMG_1773.JPG",
    "brand/trucks/approved/IMG_1773.JPG",
    "brand/generated-assets/warning-triangle-3d.png"
  ];
  print({ inventory, verified_hashes: Object.fromEntries(await Promise.all(files.map(async (file) => [file, await sha256File(join(projectRoot, file))]))) });
}

async function verifyInstagram(): Promise<void> {
  const required = {
    access_token: Boolean(config.META_ACCESS_TOKEN),
    account_id: Boolean(config.INSTAGRAM_ACCOUNT_ID),
    public_media_base_url: Boolean(config.PUBLIC_MEDIA_BASE_URL)
  };
  if (!required.access_token || !required.account_id) {
    print({ ok: false, mode: config.INSTAGRAM_LOGIN_MODE, api_version: config.INSTAGRAM_API_VERSION, configured: required });
    process.exitCode = 1;
    return;
  }
  const account = await new GraphInstagramTransport(config).verifyConnection();
  print({ ok: true, mode: config.INSTAGRAM_LOGIN_MODE, api_version: config.INSTAGRAM_API_VERSION, configured: required, account });
}

switch (command) {
  case "workflow:dry-run":
  case "publish:dry-run": await dryRun(); break;
  case "render": await renderOnly(); break;
  case "brand:validate": print(await validateBrandAssets()); break;
  case "assets:inventory": await inventory(); break;
  case "instagram:verify": await verifyInstagram(); break;
  case "seed": {
    print(workflow.createBrief({ content_id: "seed-pane-001", objective: "Educar sem diagnosticar", topic: "Sinais de pane", audience: "motoristas", requested_format: "feed", planned_date: null, notes: "seed", commercial_data: {} }));
    break;
  }
  case "telegram:dev": print({ mode: "mock", message: "Telegram externo não é obrigatório no dry-run; configure token e chat para o adaptador real." }); break;
  default:
    process.stdout.write("Comandos: render | workflow:dry-run | publish:dry-run | instagram:verify | telegram:dev | seed | brand:validate | assets:inventory\n");
}
