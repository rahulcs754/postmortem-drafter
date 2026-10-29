import { describe, expect, it } from "vitest";
import { collectFromFixture } from "../src/adapters";
import { mapGitHub } from "../src/adapters/github";
import { mapVercel } from "../src/adapters/vercel";
import { TimelineEventSchema } from "../src/lib/types";
import { FIXTURE } from "./helpers";

const window = { from: "2026-10-20T08:50:00Z", to: "2026-10-20T10:10:00Z" };

describe("adapters (recorded fixtures)", () => {
  it("returns valid events, all inside the window", async () => {
    const { events } = await collectFromFixture(FIXTURE);
    expect(events.length).toBeGreaterThan(100);
    for (const e of events) {
      expect(() => TimelineEventSchema.parse(e)).not.toThrow();
      expect(e.at >= "2026-10-20T08:50:00.000Z" && e.at <= "2026-10-20T10:10:00.000Z").toBe(true);
    }
  });

  it("maps Slack user ids to names and builds permalinks", async () => {
    const { events } = await collectFromFixture(FIXTURE);
    const first = events.find((e) => e.source === "slack")!;
    expect(first.actor).toBe("priya");
    expect(first.url).toMatch(/^https:\/\/acme\.slack\.com\/archives\/C07INCIDENT\/p\d+$/);
  });

  it("marks revert deploys as rollbacks and skips non-production Vercel builds", () => {
    const vercel = mapVercel(
      {
        deployments: [
          { uid: "a", url: "a.app", created: Date.parse("2026-10-20T09:00:00Z"), state: "READY", target: "production", creator: { username: "x" }, meta: { githubCommitMessage: 'Revert "thing"' } },
          { uid: "b", url: "b.app", created: Date.parse("2026-10-20T09:00:00Z"), state: "READY", target: null, creator: { username: "x" } },
          { uid: "c", url: "c.app", created: Date.parse("2026-10-20T09:00:00Z"), state: "ERROR", target: "production", creator: { username: "x" } },
        ],
      },
      window,
    );
    expect(vercel.map((e) => [e.id, e.kind])).toEqual([["vercel:a", "rollback"]]);
  });

  it("ignores unmerged PRs and non-production GitHub deployments", () => {
    const events = mapGitHub(
      {
        deployments: [{ id: 1, sha: "abc1234", environment: "Preview", created_at: "2026-10-20T09:00:00Z", creator: null, description: null }],
        pulls: [{ number: 5, title: "Open PR", html_url: "u", merged_at: null, user: null, body: null }],
      },
      window,
    );
    expect(events).toEqual([]);
  });
});
