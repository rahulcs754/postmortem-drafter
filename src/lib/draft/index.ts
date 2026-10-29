import type { DraftResult, Timeline } from "../types";
import { claudeDraft } from "./claude";
import { offlineDraft } from "./offline";
import { validateDraft } from "./validate";

export interface DraftOptions {
  title?: string;
  /** false forces the offline template even when a key is set. */
  ai?: boolean;
  env?: Record<string, string | undefined>;
}

export async function draftPostmortem(timeline: Timeline, opts: DraftOptions = {}): Promise<DraftResult> {
  const env = opts.env ?? process.env;
  const useAi = opts.ai !== false && Boolean(env.ANTHROPIC_API_KEY);
  const raw = useAi ? await claudeDraft(timeline, opts.title) : offlineDraft(timeline, opts.title);
  const { draft, dropped } = validateDraft(raw, timeline.events);
  return { draft, dropped, author: useAi ? "claude" : "offline" };
}

export { offlineDraft, validateDraft };
