# Postmortem Drafter: MVP plan

**One line:** Give it an incident time window and links. It collects evidence from Slack, GitHub, Sentry and Vercel, builds one timeline, and Claude drafts a postmortem with a citation on every line.

## How it works
1. **Input:** time window (`from`, `to`), Slack thread URL, GitHub repo, Sentry project, Vercel project. Or a folder of exported JSON (offline mode, used for demo and tests).
2. **Adapters:** each source returns `TimelineEvent[]`:
   `{ id, at, source, kind, title, detail?, url, actor? }`
   - Slack: thread messages (`conversations.replies`)
   - GitHub: deployments, merged PRs and commits in the window
   - Sentry: issues first seen / spiking in the window, event counts per minute
   - Vercel: deployments, promotions/rollbacks, runtime error logs
3. **Timeline builder (code, no AI):** sort, de-duplicate, group bursts ("412 errors of TypeError X in 6 min"), find key moments: first error, first alert/message, suspect deploy, fix deploy, recovery.
4. **Metrics (code):** time to detect, time to resolve, error count, affected users (Sentry) where known.
5. **Draft (Claude):** structured output per section. Each sentence carries `cites: eventId[]`. Root cause is labelled "Likely". Uncited sentences are dropped.
6. **Editor (Next.js):** timeline on the left, draft on the right. Click a citation to jump to the event. Edit, accept or delete each section. Export Markdown.

## Postmortem sections
Summary · Impact · Timeline · Detection · Root cause (likely) · Contributing factors · What went well · What went wrong · Action items (owner, due date blank)

## Stack
Next.js App Router + TypeScript, zod schemas, Anthropic SDK (tool/structured output), vitest. Storage: local JSON files in the MVP (no DB). Auth: none in MVP, tokens from `.env`.

## Build order (3 weeks)
1. Types + sample incident fixture (fake Slack thread, deploys, Sentry spike) + timeline builder + tests
2. CLI `draft --fixture` that prints the timeline and Markdown (no AI) 
3. Claude drafting with citations + validator that drops uncited claims
4. Live adapters: GitHub and Sentry, then Slack, then Vercel
5. Next.js editor page + Markdown export
6. Demo: record a GIF on the sample incident for the README

## Safety and trust
- Read-only tokens. The tool never posts or changes anything.
- Redact emails, tokens and IPs before sending to Claude.
- Every claim links to its source. Guesses are marked as guesses.

## Later
- Slack slash command `/postmortem` that posts a link to the draft
- PagerDuty / Opsgenie alerts as a source
- Action items → GitHub issues (with confirm)
- Pattern view across past incidents
