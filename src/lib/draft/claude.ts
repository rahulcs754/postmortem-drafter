import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { DraftSchema, type Draft, type Timeline } from "../types";
import { SYSTEM_PROMPT, buildUserPrompt } from "./prompt";

export const MODEL = "claude-opus-5-5";

/** Asks Claude for a structured draft. The caller must still run validateDraft on the result. */
export async function claudeDraft(timeline: Timeline, title?: string, client = new Anthropic()): Promise<Draft> {
  const response = await client.beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    // Opus 5.5 defaults to medium effort; a postmortem needs careful reading of the timeline.
    output_config: { effort: "high", format: betaZodOutputFormat(DraftSchema) },
    // If a safety classifier declines, the API retries on a fallback model in the same call.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildUserPrompt(timeline, title) }],
  });

  if (response.stop_reason === "refusal") {
    throw new Error(`Claude declined to draft this incident (${response.stop_details?.category ?? "no category"}).`);
  }
  if (response.stop_reason === "max_tokens") throw new Error("Draft was cut off at max_tokens.");
  if (!response.parsed_output) throw new Error("Claude returned a draft that does not match the schema.");
  return response.parsed_output;
}
