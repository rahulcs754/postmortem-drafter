import { join } from "node:path";
import { collectFromFixture } from "../src/adapters";
import { buildTimeline } from "../src/lib/timeline";
import type { TimelineEvent } from "../src/lib/types";

export const FIXTURE = join(import.meta.dirname, "..", "examples", "incident-1");

export async function sampleTimeline() {
  const { config, events } = await collectFromFixture(FIXTURE);
  return { config, timeline: buildTimeline(events, config) };
}

export function ev(partial: Partial<TimelineEvent> & Pick<TimelineEvent, "id" | "at">): TimelineEvent {
  return { source: "slack", kind: "message", title: partial.id, ...partial };
}
