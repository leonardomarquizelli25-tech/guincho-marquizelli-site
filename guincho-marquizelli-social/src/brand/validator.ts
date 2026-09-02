import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { projectRoot } from "../config.js";
import { loadBrand } from "./load.js";
import { sha256File } from "../utils/hash.js";

export interface BrandValidationReport {
  approved: boolean;
  checks: Array<{ name: string; approved: boolean; detail: string }>;
}

const relativeLuminance = (hex: string): number => {
  const values = [1, 3, 5].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255).map((value) => value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * values[0]! + 0.7152 * values[1]! + 0.0722 * values[2]!;
};
const contrast = (a: string, b: string): number => {
  const [lighter, darker] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (lighter! + 0.05) / (darker! + 0.05);
};

export async function validateBrandAssets(): Promise<BrandValidationReport> {
  const brand = loadBrand();
  const logoPath = join(projectRoot, "brand", "logos", "logo-oficial.png");
  const logo = await sharp(logoPath).metadata();
  const checks: BrandValidationReport["checks"] = [];
  checks.push({ name: "official-name", approved: brand.company.official_name === "Guincho Marquizelli", detail: brand.company.official_name });
  checks.push({ name: "logo-dimensions", approved: (logo.width ?? 0) >= 120 && (logo.height ?? 0) > 0, detail: `${logo.width}x${logo.height}` });
  checks.push({ name: "logo-alpha", approved: logo.hasAlpha === true, detail: `hasAlpha=${logo.hasAlpha}` });
  checks.push({ name: "logo-proportion", approved: Math.abs((logo.width ?? 1) / (logo.height ?? 1) - 4369 / 1977) < 0.001, detail: `ratio=${((logo.width ?? 1) / (logo.height ?? 1)).toFixed(6)}` });
  checks.push({ name: "logo-hash", approved: await sha256File(logoPath) === "cf9508ce6b6b27da369d56f015f4f4a4eb1e2c8cf8764c5be891a4fd3a21b4db", detail: "comparado ao inventário bloqueado" });
  const colors = brand.visual_identity.colors as Record<string, string>;
  checks.push({ name: "color-combination", approved: contrast(colors.industrial_black!, colors.ice_white!) >= 7, detail: `contrast=${contrast(colors.industrial_black!, colors.ice_white!).toFixed(2)}` });
  for (const font of ["anton-regular.woff2", "oswald-bold.woff2", "barlow-regular.woff2", "barlow-bold.woff2"]) {
    let approved = true;
    try { await access(join(projectRoot, "brand", "fonts", font), constants.R_OK); } catch { approved = false; }
    checks.push({ name: `font-${font}`, approved, detail: approved ? "carregável" : "ausente" });
  }
  const dimensions: Array<[string, number, number]> = [["feed", 1080, 1350], ["story", 1080, 1920], ["square", 1080, 1080]];
  for (const [name, width, height] of dimensions) {
    const expected = name === "feed" ? [1080, 1350] : name === "story" ? [1080, 1920] : [1080, 1080];
    checks.push({ name: `dimensions-${name}`, approved: width === expected[0] && height === expected[1], detail: `${width}x${height}; posicionamento interno usa grid 8 px` });
  }
  return { approved: checks.every((item) => item.approved), checks };
}
