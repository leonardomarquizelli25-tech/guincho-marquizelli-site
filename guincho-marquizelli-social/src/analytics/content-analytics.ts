import { z } from "zod";

export const MetricsSnapshotSchema = z.object({
  content_id: z.string(),
  publication_id: z.string(),
  collected_at: z.string().datetime(),
  reach: z.number().int().nonnegative().nullable(),
  impressions: z.number().int().nonnegative().nullable(),
  likes: z.number().int().nonnegative().nullable(),
  comments: z.number().int().nonnegative().nullable(),
  saves: z.number().int().nonnegative().nullable(),
  shares: z.number().int().nonnegative().nullable(),
  profile_visits: z.number().int().nonnegative().nullable(),
  clicks: z.number().int().nonnegative().nullable(),
  followers_gained: z.number().int().nonnegative().nullable(),
  messages_received: z.number().int().nonnegative().nullable(),
  raw: z.record(z.string(), z.unknown()).default({})
});

export interface AnalyticsProvider {
  collect(publicationId: string): Promise<z.infer<typeof MetricsSnapshotSchema>>;
}

export class MockAnalyticsProvider implements AnalyticsProvider {
  async collect(publicationId: string) {
    return MetricsSnapshotSchema.parse({
      content_id: publicationId.split(":")[0] ?? publicationId,
      publication_id: publicationId,
      collected_at: new Date().toISOString(),
      reach: null, impressions: null, likes: null, comments: null, saves: null, shares: null,
      profile_visits: null, clicks: null, followers_gained: null, messages_received: null,
      raw: { status: "mvp-structure-ready" }
    });
  }
}
