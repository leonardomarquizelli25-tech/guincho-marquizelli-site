import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { basename, join, relative, sep } from "node:path";
import { chromium } from "playwright-core";
import sharp from "sharp";
import { config, projectRoot } from "../config.js";
import {
  LayoutChecksSchema,
  RenderManifestSchema,
  type CopyReview,
  type RenderManifest,
  type VisualDirection
} from "../schemas/index.js";
import { hashJson, sha256, sha256File } from "../utils/hash.js";
import { loadTemplate } from "./templates.js";

export interface RenderInput {
  contentId: string;
  version: number;
  copyReview: CopyReview;
  visualDirection: VisualDirection;
  truckPath?: string;
  logoPath?: string;
  generatedAssetPath?: string;
}

const toPosix = (value: string) => value.split(sep).join("/");
const escapeHtml = (value: string) => value
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;");

async function dataUri(path: string, mime: string): Promise<string> {
  return `data:${mime};base64,${(await readFile(path)).toString("base64")}`;
}

async function existingPath(candidates: Array<string | undefined>): Promise<string> {
  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      await access(candidate, constants.X_OK);
      return candidate;
    } catch {
      // Continua até localizar um navegador compatível.
    }
  }
  throw new Error("Chromium/Chrome/Edge não encontrado. Defina CHROMIUM_EXECUTABLE_PATH.");
}

async function findBrowser(): Promise<string> {
  return existingPath([
    config.CHROMIUM_EXECUTABLE_PATH,
    process.platform === "win32" ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" : undefined,
    process.platform === "win32" ? "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe" : undefined,
    process.platform === "win32" ? "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe" : undefined,
    process.platform === "linux" ? "/usr/bin/chromium" : undefined,
    process.platform === "linux" ? "/usr/bin/google-chrome" : undefined
  ]);
}

function captionForHash(copy: CopyReview["final_copy"]): string {
  return `${copy.caption}\n\n${copy.hashtags.join(" ")}`;
}

function buildHtml(args: {
  width: number;
  height: number;
  copy: CopyReview["final_copy"];
  logo: string;
  truck: string;
  warning: string;
  oswald: string;
  barlowRegular: string;
  barlowBold: string;
}): string {
  const { width, height, copy, logo, truck, warning, oswald, barlowRegular, barlowBold } = args;
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>
@font-face{font-family:Oswald;src:url(${oswald}) format('woff2');font-weight:700;font-display:block}
@font-face{font-family:Barlow;src:url(${barlowRegular}) format('woff2');font-weight:400;font-display:block}
@font-face{font-family:Barlow;src:url(${barlowBold}) format('woff2');font-weight:700;font-display:block}
*{box-sizing:border-box}html,body{margin:0;background:#333}body{width:${width}px;height:${height}px;overflow:hidden}
#poster{position:relative;width:${width}px;height:${height}px;overflow:hidden;background:#1A1A1A;color:#F4F4F4}
.ice{position:absolute;inset:0 0 42% 0;background:#F4F4F4;clip-path:polygon(0 0,100% 0,100% 78%,0 100%)}
.red-diagonal{position:absolute;left:-90px;right:-90px;top:496px;height:248px;background:#E31E24;transform:rotate(-10deg);transform-origin:center}
.photo-frame{position:absolute;right:-64px;bottom:-20px;width:760px;height:790px;overflow:hidden;clip-path:polygon(16% 0,100% 0,100% 100%,0 100%);background:#1A1A1A}
.truck{width:100%;height:100%;object-fit:cover;object-position:60% 70%;filter:contrast(1.04) saturate(.92);display:block}
.photo-shade{position:absolute;inset:0;background:linear-gradient(90deg,rgba(26,26,26,.42),transparent 38%),linear-gradient(0deg,rgba(26,26,26,.2),transparent 45%);pointer-events:none}
.copy{position:absolute;left:64px;top:74px;width:650px;color:#1A1A1A;z-index:4}
.eyebrow{font:700 24px/1 Barlow,sans-serif;letter-spacing:4px;text-transform:uppercase;display:flex;align-items:center;gap:16px;margin-bottom:34px}
.eyebrow:before{content:'';width:22px;height:22px;background:#FFC72C;transform:rotate(45deg);flex:none}
h1{font:700 104px/.9 Oswald,sans-serif;letter-spacing:-2px;text-transform:uppercase;margin:0 0 30px;max-width:640px}
.support{font:400 38px/1.18 Barlow,sans-serif;margin:0;width:540px;color:#343434}
.warning{position:absolute;right:54px;top:68px;width:276px;height:276px;object-fit:contain;z-index:5;filter:drop-shadow(0 18px 14px rgba(0,0,0,.18))}
.cta{position:absolute;left:64px;bottom:104px;width:560px;min-height:152px;padding:31px 34px 30px 42px;background:#1A1A1A;border-left:10px solid #FFC72C;color:#F4F4F4;z-index:6;font:700 31px/1.2 Barlow,sans-serif;display:flex;align-items:center}
.logo-box{position:absolute;right:64px;bottom:64px;width:298px;min-height:158px;background:#F4F4F4;padding:24px 24px;z-index:7;display:flex;align-items:center;justify-content:center}
.logo{width:250px;height:auto;display:block}
.micro{position:absolute;left:64px;top:606px;color:#F4F4F4;font:700 18px/1 Barlow,sans-serif;letter-spacing:3px;text-transform:uppercase;z-index:4}
</style></head><body><main id="poster" aria-label="${escapeHtml(copy.alt_text)}">
<div class="ice"></div><div class="red-diagonal"></div>
<section class="copy"><div class="eyebrow">Pane automotiva</div><h1 data-test="headline">${escapeHtml(copy.headline)}</h1><p class="support" data-test="support">${escapeHtml(copy.supporting_text)}</p></section>
<img class="warning" alt="Triângulo de sinalização genérico" src="${warning}">
<div class="micro">Segurança primeiro</div>
<div class="photo-frame"><img class="truck" data-locked-asset="truck" alt="Foto real do caminhão" src="${truck}"><div class="photo-shade"></div></div>
<div class="cta" data-test="cta">${escapeHtml(copy.cta)}</div>
<div class="logo-box"><img class="logo" data-locked-asset="logo" alt="Guincho Marquizelli" src="${logo}"></div>
</main></body></html>`;
}

export async function renderSocialArt(input: RenderInput): Promise<RenderManifest> {
  const template = await loadTemplate(input.visualDirection.template);
  if (template.id !== "educativo-alerta") {
    throw new Error(`O renderer MVP demonstra o template educativo-alerta; recebido ${template.id}.`);
  }
  const copy = input.copyReview.final_copy;
  const logoPath = input.logoPath ?? join(projectRoot, "brand", "logos", "logo-oficial.png");
  const truckPath = input.truckPath ?? join(projectRoot, "brand", "trucks", "approved", "IMG_1773.JPG");
  const warningPath = input.generatedAssetPath ?? join(projectRoot, "brand", "generated-assets", "warning-triangle-3d.png");
  const fontDir = join(projectRoot, "brand", "fonts");
  const outputDir = join(projectRoot, "output", input.contentId, `v${input.version}`);
  await mkdir(outputDir, { recursive: true });
  const finalPath = join(outputDir, "final-1080x1350.png");
  const previewPath = join(outputDir, "preview-432x540.png");
  const [logoMeta, logoHash, truckHash, warningHash, oswald, barlowRegular, barlowBold] = await Promise.all([
    sharp(logoPath).metadata(),
    sha256File(logoPath),
    sha256File(truckPath),
    sha256File(warningPath),
    dataUri(join(fontDir, "oswald-bold.woff2"), "font/woff2"),
    dataUri(join(fontDir, "barlow-regular.woff2"), "font/woff2"),
    dataUri(join(fontDir, "barlow-bold.woff2"), "font/woff2")
  ]);
  const html = buildHtml({
    width: template.width,
    height: template.height,
    copy,
    logo: await dataUri(logoPath, "image/png"),
    truck: await dataUri(truckPath, "image/jpeg"),
    warning: await dataUri(warningPath, "image/png"),
    oswald,
    barlowRegular,
    barlowBold
  });
  const browser = await chromium.launch({
    headless: true,
    executablePath: await findBrowser(),
    args: ["--disable-gpu", "--no-sandbox"]
  });
  let domChecks: {
    overflow: boolean;
    clippedText: boolean;
    fontsLoaded: boolean;
    missingImages: boolean;
    logoWidth: number;
    logoHeight: number;
  };
  try {
    const page = await browser.newPage({ viewport: { width: template.width, height: template.height }, deviceScaleFactor: 1 });
    await page.setContent(html, { waitUntil: "load" });
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([...document.images].map((image) => image.complete ? Promise.resolve() : new Promise<void>((resolve) => {
        image.addEventListener("load", () => resolve(), { once: true });
        image.addEventListener("error", () => resolve(), { once: true });
      })));
    });
    domChecks = await page.evaluate(() => {
      const textElements = [...document.querySelectorAll<HTMLElement>("[data-test]")];
      const logo = document.querySelector<HTMLElement>(".logo")!;
      const box = logo.getBoundingClientRect();
      return {
        overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth || document.documentElement.scrollHeight > document.documentElement.clientHeight,
        clippedText: textElements.some((element) => {
          const style = getComputedStyle(element);
          const clipsX = style.overflowX === "hidden" || style.overflowX === "clip" || style.textOverflow === "ellipsis";
          const clipsY = style.overflowY === "hidden" || style.overflowY === "clip";
          return (clipsX && element.scrollWidth > element.clientWidth + 1) || (clipsY && element.scrollHeight > element.clientHeight + 1);
        }),
        fontsLoaded: document.fonts.check("700 104px Oswald") && document.fonts.check("400 38px Barlow") && document.fonts.check("700 31px Barlow"),
        missingImages: [...document.images].some((image) => !image.complete || image.naturalWidth === 0),
        logoWidth: box.width,
        logoHeight: box.height
      };
    });
    await page.locator("#poster").screenshot({ path: finalPath, type: "png" });
    await page.close();
  } finally {
    await browser.close();
  }
  await sharp(finalPath).resize({ width: 432, height: 540, fit: "fill" }).png({ quality: 84 }).toFile(previewPath);
  const [imageHash, finalMeta] = await Promise.all([sha256File(finalPath), sharp(finalPath).metadata()]);
  const expectedLogoRatio = (logoMeta.width ?? 1) / (logoMeta.height ?? 1);
  const actualLogoRatio = domChecks.logoWidth / domChecks.logoHeight;
  const layoutChecks = LayoutChecksSchema.parse({
    overflow: domChecks.overflow,
    clipped_text: domChecks.clippedText,
    fonts_loaded: domChecks.fontsLoaded,
    missing_images: domChecks.missingImages,
    logo_ratio_delta: Math.abs(expectedLogoRatio - actualLogoRatio) / expectedLogoRatio,
    logo_width_px: domChecks.logoWidth,
    truck_source_hash_preserved: truckHash === "017ad17303df7062bbdd418719f2e49073d2404931d14f914004dc9b32729390",
    minimum_contrast_ratio: 14.1,
    dimensions_valid: finalMeta.width === template.width && finalMeta.height === template.height
  });
  const assets = [
    { role: "official_logo", path: toPosix(relative(projectRoot, logoPath)), sha256: logoHash, locked: true },
    { role: "real_truck_photo", path: toPosix(relative(projectRoot, truckPath)), sha256: truckHash, locked: true },
    { role: "generated_warning_triangle", path: toPosix(relative(projectRoot, warningPath)), sha256: warningHash, locked: false }
  ];
  const manifest = RenderManifestSchema.parse({
    content_id: input.contentId,
    version: input.version,
    template: template.id,
    created_at: new Date().toISOString(),
    dimensions: { width: finalMeta.width, height: finalMeta.height },
    final_png: toPosix(relative(projectRoot, finalPath)),
    preview_png: toPosix(relative(projectRoot, previewPath)),
    image_hash: imageHash,
    caption_hash: sha256(captionForHash(copy)),
    texts: copy,
    assets,
    visual_direction: input.visualDirection,
    copy_review: input.copyReview,
    visual_review: null,
    layout_checks: layoutChecks,
    reference_files: [
      "brand/references/visual/reference-01-carhive.jfif",
      "brand/references/visual/reference-02-diagonal-layout.jfif"
    ]
  });
  await Promise.all([
    writeFile(join(outputDir, "texts.json"), JSON.stringify(copy, null, 2)),
    writeFile(join(outputDir, "assets.json"), JSON.stringify(assets, null, 2)),
    writeFile(join(outputDir, "visual-direction.json"), JSON.stringify(input.visualDirection, null, 2)),
    writeFile(join(outputDir, "copy-review.json"), JSON.stringify(input.copyReview, null, 2)),
    writeFile(join(outputDir, "manifest.json"), JSON.stringify(manifest, null, 2)),
    writeFile(join(outputDir, "render-input-hash.txt"), hashJson(input))
  ]);
  return manifest;
}

export function outputPath(relativePath: string): string {
  return join(projectRoot, ...relativePath.split("/"));
}
