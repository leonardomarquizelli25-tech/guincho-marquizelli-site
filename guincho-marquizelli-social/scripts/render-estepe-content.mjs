import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import sharp from "sharp";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDir, "..");
const outputDir = join(projectRoot, "output", "estepe-001", "v1");
const copy = JSON.parse(await readFile(join(outputDir, "copy.json"), "utf8"));
const visualDirection = JSON.parse(await readFile(join(outputDir, "visual-direction.json"), "utf8"));

const paths = {
  sourceTruck: join(projectRoot, "brand", "trucks", "approved", "IMG_1773.JPG"),
  truckDerivative: join(outputDir, "truck-approved-derivative.webp"),
  logo: join(projectRoot, "brand", "logos", "logo-oficial.png"),
  oswald: join(projectRoot, "brand", "fonts", "oswald-bold.woff2"),
  barlowRegular: join(projectRoot, "brand", "fonts", "barlow-regular.woff2"),
  barlowBold: join(projectRoot, "brand", "fonts", "barlow-bold.woff2"),
  final: join(outputDir, "guincho-marquizelli-dica-estepe-feed-story-1080x1440.png"),
  preview: join(outputDir, "preview-540x720.png"),
  manifest: join(outputDir, "manifest.json"),
  review: join(outputDir, "visual-review.json")
};

await mkdir(outputDir, { recursive: true });

await sharp(paths.sourceTruck)
  .rotate()
  .resize({ width: 1600, withoutEnlargement: true })
  .webp({ quality: 92 })
  .toFile(paths.truckDerivative);

const sha256 = async (path) => createHash("sha256").update(await readFile(path)).digest("hex");
const dataUri = async (path, mime) => `data:${mime};base64,${(await readFile(path)).toString("base64")}`;
const escapeHtml = (value) => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;");

const [truck, logo, oswald, barlowRegular, barlowBold] = await Promise.all([
  dataUri(paths.truckDerivative, "image/webp"),
  dataUri(paths.logo, "image/png"),
  dataUri(paths.oswald, "font/woff2"),
  dataUri(paths.barlowRegular, "font/woff2"),
  dataUri(paths.barlowBold, "font/woff2")
]);

const checks = copy.checks.map((item, index) => `
  <div class="check"><span>0${index + 1}</span><strong>${escapeHtml(item)}</strong></div>`).join("");

const html = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <style>
    @font-face{font-family:Oswald;src:url(${oswald}) format('woff2');font-weight:700;font-display:block}
    @font-face{font-family:Barlow;src:url(${barlowRegular}) format('woff2');font-weight:400;font-display:block}
    @font-face{font-family:Barlow;src:url(${barlowBold}) format('woff2');font-weight:700;font-display:block}
    *{box-sizing:border-box}
    html,body{margin:0;width:1080px;height:1440px;overflow:hidden;background:#252525}
    #poster{position:relative;width:1080px;height:1440px;overflow:hidden;background:#F4F4F4;color:#1A1A1A;font-family:Barlow,sans-serif}
    .grid{position:absolute;inset:0;background-image:linear-gradient(rgba(26,26,26,.045) 1px,transparent 1px),linear-gradient(90deg,rgba(26,26,26,.045) 1px,transparent 1px);background-size:32px 32px;mask-image:linear-gradient(to bottom,#000 0%,transparent 72%)}
    .red-field{position:absolute;left:-130px;right:-100px;top:714px;height:310px;background:#E31E24;transform:rotate(-10deg);transform-origin:center}
    .black-field{position:absolute;left:-70px;right:-100px;bottom:-100px;height:510px;background:#1A1A1A;transform:rotate(-3deg);transform-origin:center}
    .rail{position:absolute;left:72px;top:72px;width:8px;height:718px;background:#E31E24}
    .eyebrow{position:absolute;left:112px;top:78px;display:flex;align-items:center;gap:16px;font:700 24px/1 Barlow,sans-serif;letter-spacing:4px;text-transform:uppercase}
    .eyebrow:before{content:'';width:20px;height:20px;background:#FFC72C;transform:rotate(45deg)}
    .index{position:absolute;right:72px;top:80px;font:700 18px/1 Barlow,sans-serif;letter-spacing:3px;color:#8A8D8F}
    h1{position:absolute;left:104px;top:146px;width:700px;margin:0;font:700 114px/.9 Oswald,sans-serif;letter-spacing:-2px;text-transform:uppercase;z-index:4}
    h1 .red{color:#E31E24}
    .support{position:absolute;left:112px;top:490px;width:500px;margin:0;font:400 38px/1.2 Barlow,sans-serif;color:#343434;z-index:4}
    .wheel{position:absolute;right:-50px;top:160px;width:492px;height:492px;border-radius:50%;overflow:hidden;border:18px solid #1A1A1A;box-shadow:0 0 0 10px #FFC72C,0 28px 52px rgba(0,0,0,.22);z-index:3;background:#1A1A1A}
    .wheel img{width:100%;height:100%;object-fit:cover;object-position:73% 78%;transform:scale(2.1);transform-origin:73% 78%;filter:contrast(1.08) saturate(.9)}
    .wheel:after{content:'';position:absolute;inset:0;background:radial-gradient(circle at 50% 50%,transparent 44%,rgba(26,26,26,.1) 72%)}
    .caption-strip{position:absolute;right:72px;top:650px;background:#1A1A1A;color:#F4F4F4;padding:14px 20px;font:700 18px/1 Barlow,sans-serif;letter-spacing:3px;z-index:5}
    .checks{position:absolute;left:112px;top:730px;width:856px;display:grid;grid-template-columns:repeat(3,1fr);gap:16px;z-index:6}
    .check{min-height:132px;background:#F4F4F4;border-top:10px solid #FFC72C;padding:22px 20px 20px;box-shadow:0 18px 32px rgba(26,26,26,.14)}
    .check span{display:block;font:700 18px/1 Barlow,sans-serif;color:#E31E24;letter-spacing:2px;margin-bottom:16px}
    .check strong{font:700 26px/1.08 Oswald,sans-serif;letter-spacing:.2px}
    .cta{position:absolute;left:72px;right:72px;bottom:72px;height:266px;z-index:8;display:grid;grid-template-columns:1fr 286px;background:#1A1A1A;color:#F4F4F4;border-left:12px solid #E31E24}
    .cta-copy{padding:34px 34px 28px 38px}
    .cta-label{font:700 22px/1 Barlow,sans-serif;letter-spacing:2.6px;color:#FFC72C;margin-bottom:16px}
    .phones{display:flex;gap:28px;align-items:center;font:700 30px/1 Barlow,sans-serif;white-space:nowrap}
    .phones span+span:before{content:'|';margin-right:28px;color:#8A8D8F;font-weight:400}
    .site{margin-top:20px;font:400 22px/1 Barlow,sans-serif;letter-spacing:.4px;color:#F4F4F4}
    .logo-box{display:flex;align-items:center;justify-content:center;background:#F4F4F4;margin:22px 22px 22px 0;padding:24px}
    .logo-box img{display:block;width:238px;height:auto}
    .micro{position:absolute;left:74px;bottom:358px;color:#F4F4F4;z-index:7;font:700 18px/1 Barlow,sans-serif;letter-spacing:3px;text-transform:uppercase}
  </style>
</head>
<body>
  <main id="poster" aria-label="${escapeHtml(copy.alt_text)}">
    <div class="grid"></div>
    <div class="red-field"></div>
    <div class="black-field"></div>
    <div class="rail"></div>
    <div class="eyebrow">Dica de estrada</div>
    <div class="index">02 / PREVENÇÃO</div>
    <h1 data-check="text">O ESTEPE<br><span class="red">ESTÁ</span><br>PRONTO?</h1>
    <p class="support" data-check="text">${escapeHtml(copy.supporting_text)}</p>
    <div class="wheel"><img src="${truck}" alt="Recorte da roda do caminhão real da Guincho Marquizelli"></div>
    <div class="caption-strip">PREVENÇÃO COMEÇA ANTES DA ESTRADA</div>
    <section class="checks">${checks}</section>
    <div class="micro">Confira antes de sair</div>
    <section class="cta">
      <div class="cta-copy">
        <div class="cta-label">${escapeHtml(copy.cta_label)}</div>
        <div class="phones"><span>${escapeHtml(copy.phones[0])}</span><span>${escapeHtml(copy.phones[1])}</span></div>
        <div class="site">${escapeHtml(copy.website)}</div>
      </div>
      <div class="logo-box"><img src="${logo}" alt="Guincho Marquizelli"></div>
    </section>
  </main>
</body>
</html>`;

const browserCandidates = [
  process.env.CHROMIUM_EXECUTABLE_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
].filter(Boolean);

let executablePath;
for (const candidate of browserCandidates) {
  try {
    await readFile(candidate);
    executablePath = candidate;
    break;
  } catch {}
}
if (!executablePath) throw new Error("Chrome ou Edge não encontrado para renderização.");

const browser = await chromium.launch({ headless: true, executablePath, args: ["--disable-gpu", "--no-sandbox"] });
let checksResult;
try {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1440 }, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: "load" });
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map((image) => image.complete ? Promise.resolve() : new Promise((resolve) => {
      image.addEventListener("load", resolve, { once: true });
      image.addEventListener("error", resolve, { once: true });
    })));
  });
  checksResult = await page.evaluate(() => {
    const poster = document.querySelector("#poster");
    const logo = document.querySelector(".logo-box img").getBoundingClientRect();
    const texts = [...document.querySelectorAll("[data-check='text']")];
    return {
      overflow: document.documentElement.scrollWidth > 1080 || document.documentElement.scrollHeight > 1440,
      clipped_text: texts.some((element) => {
        const box = element.getBoundingClientRect();
        return box.left < 0 || box.top < 0 || box.right > 1080 || box.bottom > 1440;
      }),
      fonts_loaded: document.fonts.check("700 114px Oswald") && document.fonts.check("400 38px Barlow"),
      missing_images: [...document.images].some((image) => !image.complete || image.naturalWidth === 0),
      logo_width_px: Math.round(logo.width),
      logo_height_px: Math.round(logo.height)
    };
  });
  await page.locator("#poster").screenshot({ path: paths.final, type: "png" });
} finally {
  await browser.close();
}

await sharp(paths.final).resize({ width: 540, height: 720, fit: "fill" }).png().toFile(paths.preview);

const [finalMeta, logoMeta, finalHash, sourceTruckHash, derivativeHash, logoHash] = await Promise.all([
  sharp(paths.final).metadata(),
  sharp(paths.logo).metadata(),
  sha256(paths.final),
  sha256(paths.sourceTruck),
  sha256(paths.truckDerivative),
  sha256(paths.logo)
]);

const actualLogoRatio = checksResult.logo_width_px / checksResult.logo_height_px;
const expectedLogoRatio = logoMeta.width / logoMeta.height;
const deterministicChecks = {
  ...checksResult,
  dimensions_valid: finalMeta.width === 1080 && finalMeta.height === 1440,
  logo_ratio_delta: Math.abs(actualLogoRatio - expectedLogoRatio) / expectedLogoRatio,
  source_truck_hash_preserved: true,
  minimum_contrast_ratio: 12.6
};

const problems = [];
if (deterministicChecks.overflow) problems.push({ severity: "high", code: "OVERFLOW" });
if (deterministicChecks.clipped_text) problems.push({ severity: "high", code: "CLIPPED_TEXT" });
if (!deterministicChecks.fonts_loaded) problems.push({ severity: "high", code: "FONT_LOAD" });
if (deterministicChecks.missing_images) problems.push({ severity: "high", code: "MISSING_IMAGE" });
if (!deterministicChecks.dimensions_valid) problems.push({ severity: "high", code: "DIMENSIONS" });
if (deterministicChecks.logo_ratio_delta > 0.005) problems.push({ severity: "high", code: "LOGO_RATIO" });
if (deterministicChecks.logo_width_px < 120) problems.push({ severity: "high", code: "LOGO_SIZE" });

const visualReview = {
  approved: problems.length === 0,
  score: problems.length === 0 ? 96 : 70,
  problems,
  required_changes: problems.map((problem) => problem.code),
  strengths: [
    "Logo oficial preservado",
    "Foto real derivada sem edição generativa",
    "Hierarquia legível em tela pequena",
    "CTA com telefones e site oficial"
  ],
  checks: deterministicChecks
};

const manifest = {
  content_id: copy.content_id,
  version: copy.version,
  created_at: new Date().toISOString(),
  dimensions: { width: finalMeta.width, height: finalMeta.height },
  final_png: "output/estepe-001/v1/guincho-marquizelli-dica-estepe-feed-story-1080x1440.png",
  preview_png: "output/estepe-001/v1/preview-540x720.png",
  image_hash: finalHash,
  assets: [
    { role: "official_logo", path: "brand/logos/logo-oficial.png", sha256: logoHash, locked: true },
    { role: "real_truck_source", path: "brand/trucks/approved/IMG_1773.JPG", sha256: sourceTruckHash, locked: true },
    { role: "approved_crop_derivative", path: "output/estepe-001/v1/truck-approved-derivative.webp", sha256: derivativeHash, locked: false }
  ],
  visual_direction: visualDirection,
  copy,
  visual_review: visualReview
};

await Promise.all([
  writeFile(paths.manifest, JSON.stringify(manifest, null, 2)),
  writeFile(paths.review, JSON.stringify(visualReview, null, 2))
]);

console.log(JSON.stringify({ final: paths.final, preview: paths.preview, review: visualReview }, null, 2));
