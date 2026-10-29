import type { IncidentWindow, TimelineEvent } from "../lib/types";
import { firstLine, getJson, inWindow, requireEnv, toIso } from "./util";

export interface SlackRaw {
  users: Record<string, string>;
  permalink_base?: string;
  messages: { ts: string; user?: string; bot_id?: string; username?: string; text: string }[];
}

export interface SlackConfig {
  channel: string;
  thread_ts: string;
}

export function mapSlack(raw: SlackRaw, window: IncidentWindow): TimelineEvent[] {
  return raw.messages
    .map((m): TimelineEvent => {
      const at = toIso(Number(m.ts) * 1000);
      const actor = m.user ? (raw.users[m.user] ?? m.user) : m.username;
      return {
        id: `slack:${m.ts}`,
        at,
        source: "slack",
        kind: m.bot_id ? "alert" : "message",
        title: firstLine(m.text),
        detail: m.text,
        actor,
        url: raw.permalink_base ? `${raw.permalink_base}/p${m.ts.replace(".", "")}` : undefined,
      };
    })
    .filter((e) => inWindow(e.at, window));
}

/** Reads one thread. Needs a bot token with channels:history (read-only). */
export async function fetchSlack(config: SlackConfig, env: Record<string, string | undefined>): Promise<SlackRaw> {
  const token = requireEnv(env, "SLACK_TOKEN");
  const params = new URLSearchParams({ channel: config.channel, ts: config.thread_ts, limit: "200" });
  const replies = await getJson<{ ok: boolean; error?: string; messages: SlackRaw["messages"] }>(
    `https://slack.com/api/conversations.replies?${params}`,
    token,
  );
  if (!replies.ok) throw new Error(`Slack conversations.replies failed: ${replies.error}`);

  const users: Record<string, string> = {};
  for (const id of new Set(replies.messages.flatMap((m) => (m.user ? [m.user] : [])))) {
    const info = await getJson<{ ok: boolean; user?: { name: string } }>(
      `https://slack.com/api/users.info?user=${id}`,
      token,
    );
    if (info.ok && info.user) users[id] = info.user.name;
  }
  return { users, messages: replies.messages };
}
