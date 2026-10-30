import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { IncidentWindow, TimelineEvent } from "../lib/types";
import { fetchGitHub, mapGitHub, type GitHubConfig, type GitHubRaw } from "./github";
import { fetchSentry, mapSentry, type SentryConfig, type SentryRaw } from "./sentry";
import { fetchSlack, mapSlack, type SlackConfig, type SlackRaw } from "./slack";
import { fetchVercel, mapVercel, type VercelConfig, type VercelRaw } from "./vercel";

/** Shape of `incident.json` in a fixture folder, and of a live request. */
export interface IncidentConfig extends IncidentWindow {
  title?: string;
  slack?: SlackConfig;
  github?: GitHubConfig;
  sentry?: SentryConfig;
  vercel?: VercelConfig;
}

export interface CollectResult {
  config: IncidentConfig;
  events: TimelineEvent[];
  /** Sources that failed, with the reason. Other sources still count. */
  errors: { source: string; message: string }[];
}

async function readJson<T>(path: string): Promise<T | undefined> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as T;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw err;
  }
}

/** Offline mode: read recorded API responses from a folder. */
export async function collectFromFixture(dir: string): Promise<CollectResult> {
  const config = await readJson<IncidentConfig>(join(dir, "incident.json"));
  if (!config) throw new Error(`No incident.json in ${dir}`);
  const [slack, github, sentry, vercel] = await Promise.all([
    readJson<SlackRaw>(join(dir, "slack.json")),
    readJson<GitHubRaw>(join(dir, "github.json")),
    readJson<SentryRaw>(join(dir, "sentry.json")),
    readJson<VercelRaw>(join(dir, "vercel.json")),
  ]);
  const events = [
    ...(slack ? mapSlack(slack, config) : []),
    ...(github ? mapGitHub(github, config, config.github?.repo) : []),
    ...(sentry ? mapSentry(sentry, config) : []),
    ...(vercel ? mapVercel(vercel, config) : []),
  ];
  return { config, events, errors: [] };
}

/** Live mode: call each configured source's read-only API. */
export async function collectLive(
  config: IncidentConfig,
  env: Record<string, string | undefined> = process.env,
): Promise<CollectResult> {
  const jobs: [string, () => Promise<TimelineEvent[]>][] = [];
  if (config.slack) {
    const c = config.slack;
    jobs.push(["slack", async () => mapSlack(await fetchSlack(c, env), config)]);
  }
  if (config.github) {
    const c = config.github;
    jobs.push(["github", async () => mapGitHub(await fetchGitHub(c, config, env), config, c.repo)]);
  }
  if (config.sentry) {
    const c = config.sentry;
    jobs.push(["sentry", async () => mapSentry(await fetchSentry(c, config, env), config)]);
  }
  if (config.vercel) {
    const c = config.vercel;
    jobs.push(["vercel", async () => mapVercel(await fetchVercel(c, config, env), config)]);
  }

  const settled = await Promise.allSettled(jobs.map(([, run]) => run()));
  const events: TimelineEvent[] = [];
  const errors: CollectResult["errors"] = [];
  settled.forEach((r, i) => {
    const source = jobs[i]![0];
    if (r.status === "fulfilled") events.push(...r.value);
    else errors.push({ source, message: r.reason instanceof Error ? r.reason.message : String(r.reason) });
  });
  return { config, events, errors };
}
