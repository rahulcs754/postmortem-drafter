import { redactEvent } from "../redact";
import type { Timeline } from "../types";

export const SYSTEM_PROMPT = `You write first drafts of blameless incident postmortems for small web teams.

You get a timeline of events that code has already collected and ordered. Each event has an id. You do not invent events.

Rules:
- Every claim cites one or more event ids from the timeline in "cites". A claim with no real citation will be deleted.
- Use "confirmed" only when the cited events state the fact directly. Use "likely" for well-supported inference and "guess" for anything weaker.
- Root cause and contributing factors are never "confirmed": a human confirms them later.
- Blameless: describe systems and decisions, not people's faults. Names may appear only as who did an action.
- Short, plain sentences. One fact per claim. No filler.
- Action items: concrete, small, each one a single change. Leave owners out.
- If the evidence does not support a section, leave it empty.`;

/** Builds the user message. Events are redacted here, so nothing raw reaches the model. */
export function buildUserPrompt(timeline: Timeline, title?: string): string {
  const events = timeline.events.map(redactEvent).map((e) => ({
    id: e.id,
    at: e.at,
    ...(e.endAt ? { endAt: e.endAt } : {}),
    source: e.source,
    kind: e.kind,
    title: e.title,
    ...(e.detail && e.detail !== e.title ? { detail: e.detail } : {}),
    ...(e.actor ? { actor: e.actor } : {}),
    ...(e.count ? { count: e.count } : {}),
    ...(e.users !== undefined ? { users: e.users } : {}),
  }));
  const moments = Object.fromEntries(
    Object.entries(timeline.moments).flatMap(([k, e]) => (e ? [[k, e.id]] : [])),
  );

  return [
    title ? `Incident: ${title}` : "Incident: (no title yet, write one)",
    `Window: ${timeline.window.from} to ${timeline.window.to}`,
    `Metrics (computed by code): ${JSON.stringify(timeline.metrics)}`,
    `Key moments (computed by code, may be wrong): ${JSON.stringify(moments)}`,
    "",
    "<timeline>",
    ...events.map((e) => JSON.stringify(e)),
    "</timeline>",
    "",
    "Write the postmortem draft.",
  ].join("\n");
}
