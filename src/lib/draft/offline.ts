import { clock, plural } from "../format";
import type { Claim, Draft, Timeline } from "../types";

/**
 * Template draft with no AI. Every line is built from the key moments, so it is
 * always cited. Used when there is no ANTHROPIC_API_KEY, and as the demo default.
 */
export function offlineDraft(timeline: Timeline, title = "Incident postmortem"): Draft {
  const { firstError, detected, suspectDeploy, fix, lastError } = timeline.moments;
  const m = timeline.metrics;
  const claim = (text: string, cites: (string | undefined)[], confidence: Claim["confidence"] = "confirmed"): Claim => ({
    text,
    cites: [...new Set(cites.filter((c): c is string => Boolean(c)))],
    confidence,
  });

  const sections: Draft["sections"] = {
    summary: [],
    impact: [],
    detection: [],
    rootCause: [],
    contributingFactors: [],
    wentWell: [],
    wentWrong: [],
    actionItems: [],
  };

  if (firstError) {
    sections.summary.push(
      claim(
        `Errors started at ${clock(firstError.at)}: ${firstError.title.replace(/^\d+ errors in \d+ min: /, "")}.`,
        [firstError.id],
      ),
    );
    sections.impact.push(
      claim(
        `${plural(m.totalErrors, "error")}${m.usersAffected ? ` affecting about ${plural(m.usersAffected, "user")}` : ""}` +
          `${m.durationMin !== undefined ? ` over ${m.durationMin} min` : ""}.`,
        [firstError.id, lastError?.id],
      ),
    );
  }
  if (detected && firstError) {
    sections.detection.push(
      claim(
        `First human or alert signal at ${clock(detected.at)}${detected.actor ? ` (${detected.actor})` : ""}, ` +
          `${m.timeToDetectMin} min after the first error.`,
        [firstError.id, detected.id],
      ),
    );
    if (detected.kind === "message") {
      sections.wentWrong.push(claim("No automated alert reached the team; a person noticed first.", [detected.id], "likely"));
      sections.actionItems.push(claim("Route error-rate alerts for this service to the incident channel.", [detected.id], "guess"));
    }
  }
  if (suspectDeploy && firstError) {
    const gap = Math.round((new Date(firstError.at).getTime() - new Date(suspectDeploy.at).getTime()) / 60_000);
    sections.rootCause.push(
      claim(
        `Triggered by the deploy at ${clock(suspectDeploy.at)} ("${suspectDeploy.title}"), ${gap} min before the first error.`,
        [suspectDeploy.id, firstError.id],
        "likely",
      ),
    );
    sections.actionItems.push(claim("Add a test that covers the failing case, then re-land the change.", [suspectDeploy.id], "guess"));
  }
  if (fix) {
    sections.summary.push(claim(`${fix.kind === "rollback" ? "Rolled back" : "Fixed"} by the deploy at ${clock(fix.at)}.`, [fix.id]));
    if (fix.kind === "rollback") sections.wentWell.push(claim("The team rolled back instead of hot-fixing under pressure.", [fix.id], "likely"));
  }
  if (lastError) {
    sections.summary.push(claim(`Last error seen at ${clock(lastError.endAt ?? lastError.at)}.`, [lastError.id]));
  }

  return { title, sections };
}
