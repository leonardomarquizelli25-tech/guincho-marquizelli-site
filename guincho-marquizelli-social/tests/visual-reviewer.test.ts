import { describe, expect, it } from "vitest";
import { VisualReviewerAgent } from "../src/agents/visual-reviewer.js";
import { fakeRender } from "./fixtures.js";

describe("revisão visual estruturada", () => {
  it("aprova manifesto visual íntegro", () => {
    expect(new VisualReviewerAgent().run(fakeRender)).toMatchObject({ approved: true, score: 100 });
  });

  it.each([
    ["fonts_loaded", false, "typography"],
    ["truck_source_hash_preserved", false, "truck"],
    ["dimensions_valid", false, "layout"]
  ] as const)("reprova falha em %s", (key, value, category) => {
    const manifest = structuredClone(fakeRender);
    manifest.layout_checks[key] = value as never;
    const review = new VisualReviewerAgent().run(manifest);
    expect(review.approved).toBe(false);
    expect(review.problems.some((item) => item.category === category && item.severity === "high")).toBe(true);
  });

  it("detecta logo deformada ou pequena", () => {
    const manifest = structuredClone(fakeRender);
    manifest.layout_checks.logo_ratio_delta = 0.1;
    manifest.layout_checks.logo_width_px = 80;
    const review = new VisualReviewerAgent().run(manifest);
    expect(review.problems.filter((item) => item.category === "logo")).toHaveLength(2);
  });
});
