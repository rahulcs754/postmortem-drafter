# Postmortem Drafter

Turn a messy incident into a **first-draft postmortem** in minutes. It pulls the Slack thread, GitHub deploys and commits, Sentry errors and Vercel logs for the incident window, builds one timeline, and drafts the postmortem for your team to edit.

> Status: planning. See [docs/MVP-PLAN.md](docs/MVP-PLAN.md).

## Why
- Median toil is 34% of SRE time (SRE Report 2026). Writing postmortems by hand is a big part of it.
- Only 29% of developers trust AI accuracy, so this tool writes a **draft**, links every claim to its source, and marks guesses as guesses.
- incident.io, Rootly and FireHydrant are strong but priced for mid-size SRE teams. Small web teams on Vercel + Sentry often have nothing.

## What you get
- A single timeline: messages, deploys, commits, error spikes, log errors
- Draft sections: summary, impact, timeline, root cause (marked as a guess), what went well, action items
- Every line links back to the Slack message, commit, deploy or Sentry issue it came from
- Export to Markdown (paste into Notion, GitHub, Confluence)

## Planned usage
```bash
npx postmortem-drafter draft \
  --from "2026-10-20T09:10Z" --to "2026-10-20T10:05Z" \
  --slack-thread https://acme.slack.com/archives/C123/p1700000000 \
  --repo acme/web --sentry-project web
```
Or open the web app, pick the time window and sources, and edit the draft in the browser.
