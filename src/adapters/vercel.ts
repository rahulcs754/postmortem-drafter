import type { IncidentWindow, TimelineEvent } from "../lib/types";
import { firstLine, getJson, inWindow, requireEnv, toIso } from "./util";

export interface VercelRaw {
  deployments: {
    uid: string;
    url: string;
    created: number;
    /** When the build went live, if known. */
    ready?: number;
    state: string;
    target: string | null;
    creator: { username: string };
    meta?: { githubCommitSha?: string; githubCommitMessage?: string };
  }[];
}

export interface VercelConfig {
  project: string;
}

export function mapVercel(raw: VercelRaw, window: IncidentWindow): TimelineEvent[] {
  return raw.deployments
    .filter((d) => d.target === "production" && d.state === "READY")
    .map((d): TimelineEvent => {
      const message = d.meta?.githubCommitMessage ?? d.url;
      return {
        id: `vercel:${d.uid}`,
        at: toIso(d.ready ?? d.created),
        source: "vercel",
        kind: /^revert\b/i.test(message) ? "rollback" : "deploy",
        title: `Production live: ${firstLine(message)}`,
        detail: d.meta?.githubCommitSha ? `sha ${d.meta.githubCommitSha}` : undefined,
        actor: d.creator.username,
        url: `https://${d.url}`,
      };
    })
    .filter((e) => inWindow(e.at, window));
}

/** Read-only: a Vercel token scoped to the team. */
export async function fetchVercel(
  config: VercelConfig,
  window: IncidentWindow,
  env: Record<string, string | undefined>,
): Promise<VercelRaw> {
  const token = requireEnv(env, "VERCEL_TOKEN");
  const params = new URLSearchParams({
    projectId: config.project,
    target: "production",
    since: String(new Date(window.from).getTime()),
    until: String(new Date(window.to).getTime()),
    limit: "50",
  });
  if (env.VERCEL_TEAM_ID) params.set("teamId", env.VERCEL_TEAM_ID);
  return getJson<VercelRaw>(`https://api.vercel.com/v6/deployments?${params}`, token);
}
