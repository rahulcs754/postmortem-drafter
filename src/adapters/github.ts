import type { IncidentWindow, TimelineEvent } from "../lib/types";
import { firstLine, getJson, inWindow, requireEnv, toIso } from "./util";

export interface GitHubRaw {
  deployments: {
    id: number;
    sha: string;
    environment: string;
    created_at: string;
    creator: { login: string } | null;
    description: string | null;
  }[];
  pulls: {
    number: number;
    title: string;
    html_url: string;
    merged_at: string | null;
    user: { login: string } | null;
    body: string | null;
  }[];
}

export interface GitHubConfig {
  repo: string; // owner/name
}

const isRevert = (text: string) => /^revert\b/i.test(text.trim());

export function mapGitHub(raw: GitHubRaw, window: IncidentWindow, repo?: string): TimelineEvent[] {
  const deploys = raw.deployments
    .filter((d) => /prod/i.test(d.environment))
    .map((d): TimelineEvent => {
      const description = d.description ?? d.sha.slice(0, 7);
      return {
        id: `github:deploy:${d.id}`,
        at: toIso(d.created_at),
        source: "github",
        kind: isRevert(description) ? "rollback" : "deploy",
        title: `Deploy to ${d.environment}: ${firstLine(description)}`,
        detail: `sha ${d.sha}`,
        actor: d.creator?.login,
        url: repo ? `https://github.com/${repo}/commit/${d.sha}` : undefined,
      };
    });

  const merges = raw.pulls
    .filter((p): p is GitHubRaw["pulls"][number] & { merged_at: string } => p.merged_at !== null)
    .map(
      (p): TimelineEvent => ({
        id: `github:pr:${p.number}`,
        at: toIso(p.merged_at),
        source: "github",
        kind: "commit",
        title: `Merged #${p.number}: ${p.title}`,
        detail: p.body ?? undefined,
        actor: p.user?.login,
        url: p.html_url,
      }),
    );

  return [...deploys, ...merges].filter((e) => inWindow(e.at, window));
}

/** Read-only: needs a token with contents:read and deployments:read. */
export async function fetchGitHub(
  config: GitHubConfig,
  window: IncidentWindow,
  env: Record<string, string | undefined>,
): Promise<GitHubRaw> {
  const token = requireEnv(env, "GITHUB_TOKEN");
  const api = `https://api.github.com/repos/${config.repo}`;
  const headers = { "X-GitHub-Api-Version": "2022-11-28" };
  const [deployments, pulls] = await Promise.all([
    getJson<GitHubRaw["deployments"]>(`${api}/deployments?per_page=100`, token, headers),
    getJson<GitHubRaw["pulls"]>(
      `${api}/pulls?state=closed&sort=updated&direction=desc&per_page=100`,
      token,
      headers,
    ),
  ]);
  // The API has no time filter for these lists; mapGitHub trims to the window.
  void window;
  return { deployments, pulls };
}
