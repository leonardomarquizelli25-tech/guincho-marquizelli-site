import { validateCommercialClaims } from "../brand/commercial-validator.js";
import { CopyReviewSchema, type Copy, type CopyReview, type ReviewProblemSchema } from "../schemas/index.js";
import type { z } from "zod";

type ReviewProblem = z.infer<typeof ReviewProblemSchema>;

export class CopyReviewerAgent {
  run(copy: Copy): CopyReview {
    const problems: ReviewProblem[] = [];
    const allText = [copy.headline, copy.supporting_text, copy.cta, copy.caption, ...copy.hashtags].join("\n");
    for (const finding of validateCommercialClaims(allText)) {
      problems.push({ severity: finding.severity, category: "commercial", description: finding.message });
    }
    const wordCount = copy.headline.replace(/[^\p{L}\p{N}\s]/gu, "").trim().split(/\s+/).filter(Boolean).length;
    if (wordCount < 3 || wordCount > 8) {
      problems.push({ severity: "medium", category: "headline", description: "Headline deve ter entre 3 e 8 palavras." });
    }
    if (!/reboque/i.test(copy.cta)) {
      problems.push({ severity: "high", category: "cta", description: "CTA não direciona ao serviço real de reboque." });
    }
    if (copy.hashtags.length > 10) {
      problems.push({ severity: "medium", category: "hashtags", description: "Excesso de hashtags." });
    }
    if (!/pode(m)? indicar|se houver risco|não possa seguir|nao possa seguir/i.test(copy.caption)) {
      problems.push({ severity: "medium", category: "safety", description: "Legenda precisa evitar diagnóstico definitivo." });
    }
    const deductions = problems.reduce((total, problem) => total + ({ low: 2, medium: 6, high: 30 }[problem.severity]), 0);
    const score = Math.max(0, 100 - deductions);
    return CopyReviewSchema.parse({
      approved: score >= 90 && !problems.some((problem) => problem.severity === "high"),
      score,
      problems,
      required_changes: problems.map((problem) => problem.description),
      final_copy: copy
    });
  }
}
