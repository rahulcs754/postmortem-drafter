import { describe, expect, it } from "vitest";
import { buildTimeline, dedupe, groupErrors } from "../src/lib/timeline";
import { ev, sampleTimeline } from "./helpers";

describe("timeline builder", () => {
  it("groups 169 Sentry errors into one burst", async () => {
    const { timeline } = await sampleTimeline();
    const bursts = timeline.events.filter((e) => e.kind === "error_burst");
    expect(bursts).toHaveLength(1);
    expect(bursts[0]).toMatchObject({ count: 169, at: "2026-10-20T09:12:03.000Z" });
    expect(timeline.events.some((e) => e.kind === "error")).toBe(false);
  });

  it("keeps one deploy per sha, preferring Vercel's go-live time", async () => {
    const { timeline } = await sampleTimeline();
    const deploys = timeline.events.filter((e) => e.kind === "deploy" || e.kind === "rollback");
    expect(deploys.map((e) => e.id)).toEqual(["vercel:dpl_8kQ", "vercel:dpl_9mR"]);
  });

  it("finds the key moments of the sample incident", async () => {
    const { timeline } = await sampleTimeline();
    const m = timeline.moments;
    expect(m.suspectDeploy?.id).toBe("vercel:dpl_8kQ");
    expect(m.detected?.actor).toBe("priya");
    expect(m.fix?.kind).toBe("rollback");
    expect(timeline.metrics).toEqual({ totalErrors: 169, usersAffected: 214, timeToDetectMin: 7, durationMin: 31 });
  });

  it("splits a group into two bursts after a 5 minute gap", () => {
    const err = (id: string, at: string) => ev({ id, at, source: "sentry", kind: "error", group: "g" });
    const out = groupErrors([
      err("a", "2026-10-20T09:00:00Z"),
      err("b", "2026-10-20T09:04:00Z"),
      err("c", "2026-10-20T09:20:00Z"),
    ]);
    expect(out.map((e) => [e.id, e.count])).toEqual([
      ["burst:g:1", 2],
      ["burst:g:2", 1],
    ]);
  });

  it("drops duplicate ids and sorts by time", () => {
    const events = [ev({ id: "x", at: "2026-10-20T09:05:00Z" }), ev({ id: "y", at: "2026-10-20T09:01:00Z" }), ev({ id: "x", at: "2026-10-20T09:05:00Z" })];
    expect(dedupe(events)).toHaveLength(2);
    const t = buildTimeline(events, { from: "2026-10-20T09:00:00Z", to: "2026-10-20T10:00:00Z" });
    expect(t.events.map((e) => e.id)).toEqual(["y", "x"]);
    expect(t.moments).toEqual({});
  });
});
