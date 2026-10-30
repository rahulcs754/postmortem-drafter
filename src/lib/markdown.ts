import { clock, day } from "./format";
import { redactText } from "./redact";
import { SECTION_KEYS, SECTION_TITLES, type Claim, type Draft, type Timeline, type TimelineEvent } from "./types";

const LABEL: Record<Claim["confidence"], string> = { confirmed: "", likely: "**Likely:** ", guess: "**Guess:** " };

function cite(ids: string[], byId: Map<string, TimelineEvent>): string {
  return ids
    .map((id) => {
      const e = byId.get(id);
      if (!e) return `\`${id}\``;
      const label = e.endAt ? `${clock(e.at).slice(0, 5)}–${clock(e.endAt)}` : clock(e.at);
      return e.url ? `[${label}](${e.url})` : `${label} \`${id}\``;
    })
    .join(", ");
}

export function eventLine(e: TimelineEvent): string {
  const actor = e.actor ? ` (${e.actor})` : "";
  // Redacted: the export gets shared more widely than the raw evidence.
  const text = redactText(e.title).replaceAll("|", "\\|");
  const title = e.url ? `[${text}](${e.url})` : text;
  return `| ${clock(e.at)} | ${e.source} | ${title}${actor} |`;
}

export function toMarkdown(draft: Draft, timeline: Timeline): string {
  const byId = new Map(timeline.events.map((e) => [e.id, e]));
  const m = timeline.metrics;
  const lines = [
    `# ${draft.title}`,
    "",
    `_Draft · ${day(timeline.window.from)} · ${clock(timeline.window.from)} to ${clock(timeline.window.to)}. Every line links to its evidence. "Likely" and "Guess" need a human to confirm._`,
    "",
    `**Errors:** ${m.totalErrors}` +
      (m.usersAffected !== undefined ? ` · **Users affected:** ${m.usersAffected}` : "") +
      (m.timeToDetectMin !== undefined ? ` · **Time to detect:** ${m.timeToDetectMin} min` : "") +
      (m.durationMin !== undefined ? ` · **Duration:** ${m.durationMin} min` : ""),
  ];

  for (const key of SECTION_KEYS) {
    const claims = draft.sections[key];
    if (key === "actionItems" || claims.length) lines.push("", `## ${SECTION_TITLES[key]}`, "");
    for (const c of claims) {
      const prefix = key === "actionItems" ? "- [ ] " : "- ";
      lines.push(`${prefix}${LABEL[c.confidence]}${c.text} (${cite(c.cites, byId)})`);
    }
    if (key === "impact") {
      lines.push("", "## Timeline", "", "| Time | Source | Event |", "|---|---|---|", ...timeline.events.map(eventLine));
    }
  }
  return `${lines.join("\n")}\n`;
}
