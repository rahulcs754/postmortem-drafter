import { describe, expect, it } from "vitest";
import { draftPostmortem } from "../src/lib/draft";
import { offlineDraft } from "../src/lib/draft/offline";
import { buildUserPrompt } from "../src/lib/draft/prompt";
import { validateDraft } from "../src/lib/draft/validate";
import { toMarkdown } from "../src/lib/markdown";
import { redactText } from "../src/lib/redact";
import { SECTION_KEYS, type Draft } from "../src/lib/types";
import { ev, sampleTimeline } from "./helpers";

const empty = (): Draft["sections"] =>
  Object.fromEntries(SECTION_KEYS.map((k) => [k, []])) as unknown as Draft["sections"];

describe("validateDraft", () => {
  const events = [ev({ id: "slack:1", at: "2026-10-20T09:00:00Z" })];

  it("drops claims with no citation or only unknown ids", () => {
    const sections = empty();
    sections.summary = [
      { text: "ok", cites: ["slack:1", "made:up"], confidence: "confirmed" },
      { text: "no cite", cites: [], confidence: "confirmed" },
      { text: "fake", cites: ["made:up"], confidence: "likely" },
    ];
    const { draft, dropped } = validateDraft({ title: "t", sections }, events);
    expect(draft.sections.summary).toEqual([{ text: "ok", cites: ["slack:1"], confidence: "confirmed" }]);
    expect(dropped.map((d) => d.reason)).toEqual(["no citation", "unknown event ids: made:up"]);
  });

  it("never lets root cause be confirmed", () => {
    const sections = empty();
    sections.rootCause = [{ text: "it was X", cites: ["slack:1"], confidence: "confirmed" }];
    expect(validateDraft({ title: "t", sections }, events).draft.sections.rootCause[0]?.confidence).toBe("likely");
  });
});

describe("offline draft", () => {
  it("cites every line and survives validation untouched", async () => {
    const { timeline } = await sampleTimeline();
    const raw = offlineDraft(timeline, "Checkout crash");
    const { draft, dropped } = validateDraft(raw, timeline.events);
    expect(dropped).toEqual([]);
    expect(draft).toEqual(raw);
    expect(draft.sections.rootCause[0]).toMatchObject({ confidence: "likely", cites: ["vercel:dpl_8kQ", expect.any(String)] });
  });

  it("is used when no API key is set", async () => {
    const { timeline } = await sampleTimeline();
    const result = await draftPostmortem(timeline, { env: {} });
    expect(result.author).toBe("offline");
  });
});

describe("redaction", () => {
  it("masks tokens, emails and IPs", () => {
    expect(redactText("tok xoxb-1234-abcd-xyz mail priya@acme.dev ip 10.0.0.12 key ghp_abcdefghijklmnopqrstuvwxyz12")).toBe(
      "tok [slack-token] mail [email] ip [ip] key [github-token]",
    );
  });

  it("keeps secrets out of the prompt and the Markdown export", async () => {
    const { timeline } = await sampleTimeline();
    const prompt = buildUserPrompt(timeline, "x");
    const md = toMarkdown(offlineDraft(timeline), timeline);
    for (const text of [prompt, md]) {
      expect(text).not.toMatch(/xoxb-|priya@acme\.dev/);
    }
    expect(prompt).toContain("[slack-token]");
  });
});

describe("markdown", () => {
  it("renders sections, the timeline table and labels guesses", async () => {
    const { timeline } = await sampleTimeline();
    const md = toMarkdown(offlineDraft(timeline, "Checkout crash"), timeline);
    expect(md).toMatch(/^# Checkout crash\n/);
    expect(md).toContain("| Time | Source | Event |");
    expect(md).toContain("**Likely:** Triggered by the deploy at 09:08 UTC");
    expect(md).toMatch(/- \[ \] \*\*Guess:\*\* /);
  });
});
