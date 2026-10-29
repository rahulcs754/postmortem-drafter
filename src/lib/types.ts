import { z } from "zod";

export const SOURCES = ["slack", "github", "sentry", "vercel"] as const;
export type Source = (typeof SOURCES)[number];

export const EVENT_KINDS = [
  "message", // chat message
  "alert", // alert or bot message
  "deploy", // production deploy
  "rollback", // rollback or redeploy of an older build
  "commit", // commit or merged PR
  "error", // a single error occurrence
  "error_burst", // grouped errors (built by the timeline, never by adapters)
  "issue", // an error group first seen in the window
] as const;
export type EventKind = (typeof EVENT_KINDS)[number];

export const TimelineEventSchema = z.object({
  /** Stable id, `<source>:<native id>`. Claude cites these. */
  id: z.string(),
  at: z.string().datetime(),
  /** End time for grouped events (error bursts). */
  endAt: z.string().datetime().optional(),
  source: z.enum(SOURCES),
  kind: z.enum(EVENT_KINDS),
  title: z.string(),
  detail: z.string().optional(),
  url: z.string().optional(),
  actor: z.string().optional(),
  /** Grouping key for errors (e.g. Sentry issue id). */
  group: z.string().optional(),
  /** Number of occurrences for grouped events. */
  count: z.number().int().positive().optional(),
  /** Users affected, when the source knows it. */
  users: z.number().int().nonnegative().optional(),
});
export type TimelineEvent = z.infer<typeof TimelineEventSchema>;

export interface IncidentWindow {
  from: string;
  to: string;
}

export interface KeyMoments {
  firstError?: TimelineEvent;
  detected?: TimelineEvent;
  suspectDeploy?: TimelineEvent;
  fix?: TimelineEvent;
  lastError?: TimelineEvent;
}

export interface Metrics {
  /** Minutes from first error to first human/alert signal. */
  timeToDetectMin?: number;
  /** Minutes from first error to last error. */
  durationMin?: number;
  totalErrors: number;
  usersAffected?: number;
}

export interface Timeline {
  window: IncidentWindow;
  events: TimelineEvent[];
  moments: KeyMoments;
  metrics: Metrics;
}

export const CONFIDENCE = ["confirmed", "likely", "guess"] as const;
export type Confidence = (typeof CONFIDENCE)[number];

export const SECTION_KEYS = [
  "summary",
  "impact",
  "detection",
  "rootCause",
  "contributingFactors",
  "wentWell",
  "wentWrong",
  "actionItems",
] as const;
export type SectionKey = (typeof SECTION_KEYS)[number];

export const SECTION_TITLES: Record<SectionKey, string> = {
  summary: "Summary",
  impact: "Impact",
  detection: "Detection",
  rootCause: "Root cause",
  contributingFactors: "Contributing factors",
  wentWell: "What went well",
  wentWrong: "What went wrong",
  actionItems: "Action items",
};

/** Sections where a claim can never be "confirmed" until a human says so. */
export const SPECULATIVE_SECTIONS: readonly SectionKey[] = ["rootCause", "contributingFactors"];

export const ClaimSchema = z.object({
  text: z.string(),
  cites: z.array(z.string()),
  confidence: z.enum(CONFIDENCE),
});
export type Claim = z.infer<typeof ClaimSchema>;

export const DraftSchema = z.object({
  title: z.string(),
  sections: z.object(
    Object.fromEntries(SECTION_KEYS.map((k) => [k, z.array(ClaimSchema)])) as Record<
      SectionKey,
      z.ZodArray<typeof ClaimSchema>
    >,
  ),
});
export type Draft = z.infer<typeof DraftSchema>;

export interface DroppedClaim {
  section: SectionKey;
  claim: Claim;
  reason: string;
}

export interface DraftResult {
  draft: Draft;
  dropped: DroppedClaim[];
  /** "claude" when written by the model, "offline" for the no-AI template. */
  author: "claude" | "offline";
}
