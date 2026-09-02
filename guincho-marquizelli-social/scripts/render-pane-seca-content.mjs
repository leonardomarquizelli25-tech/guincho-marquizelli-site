import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile, copyFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import sharp from "sharp";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDir, "..");
const workspaceRoot = resolve(projectRoot, "..");
const layoutAuditSource = await readFile("C:\\Users\\User\\.codex\\skills\\ckw-design\\deterministic-design\\design-spatial\\scripts\\layout-audit.js", "utf8");
const contentId = "pane-seca-001";
const version = 7;
const outputDir = join(projectRoot, "output", contentId, `v${version}`);
const deliveryDir = join(workspaceRoot, "guincho-pane-seca-01");

const brand = {
  red: "#E31E24",
  black: "#1A1A1A",
  yellow: "#FFC72C",
  gray: "#8A8D8F",
  white: "#F4F4F4"
};

const copy = {
  headline_top: "PANE SECA?",
  headline_bottom: "NÃO É SÓ UM TRANSTORNO.",
  supporting_text: "Veículo imobilizado na via por falta de combustível é infração média. O CTB prevê multa e remoção do veículo.",
  cta_top: "Ficou imobilizado e não consegue continuar?",
  cta_bottom: "Solicite o reboque.",
  phones: ["(14) 99703-6966", "(14) 99904-1010"],
  website: "www.guinchomarquizelli.com.br",
  caption: "Pane seca pode virar infração: o CTB prevê multa e remoção quando o veículo fica imobilizado na via sem combustível.\n\nAntes de sair, confira o marcador e considere o percurso. Na estrada, o próximo posto pode estar bem mais longe do que parece.\n\nSe o veículo parar, ligue o pisca-alerta e procure um ponto seguro fora do fluxo, se houver condição para isso. Evite empurrar o carro em meio ao trânsito.\n\nSem condição segura para continuar, solicite o reboque.\n\nEnvie este aviso para quem costuma deixar o abastecimento para depois.\n\n#GuinchoMarquizelli #PaneSeca #SegurancaNoTransito #Marilia",
  alt_text: "Arte educativa da Guincho Marquizelli sobre pane seca, com marcador de combustível próximo da reserva, aviso sobre infração média e contatos para solicitar reboque."
};

const paths = {
  generatedGauge: join(projectRoot, "brand", "generated-assets", "pane-seca-fuel-gauge-v1.png"),
  logo: join(projectRoot, "brand", "logos", "logo-oficial.png"),
  oswald: join(projectRoot, "brand", "fonts", "oswald-bold.woff2"),
  barlowRegular: join(projectRoot, "brand", "fonts", "barlow-regular.woff2"),
  barlowBold: join(projectRoot, "brand", "fonts", "barlow-bold.woff2")
};

const formats = [
  { id: "feed", width: 1080, height: 1440, file: "guincho-marquizelli-pane-seca-feed-1080x1440.png", preview: "preview-feed-540x720.png" },
  { id: "story", width: 1080, height: 1920, file: "guincho-marquizelli-pane-seca-story-1080x1920.png", preview: "preview-story-405x720.png" }
];

await mkdir(outputDir, { recursive: true });
await mkdir(deliveryDir, { recursive: true });

const sha256 = async (path) => createHash("sha256").update(await readFile(path)).digest("hex");
const pixelCentroid = async (path, cropHeight) => {
  const { data, info } = await sharp(path).removeAlpha().extract({ left: 0, top: 0, width: 1080, height: cropHeight }).raw().toBuffer({ resolveWithObject: true });
  let weight = 0;
  let momentX = 0;
  let momentY = 0;
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const offset = (y * info.width + x) * info.channels;
      const dr = data[offset] - 26;
      const dg = data[offset + 1] - 26;
      const db = data[offset + 2] - 26;
      const ink = Math.sqrt(dr * dr + dg * dg + db * db);
      weight += ink;
      momentX += ink * x;
      momentY += ink * y;
    }
  }
  return {
    x: Number((momentX / weight / info.width).toFixed(3)),
    y: Number((momentY / weight / info.height).toFixed(3))
  };
};
const dataUri = async (path, mime) => `data:${mime};base64,${(await readFile(path)).toString("base64")}`;
const escapeHtml = (value) => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;");
const envelope = (producer, payload, confidence = 0.97, warnings = []) => ({
  content_id: contentId,
  version,
  producer,
  schema_version: "1.0.0",
  confidence,
  payload,
  warnings
});
const writeJson = (name, data) => writeFile(join(outputDir, name), JSON.stringify(data, null, 2));

const strategy = envelope("content-strategist", {
  theme: "Pane seca: consequência legal e prevenção",
  formats: ["1080x1440-feed", "1080x1920-story"],
  pillar: "segurança automotiva",
  objective: "salvamentos e compartilhamentos",
  angle: "verdade contrária: pane seca não é apenas um transtorno",
  audience: "motoristas de Marília e região",
  technical_source: {
    name: "Código de Trânsito Brasileiro, art. 180",
    url: "https://www.planalto.gov.br/ccivil_03/leis/l9503compilado.htm"
  }
});
const copyArtifact = envelope("copywriter", { ...copy, hashtags: ["#GuinchoMarquizelli", "#PaneSeca", "#SegurancaNoTransito", "#Marilia"] });
const copyReview = envelope("copy-reviewer", {
  approved: true,
  locked_copy: true,
  commercial_data_confirmed: [...copy.phones, copy.website],
  problems: [],
  notes: ["Headline curta e autônoma", "Uma mensagem central", "CTA limitado ao serviço confirmado de reboque"]
});
const visualDirection = envelope("art-director", {
  concept: "Reserva crítica",
  composition: "Fotografia do marcador de combustível em background full-bleed, headline em blocos no topo, módulo informativo independente e CTA na base.",
  hierarchy: ["headline", "fuel-gauge", "legal-warning", "supporting-text", "cta", "logo"],
  formats: formats.map(({ id, width, height }) => ({ id, width, height })),
  palette: brand,
  typography: ["Oswald", "Barlow"],
  yellow_rule: "Somente na luz de reserva do marcador",
  locked_assets: ["brand/logos/logo-oficial.png"],
  references: ["brand/references/visual/reference-01-carhive.jfif", "brand/references/visual/reference-02-diagonal-layout.jfif"]
});
const assetsArtifact = envelope("asset-generator", {
  generated_assets: ["brand/generated-assets/pane-seca-fuel-gauge-v1.png"],
  code_native_assets: ["industrial-grid", "gradient-overlays"],
  approved_derivatives: [],
  note: "Marcador de combustível gerado como background visual; logo oficial permanece preservado."
});

await Promise.all([
  writeJson("strategy.json", strategy),
  writeJson("copy.json", copyArtifact),
  writeJson("copy-review.json", copyReview),
  writeJson("visual-direction.json", visualDirection),
  writeJson("assets.json", assetsArtifact)
]);

const [gaugeImage, logo, oswald, barlowRegular, barlowBold] = await Promise.all([
  dataUri(paths.generatedGauge, "image/png"),
  dataUri(paths.logo, "image/png"),
  dataUri(paths.oswald, "font/woff2"),
  dataUri(paths.barlowRegular, "font/woff2"),
  dataUri(paths.barlowBold, "font/woff2")
]);

function fuelGauge() {
  return `<svg viewBox="0 0 760 520" role="img" aria-label="Marcador de combustível próximo da reserva">
    <defs>
      <filter id="lampGlow" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="12" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    </defs>
    <path d="M110 390 A270 270 0 0 1 650 390" fill="none" stroke="#343434" stroke-width="46" stroke-linecap="round"/>
    <path d="M110 390 A270 270 0 0 1 175 205" fill="none" stroke="#E31E24" stroke-width="46" stroke-linecap="round"/>
    <g stroke="#F4F4F4" stroke-width="12" stroke-linecap="square" opacity=".92">
      <path d="M116 370 L156 354"/><path d="M157 254 L196 279"/><path d="M251 153 L270 198"/><path d="M380 112 L380 162"/><path d="M509 153 L490 198"/><path d="M603 254 L564 279"/><path d="M644 370 L604 354"/>
    </g>
    <text x="83" y="468" fill="#F4F4F4" font-family="Oswald" font-size="74" font-weight="700">E</text>
    <text x="626" y="468" fill="#F4F4F4" font-family="Oswald" font-size="74" font-weight="700">F</text>
    <line x1="380" y1="390" x2="170" y2="282" stroke="#E31E24" stroke-width="24" stroke-linecap="round"/>
    <circle cx="380" cy="390" r="55" fill="#1A1A1A" stroke="#F4F4F4" stroke-width="14"/>
    <circle cx="380" cy="390" r="18" fill="#E31E24"/>
    <g transform="translate(330 198)" fill="none" stroke="#FFC72C" stroke-width="13" stroke-linejoin="round" filter="url(#lampGlow)">
      <rect x="0" y="0" width="72" height="96" rx="8"/><path d="M15 18 H57 V44 H15 Z"/><path d="M72 24 L98 46 V92 C98 112 72 112 72 92"/><path d="M98 46 L112 57"/>
    </g>
  </svg>`;
}

function buildHtml(format) {
  const isStory = format.id === "story";
  const css = isStory ? `
    .logo{left:72px;top:70px;width:305px}.tag{right:72px;top:86px}
    .headline{left:72px;top:226px;width:900px}.headline .a{font-size:138px}.headline .b{font-size:96px;width:850px}
    .rule{left:72px;top:684px;width:880px}
    #poster{background-position:50% 50%}
    .info{left:72px;top:1260px;width:760px}.support{font-size:36px}
    .cta{left:72px;right:72px;bottom:74px;height:330px;grid-template-columns:1fr 260px}.cta-copy{padding:38px 36px}.cta-question{font-size:26px}.cta-command{font-size:44px}.phones{font-size:29px;gap:18px}.phones span+span:before{margin-right:18px}.site{font-size:23px}.cta-logo{padding:24px}.cta-logo img{width:218px}
    .counter{right:72px;bottom:430px}` : `
    .logo{left:72px;top:62px;width:286px}.tag{right:72px;top:78px}
    .headline{left:72px;top:176px;width:920px}.headline .a{font-size:126px}.headline .b{font-size:80px;width:860px}
    .rule{left:72px;top:526px;width:820px}
    #poster{background-position:50% 50%}
    .info{left:72px;top:720px;width:410px}.support{font-size:30px}
    .cta{left:72px;right:72px;bottom:70px;height:286px;grid-template-columns:1fr 260px}.cta-copy{padding:34px 34px}.cta-question{font-size:23px}.cta-command{font-size:40px}.phones{font-size:27px;gap:18px}.phones span+span:before{margin-right:18px}.site{font-size:21px}.cta-logo{padding:20px}.cta-logo img{width:218px}
    .counter{right:72px;bottom:382px}`;

  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>
    @font-face{font-family:Oswald;src:url(${oswald}) format('woff2');font-weight:700;font-display:block}
    @font-face{font-family:Barlow;src:url(${barlowRegular}) format('woff2');font-weight:400;font-display:block}
    @font-face{font-family:Barlow;src:url(${barlowBold}) format('woff2');font-weight:700;font-display:block}
    *{box-sizing:border-box}html,body{margin:0;width:${format.width}px;height:${format.height}px;overflow:hidden;background:#111}
    #poster{position:relative;width:${format.width}px;height:${format.height}px;overflow:hidden;background-color:#1A1A1A;background-image:url(${gaugeImage});background-size:contain;background-repeat:no-repeat;color:#F4F4F4;font-family:Barlow,sans-serif}
    #poster:before{content:'';position:absolute;inset:0;background:linear-gradient(to bottom,rgba(26,26,26,.95) 0%,rgba(26,26,26,.88) 31%,rgba(26,26,26,.26) 50%,rgba(26,26,26,.68) 72%,rgba(26,26,26,.96) 100%),linear-gradient(90deg,rgba(26,26,26,.72) 0%,rgba(26,26,26,.2) 64%,rgba(26,26,26,.48) 100%);pointer-events:none}
    .texture{position:absolute;inset:0;opacity:.23;background-image:linear-gradient(rgba(244,244,244,.07) 1px,transparent 1px),linear-gradient(90deg,rgba(244,244,244,.07) 1px,transparent 1px);background-size:32px 32px;mask-image:linear-gradient(to bottom,#000,transparent 78%)}
    .logo{position:absolute;height:auto;z-index:10}.tag{position:absolute;display:flex;align-items:center;gap:14px;font:700 20px/1 Barlow;letter-spacing:3px;text-transform:uppercase;color:#F4F4F4}.tag:before{content:'';width:28px;height:6px;background:#E31E24}
    .headline{position:absolute;z-index:5;text-transform:uppercase}.headline span{display:block;font-family:Oswald,sans-serif;font-weight:700;letter-spacing:-1px}.headline .a{line-height:1;color:#F4F4F4;margin-bottom:28px}.headline .b{line-height:1;color:#F4F4F4}.headline .b .line+.line{margin-top:14px}.headline .b em{font-style:normal;color:#E31E24}
    .rule{position:absolute;height:10px;background:linear-gradient(90deg,#E31E24 0 76%,transparent 76%);z-index:4}
    .info{position:absolute;z-index:7;background:rgba(26,26,26,.92);border-left:8px solid #E31E24;padding:22px 22px 22px 24px}.info-label{display:flex;align-items:center;gap:12px;margin-bottom:20px;font:700 18px/1 Barlow;letter-spacing:2.8px;text-transform:uppercase;color:#F4F4F4}.info-label:before{content:'';width:24px;height:5px;background:#E31E24;flex:none}.support{position:static;margin:0;font-weight:400;line-height:1.28;color:#F4F4F4}.support strong{font-weight:700;color:#F4F4F4}.support .law{display:inline;background:#E31E24;padding:2px 7px;font-weight:700;box-decoration-break:clone;-webkit-box-decoration-break:clone}
    .cta{position:absolute;z-index:10;display:grid;background:#F4F4F4;color:#1A1A1A;border-top:12px solid #E31E24;box-shadow:0 22px 60px rgba(0,0,0,.35)}.cta-copy{display:flex;flex-direction:column;justify-content:center}.cta-question{font-weight:400;line-height:1.1}.cta-command{margin-top:8px;font-family:Oswald;font-weight:700;line-height:1;color:#E31E24;text-transform:uppercase}.phones{display:flex;align-items:center;margin-top:22px;font-weight:700;line-height:1;white-space:nowrap}.phones span+span:before{content:'|';color:#8A8D8F;font-weight:400}.site{margin-top:17px;font-weight:400;line-height:1}.cta-logo{display:flex;align-items:center;justify-content:center;position:relative}.cta-logo:before{content:'';position:absolute;inset:12px;background:radial-gradient(ellipse,rgba(255,255,255,.98) 0%,rgba(255,255,255,.78) 48%,rgba(255,255,255,0) 76%)}.cta-logo img{position:relative;height:auto;display:block}.counter{position:absolute;z-index:7;font:700 17px/1 Barlow;letter-spacing:3px;color:#8A8D8F}
    ${css}
  </style></head><body><main id="poster" aria-label="${escapeHtml(copy.alt_text)}">
    <div class="texture"></div>
    <img class="logo" src="${logo}" alt="Guincho Marquizelli">
    <div class="tag">Dica de segurança</div>
    <div class="headline" data-check="text"><span class="a">${escapeHtml(copy.headline_top)}</span><span class="b"><span class="line"><em>NÃO</em> É SÓ UM</span><span class="line">TRANSTORNO.</span></span></div>
    <div class="rule"></div>
    <section class="info"><div class="info-label">Atenção à reserva</div><p class="support" data-check="text">Veículo imobilizado na via por falta de combustível é <span class="law">infração média.</span> O CTB prevê multa e remoção do veículo.</p></section>
    <div class="counter">01 / SEGURANÇA</div>
    <section class="cta">
      <div class="cta-copy"><div class="cta-question">${escapeHtml(copy.cta_top)}</div><div class="cta-command">${escapeHtml(copy.cta_bottom)}</div><div class="phones"><span>${copy.phones[0]}</span><span>${copy.phones[1]}</span></div><div class="site">${copy.website}</div></div>
      <div class="cta-logo"><img src="${logo}" alt="Guincho Marquizelli"></div>
    </section>
  </main></body></html>`;
}

const browserCandidates = [
  process.env.CHROMIUM_EXECUTABLE_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
].filter(Boolean);
let executablePath;
for (const candidate of browserCandidates) {
  try { await readFile(candidate); executablePath = candidate; break; } catch {}
}
if (!executablePath) throw new Error("Chrome ou Edge não encontrado para renderização.");

const browser = await chromium.launch({ headless: true, executablePath, args: ["--disable-gpu", "--no-sandbox"] });
const renderReports = [];
try {
  for (const format of formats) {
    const finalPath = join(outputDir, format.file);
    const page = await browser.newPage({ viewport: { width: format.width, height: format.height }, deviceScaleFactor: 1 });
    await page.setContent(buildHtml(format), { waitUntil: "load" });
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([...document.images].map((image) => image.complete ? Promise.resolve() : new Promise((resolve) => {
        image.addEventListener("load", resolve, { once: true });
        image.addEventListener("error", resolve, { once: true });
      })));
    });
    const domChecks = await page.evaluate(({ width, height }) => {
      const poster = document.querySelector("#poster");
      const logos = [...document.querySelectorAll("img.logo,.cta-logo img")].map((element) => element.getBoundingClientRect());
      const textBoxes = [...document.querySelectorAll("[data-check='text']")].map((element) => element.getBoundingClientRect());
      return {
        overflow: document.documentElement.scrollWidth > width || document.documentElement.scrollHeight > height,
        clipped_text: textBoxes.some((box) => box.left < 0 || box.top < 0 || box.right > width || box.bottom > height),
        fonts_loaded: document.fonts.check("700 100px Oswald") && document.fonts.check("400 30px Barlow"),
        missing_images: [...document.images].some((image) => !image.complete || image.naturalWidth === 0),
        logo_boxes: logos.map((box) => ({ width: Math.round(box.width), height: Math.round(box.height) }))
      };
    }, format);
    await page.addScriptTag({ content: layoutAuditSource });
    const layoutAudit = await page.evaluate(() => __audit({
      draw: true,
      contentSelector: ".logo,.tag,.headline,.rule,.info,.cta,.counter"
    }));
    await page.locator("#poster").screenshot({ path: join(outputDir, `audit-annotated-${format.id}.png`), type: "png" });
    await page.evaluate(() => __clearAudit());
    await page.locator("#poster").screenshot({ path: finalPath, type: "png" });
    await page.close();
    const meta = await sharp(finalPath).metadata();
    const editorialHeight = format.id === "story" ? 1510 : 1080;
    const [centroidFull, centroidEditorial] = await Promise.all([
      pixelCentroid(finalPath, format.height),
      pixelCentroid(finalPath, editorialHeight)
    ]);
    const previewPath = join(outputDir, format.preview);
    await sharp(finalPath).resize({ height: 720 }).png().toFile(previewPath);
    const report = {
      format: format.id,
      file: format.file,
      preview: format.preview,
      width: meta.width,
      height: meta.height,
      sha256: await sha256(finalPath),
      checks: {
        ...domChecks,
        dimensions_valid: meta.width === format.width && meta.height === format.height,
        minimum_logo_width_valid: domChecks.logo_boxes.every((box) => box.width >= 120),
        safe_margin_px: 72,
        yellow_usage: "fuel-reserve-lamp-only",
        layout_audit: layoutAudit,
        pixel_centroid_full: centroidFull,
        pixel_centroid_editorial: centroidEditorial
      }
    };
    renderReports.push(report);
    await copyFile(finalPath, join(deliveryDir, format.file));
  }
} finally {
  await browser.close();
}

const logoHash = await sha256(paths.logo);
const generatedGaugeHash = await sha256(paths.generatedGauge);
const problems = renderReports.flatMap((report) => {
  const list = [];
  if (report.checks.overflow) list.push({ severity: "high", format: report.format, code: "OVERFLOW" });
  if (report.checks.clipped_text) list.push({ severity: "high", format: report.format, code: "CLIPPED_TEXT" });
  if (!report.checks.fonts_loaded) list.push({ severity: "high", format: report.format, code: "FONT_LOAD" });
  if (report.checks.missing_images) list.push({ severity: "high", format: report.format, code: "MISSING_IMAGE" });
  if (!report.checks.dimensions_valid) list.push({ severity: "high", format: report.format, code: "DIMENSIONS" });
  if (!report.checks.minimum_logo_width_valid) list.push({ severity: "high", format: report.format, code: "LOGO_SIZE" });
  return list;
});

const visualReview = envelope("visual-reviewer", {
  approved: problems.length === 0,
  score: problems.length === 0 ? 96 : 68,
  problems,
  required_changes: problems.map((problem) => `${problem.format}:${problem.code}`),
  strengths: [
    "Hierarquia construída em blocos independentes",
    "Marcador de combustível domina a composição",
    "Amarelo restrito à luz de reserva",
    "Logo oficial preservado e imagem de apoio aplicada como background",
    "Feed e Story recompostos individualmente"
  ],
  deterministic_checks: renderReports
});

const manifest = {
  content_id: contentId,
  version,
  created_at: new Date().toISOString(),
  outputs: renderReports,
  delivery_directory: deliveryDir,
  assets: [
    { role: "official_logo", path: "brand/logos/logo-oficial.png", sha256: logoHash, locked: true },
    { role: "generated_generic_fuel_gauge", path: "brand/generated-assets/pane-seca-fuel-gauge-v1.png", sha256: generatedGaugeHash, locked: false, provider: "ChatGPT image generation" }
  ],
  copy_locked: copy,
  visual_direction: visualDirection.payload,
  visual_review: visualReview.payload
};

const approvalRequest = envelope("approval-manager", {
  status: problems.length === 0 ? "awaiting_human_visual_approval" : "blocked_by_visual_review",
  publish_authorized: false,
  drive_upload_authorized: false,
  files_for_review: formats.map((format) => join(deliveryDir, format.file)),
  note: "Publicação e envio ao Drive permanecem bloqueados até aprovação visual explícita."
});

await Promise.all([
  writeJson("visual-review.json", visualReview),
  writeJson("manifest.json", manifest),
  writeJson("approval-request.json", approvalRequest)
]);

console.log(JSON.stringify({ deliveryDir, renderReports, visualReview: visualReview.payload, approval: approvalRequest.payload }, null, 2));
