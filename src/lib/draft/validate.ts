import {
  SECTION_KEYS,
  SPECULATIVE_SECTIONS,
  type Draft,
  type DroppedClaim,
  type TimelineEvent,
} from "../types";

/**
 * Enforces the trust rules on any draft, from Claude or a human edit:
 * - a claim must cite at least one event, and every cited id must exist (unknown ids are removed)
 * - root cause and contributing factors can never be "confirmed"
 */
export function validateDraft(draft: Draft, events: TimelineEvent[]): { draft: Draft; dropped: DroppedClaim[] } {
  const ids = new Set(events.map((e) => e.id));
  const dropped: DroppedClaim[] = [];
  const sections = {} as Draft["sections"];

  for (const section of SECTION_KEYS) {
    sections[section] = [];
    for (const claim of draft.sections[section] ?? []) {
      const cites = [...new Set(claim.cites.filter((id) => ids.has(id)))];
      if (cites.length === 0) {
        const reason = claim.cites.length ? `unknown event ids: ${claim.cites.join(", ")}` : "no citation";
        dropped.push({ section, claim, reason });
        continue;
      }
      const confidence =
        SPECULATIVE_SECTIONS.includes(section) && claim.confidence === "confirmed" ? "likely" : claim.confidence;
      sections[section].push({ ...claim, cites, confidence });
    }
  }
  return { draft: { title: draft.title, sections }, dropped };
}
