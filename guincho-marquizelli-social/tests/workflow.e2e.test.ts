import { access, readFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { WorkflowService } from "../src/orchestrator/workflow.js";
import { projectRoot } from "../src/config.js";

describe("fluxo ponta a ponta dry-run", () => {
  it("renderiza, revisa, aprova e publica de forma simulada", async () => {
    const workflow = new WorkflowService();
    const record = await workflow.runDryRun({ content_id: `e2e-${Date.now()}` });
    expect(record.state).toBe("PUBLISHED_SIMULATED");
    expect(record.copyReview).toMatchObject({ approved: true, score: 100 });
    expect(record.visualReview).toMatchObject({ approved: true, score: 100 });
    expect(record.approvals.at(-1)).toMatchObject({ decision: "approved", simulated: true });
    expect(record.publications.at(-1)).toMatchObject({ simulated: true });
    expect(record.render?.layout_checks).toMatchObject({ overflow: false, clipped_text: false, fonts_loaded: true, missing_images: false, truck_source_hash_preserved: true, dimensions_valid: true });
    const finalPath = join(projectRoot, ...record.render!.final_png.split("/"));
    await expect(access(finalPath)).resolves.toBeUndefined();
    expect(await sharp(finalPath).metadata()).toMatchObject({ width: 1080, height: 1350 });
    const manifest = JSON.parse(await readFile(join(projectRoot, "output", record.id, "v1", "manifest.json"), "utf8"));
    expect(manifest.image_hash).toBe(record.render?.image_hash);
    expect(record.transitions.map((item) => item.to)).toEqual(expect.arrayContaining(["COPY_REVIEW", "COPY_APPROVED", "VISUAL_REVIEW", "AWAITING_APPROVAL", "APPROVED", "PUBLISHING", "PUBLISHED_SIMULATED"]));
  });

  it("versiona pedido de alteração, preserva histórico e muda o hash", async () => {
    const workflow = new WorkflowService();
    const record = workflow.createBrief({ content_id: `change-${Date.now()}`, objective: "Educar motoristas", topic: "Sinais de pane", audience: "motoristas", requested_format: "feed", planned_date: null, notes: "", commercial_data: {} });
    workflow.generateStrategy(record.id); workflow.generateCopy(record.id); workflow.reviewCopy(record.id); workflow.generateVisualDirection(record.id);
    await workflow.produceAssets(record.id); await workflow.render(record.id); await workflow.reviewVisual(record.id); await workflow.requestApproval(record.id); workflow.approve(record.id);
    const oldHash = record.render!.image_hash;
    workflow.requestChanges(record.id, "Troque a headline.");
    expect(record.version).toBe(2);
    expect(record.versionHistory).toHaveLength(1);
    expect(record.approvals[0]?.version).toBe(1);
    workflow.generateCopy(record.id); workflow.reviewCopy(record.id); workflow.generateVisualDirection(record.id);
    await workflow.produceAssets(record.id); await workflow.render(record.id); await workflow.reviewVisual(record.id);
    expect(record.render!.image_hash).not.toBe(oldHash);
    expect(record.state).toBe("AWAITING_APPROVAL");
    workflow.redoStep(record.id, "visual_production", "maria");
    expect(record.version).toBe(3);
    expect(record.state).toBe("ASSET_PRODUCTION");
    expect(record.versionHistory).toHaveLength(2);
  });
}, 90_000);
