import { collectFromFixture, collectLive, type CollectResult, type IncidentConfig } from "../adapters";
import { draftPostmortem } from "./draft";
import { toMarkdown } from "./markdown";
import { buildTimeline } from "./timeline";
import type { DraftResult, Timeline } from "./types";

export interface PipelineResult {
  config: IncidentConfig;
  timeline: Timeline;
  result: DraftResult;
  markdown: string;
  sourceErrors: CollectResult["errors"];
}

export type PipelineInput = { fixture: string } | { live: IncidentConfig };

export async function runPipeline(input: PipelineInput, opts: { ai?: boolean } = {}): Promise<PipelineResult> {
  const collected = "fixture" in input ? await collectFromFixture(input.fixture) : await collectLive(input.live);
  const { config } = collected;
  const timeline = buildTimeline(collected.events, { from: config.from, to: config.to });
  const result = await draftPostmortem(timeline, { title: config.title, ai: opts.ai });
  return { config, timeline, result, markdown: toMarkdown(result.draft, timeline), sourceErrors: collected.errors };
}
