# Research notes (Oct 2026)

- SRE Report 2026: median toil is 34% of SRE time; over half plan to run agentic AI in production within 12 months, but trust is low. Source: https://www.logicmonitor.com/press/the-sre-report-2026-reliability-is-being-redefined/
- Stack Overflow Developer Survey 2025: only 29% of developers trust AI accuracy. Source: https://stackoverflow.blog/2025/07/29/developers-remain-willing-but-reluctant-to-use-ai-the-2025-developer-survey-results-are-here
- Takeaway: a human-edited draft with citations fits better than a fully automatic report.

## Competitors
- incident.io, Rootly, FireHydrant: full incident platforms (on-call, status pages, AI postmortems). Strong, but priced and built for mid-size SRE teams.
- PagerDuty / Opsgenie: alerting first, postmortem is a side feature.
- Notion / Google Docs templates: free, but all copy-paste by hand.

**Gap:** small frontend/product teams on Vercel + Sentry + Slack, with no incident tool. They want a good postmortem after the fact, not a new platform.

**Honest risk:** incumbents are strong, so this is a niche product and mainly a portfolio piece (data from many APIs + AI with citations + a polished editor UI).
