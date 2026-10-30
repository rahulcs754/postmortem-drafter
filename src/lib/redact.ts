import type { TimelineEvent } from "./types";

const RULES: [RegExp, string][] = [
  [/\b(?:xox[abprs]|xapp)-[A-Za-z0-9-]{6,}/g, "[slack-token]"],
  [/\bgh[pousr]_[A-Za-z0-9]{20,}\b/g, "[github-token]"],
  [/\bgithub_pat_[A-Za-z0-9_]{20,}\b/g, "[github-token]"],
  [/\bsk-[A-Za-z0-9_-]{16,}\b/g, "[api-key]"],
  [/\bAKIA[0-9A-Z]{16}\b/g, "[aws-key]"],
  [/\bBearer\s+[A-Za-z0-9._~+/=-]{12,}/gi, "Bearer [token]"],
  [/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g, "[jwt]"],
  [/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "[email]"],
  [/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, "[ip]"],
];

export function redactText(text: string): string {
  return RULES.reduce((out, [pattern, replacement]) => out.replace(pattern, replacement), text);
}

/** Copy of the event with secrets and personal data masked. Run before anything goes to Claude. */
export function redactEvent(e: TimelineEvent): TimelineEvent {
  return {
    ...e,
    title: redactText(e.title),
    detail: e.detail === undefined ? undefined : redactText(e.detail),
  };
}
