# CLAUDE.md

## Project
Postmortem Drafter: a Next.js app + CLI that collects incident evidence (Slack, GitHub, Sentry, Vercel) for a time window, builds a timeline, and uses Claude to draft an editable postmortem. Plan: docs/MVP-PLAN.md. Research: docs/RESEARCH.md.

## Stack
Next.js (App Router), TypeScript strict, Node 22, zod, Anthropic SDK, vitest. pnpm or npm.

## Rules
- Every source is an adapter that returns `TimelineEvent[]`. Adapters never call Claude.
- The timeline is built by code, not by the model. Claude only writes prose on top of it.
- Every drafted claim must cite event ids. Drop or flag any sentence with no citation.
- Root cause and contributing factors are always labelled "Likely" / "Guess" until a human confirms.
- Redact emails, tokens and secrets from events before sending to Claude.
- Read-only API scopes only. Never post to Slack or change anything in GitHub/Sentry/Vercel in the MVP.
- Tests use recorded JSON fixtures (a sample incident). No network in tests.

## Commands
- `npm test`, `npm run dev`, `npm run cli -- draft --fixture examples/incident-1 --no-ai`, `npm run typecheck`

## Owner
Senior React/Next.js dev, India. Wants short, simple English and a clean portfolio-grade repo.
