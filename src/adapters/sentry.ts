import type { IncidentWindow, TimelineEvent } from "../lib/types";
import { getJson, inWindow, requireEnv, toIso } from "./util";

export interface SentryRaw {
  issues: {
    id: string;
    shortId: string;
    title: string;
    culprit?: string;
    level?: string;
    firstSeen: string;
    lastSeen: string;
    count: string;
    userCount: number;
    permalink: string;
  }[];
  /** Event timestamps per issue id. */
  events: Record<string, { eventID: string; dateCreated: string }[]>;
}

export interface SentryConfig {
  project: string;
}

export function mapSentry(raw: SentryRaw, window: IncidentWindow): TimelineEvent[] {
  const out: TimelineEvent[] = [];
  for (const issue of raw.issues) {
    const label = `${issue.shortId}: ${issue.title}`;
    if (inWindow(issue.firstSeen, window)) {
      out.push({
        id: `sentry:issue:${issue.id}`,
        at: toIso(issue.firstSeen),
        source: "sentry",
        kind: "issue",
        title: `New issue ${label}`,
        detail: issue.culprit,
        url: issue.permalink,
        group: issue.id,
        users: issue.userCount,
      });
    }
    for (const e of raw.events[issue.id] ?? []) {
      if (!inWindow(e.dateCreated, window)) continue;
      out.push({
        id: `sentry:event:${e.eventID}`,
        at: toIso(e.dateCreated),
        source: "sentry",
        kind: "error",
        title: label,
        url: issue.permalink,
        group: issue.id,
        users: issue.userCount,
      });
    }
  }
  return out;
}

/** Read-only: needs an auth token with event:read and project:read. */
export async function fetchSentry(
  config: SentryConfig,
  window: IncidentWindow,
  env: Record<string, string | undefined>,
): Promise<SentryRaw> {
  const token = requireEnv(env, "SENTRY_TOKEN");
  const org = requireEnv(env, "SENTRY_ORG");
  const params = new URLSearchParams({ start: window.from, end: window.to, query: "", limit: "10" });
  const issues = await getJson<SentryRaw["issues"]>(
    `https://sentry.io/api/0/projects/${org}/${config.project}/issues/?${params}`,
    token,
  );
  const events: SentryRaw["events"] = {};
  for (const issue of issues) {
    const ev = new URLSearchParams({ start: window.from, end: window.to });
    events[issue.id] = await getJson(`https://sentry.io/api/0/issues/${issue.id}/events/?${ev}`, token);
  }
  return { issues, events };
}
