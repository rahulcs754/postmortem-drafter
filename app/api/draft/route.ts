import { join } from "node:path";
import { z } from "zod";
import { runPipeline } from "../../../src/lib/pipeline";
import { redactEvent } from "../../../src/lib/redact";

export const runtime = "nodejs";

const LiveSchema = z.object({
  title: z.string().optional(),
  from: z.string().datetime(),
  to: z.string().datetime(),
  slack: z.object({ channel: z.string(), thread_ts: z.string() }).optional(),
  github: z.object({ repo: z.string().regex(/^[\w.-]+\/[\w.-]+$/) }).optional(),
  sentry: z.object({ project: z.string() }).optional(),
  vercel: z.object({ project: z.string() }).optional(),
});

const BodySchema = z.object({
  ai: z.boolean().optional(),
  // Folder name under examples/ only: no paths.
  fixture: z.string().regex(/^[\w-]+$/).optional(),
  live: LiveSchema.optional(),
});

export async function POST(request: Request) {
  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || (!parsed.data.fixture && !parsed.data.live)) {
    return Response.json({ error: "Send { fixture } or { live }." }, { status: 400 });
  }
  const { fixture, live, ai } = parsed.data;
  try {
    const run = await runPipeline(
      fixture ? { fixture: join(process.cwd(), "examples", fixture) } : { live: live! },
      { ai },
    );
    return Response.json({
      title: run.config.title,
      // The browser gets the same redacted text Claude sees; links still open the raw source.
      timeline: { ...run.timeline, events: run.timeline.events.map(redactEvent) },
      ...run.result,
      sourceErrors: run.sourceErrors,
    });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : "Draft failed" }, { status: 500 });
  }
}
