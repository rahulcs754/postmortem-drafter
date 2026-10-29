import type { IncidentWindow, KeyMoments, Metrics, Timeline, TimelineEvent } from "./types";

/** Errors in the same group closer than this are one burst. */
const BURST_GAP_MS = 5 * 60_000;

const time = (e: TimelineEvent) => new Date(e.at).getTime();
const byTime = (a: TimelineEvent, b: TimelineEvent) => time(a) - time(b) || a.id.localeCompare(b.id);
const isDeploy = (e: TimelineEvent) => e.kind === "deploy" || e.kind === "rollback";
const isErrorish = (e: TimelineEvent) => e.kind === "error_burst" || e.kind === "issue";
const minutes = (from: TimelineEvent, to: TimelineEvent) => Math.round((time(to) - time(from)) / 60_000);

/** Drops exact duplicates and the same deploy seen from GitHub and Vercel (same sha). */
export function dedupe(events: TimelineEvent[]): TimelineEvent[] {
  const seen = new Set<string>();
  const shas = new Set<string>();
  const out: TimelineEvent[] = [];
  // Vercel first: its time is when the build went live, which matters more than when it started.
  const ordered = [...events].sort((a, b) => Number(b.source === "vercel") - Number(a.source === "vercel"));
  for (const e of ordered) {
    if (seen.has(e.id)) continue;
    seen.add(e.id);
    const sha = isDeploy(e) ? e.detail?.match(/sha ([0-9a-f]{7,40})/)?.[1] : undefined;
    if (sha) {
      if (shas.has(sha)) continue;
      shas.add(sha);
    }
    out.push(e);
  }
  return out;
}

/** Turns single error events into one `error_burst` per group per burst. */
export function groupErrors(events: TimelineEvent[]): TimelineEvent[] {
  const errors = events.filter((e) => e.kind === "error").sort(byTime);
  const rest = events.filter((e) => e.kind !== "error");
  const bursts: TimelineEvent[] = [];
  const open = new Map<string, { first: TimelineEvent; last: TimelineEvent; count: number; index: number }>();
  const indexes = new Map<string, number>();

  const close = (key: string) => {
    const b = open.get(key);
    if (!b) return;
    const span = minutes(b.first, b.last);
    bursts.push({
      ...b.first,
      id: `burst:${key}:${b.index}`,
      kind: "error_burst",
      title: `${b.count} errors in ${Math.max(span, 1)} min: ${b.first.title}`,
      detail: `From ${b.first.at} to ${b.last.at}`,
      count: b.count,
      endAt: b.last.at,
    });
    open.delete(key);
  };

  for (const e of errors) {
    const key = e.group ?? e.title;
    const b = open.get(key);
    if (b && time(e) - time(b.last) <= BURST_GAP_MS) {
      b.last = e;
      b.count += 1;
      continue;
    }
    close(key);
    const index = (indexes.get(key) ?? 0) + 1;
    indexes.set(key, index);
    open.set(key, { first: e, last: e, count: 1, index });
  }
  for (const key of [...open.keys()]) close(key);
  return [...rest, ...bursts];
}

/** End time of an event: bursts carry their last error time. */
export const endOf = (e: TimelineEvent): string => e.endAt ?? e.at;

export function findMoments(events: TimelineEvent[]): KeyMoments {
  const firstError = events.find(isErrorish);
  if (!firstError) return {};
  const t0 = time(firstError);

  const detected = events.find((e) => (e.kind === "message" || e.kind === "alert") && time(e) >= t0);
  const suspectDeploy = [...events].reverse().find((e) => e.kind === "deploy" && time(e) <= t0);
  const fix = events.find((e) => isDeploy(e) && time(e) > t0 && e !== suspectDeploy);
  const lastError = events
    .filter(isErrorish)
    .reduce((a, b) => (new Date(endOf(b)).getTime() > new Date(endOf(a)).getTime() ? b : a));
  return { firstError, detected, suspectDeploy, fix, lastError };
}

export function computeMetrics(events: TimelineEvent[], moments: KeyMoments): Metrics {
  const bursts = events.filter((e) => e.kind === "error_burst");
  const totalErrors = bursts.reduce((sum, e) => sum + (e.count ?? 1), 0);
  const users = events.flatMap((e) => (e.users === undefined ? [] : [e.users]));
  const { firstError, detected, lastError } = moments;
  return {
    totalErrors,
    usersAffected: users.length ? Math.max(...users) : undefined,
    timeToDetectMin: firstError && detected ? minutes(firstError, detected) : undefined,
    durationMin:
      firstError && lastError
        ? Math.round((new Date(endOf(lastError)).getTime() - time(firstError)) / 60_000)
        : undefined,
  };
}

/** The whole pipeline after adapters: dedupe, group, sort, find key moments. Pure code, no AI. */
export function buildTimeline(events: TimelineEvent[], window: IncidentWindow): Timeline {
  const grouped = groupErrors(dedupe(events)).sort(byTime);
  const moments = findMoments(grouped);
  return { window, events: grouped, moments, metrics: computeMetrics(grouped, moments) };
}
