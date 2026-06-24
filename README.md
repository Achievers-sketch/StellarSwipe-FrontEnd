# StellarSwipe-FrontEnd

[![CI](https://github.com/AgesEmpire/StellarSwipe-FrontEnd/actions/workflows/ci.yml/badge.svg)](https://github.com/AgesEmpire/StellarSwipe-FrontEnd/actions/workflows/ci.yml)

## Overview

Modern, responsive web app featuring:

- Infinite scrolling signal feed
- Gamified swipe mechanics (Framer Motion drag gestures)
- Freighter wallet integration
- Real-time dashboard & trade execution

Connects to Soroban contracts for on-chain actions.

## Tech Stack

- Next.js 15+ (App Router)
- TypeScript
- Tailwind CSS 4 + shadcn/ui
- Framer Motion (swipes/animations)
- TanStack Query (data fetching)
- @stellar/freighter-api + stellar-sdk
- Zustand (state)
- Vercel deployment

## Quick Start

1. Clone & install:
   ```bash
   git clone https://github.com/EndeMathew/StellarSwipe-frontend.git
   cd StellarSwipe-frontend
   npm install

Set environment variables (.env.local):
    NEXT_PUBLIC_SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
    NEXT_PUBLIC_HORIZON_URL=https://horizon-testnet.stellar.org

Run dev server:
  npm run dev

## Contributing

### TypeScript strict mode

`tsconfig.json` enforces `strict: true`. All new code must pass `npx tsc --noEmit` without errors. Avoid blanket `@ts-ignore` or `any` casts; if an exception is truly necessary, scope it narrowly and add a comment explaining why.

### Pre-commit hooks (Husky + lint-staged)

Husky runs `lint-staged` before every commit. Staged `.ts`/`.tsx` files are auto-fixed by ESLint; if any unfixable lint errors remain the commit is blocked with a clear error message.

Hooks install automatically via the `prepare` npm script when you run `npm install`.

To bypass in a genuine emergency (e.g., a partial WIP commit that must land immediately):
```bash
git commit --no-verify -m "your message"
```
Do **not** use `--no-verify` as a routine workaround — fix the lint errors instead.

### Dependency updates (Renovate)

Renovate is configured via `renovate.json`. It opens automated PRs grouped by:
- **Patch/minor dev deps** — grouped into one PR
- **Patch/minor prod deps** — grouped into one PR
- **Major bumps** — individual PRs labeled `major`
- **Security alerts** — labeled `security`, opened immediately

All Renovate PRs run through the CI checks before being mergeable.

## Worker Tracing

Asynchronous worker execution paths are instrumented via `src/tracing/worker-tracing.service.ts`.

### What is traced

| Worker | Span name |
|---|---|
| `/api/signals` route handler | `worker:signals:fetch` |
| Freighter wallet connect | `worker:wallet:connect` |
| Signal price polling interval | `worker:signalPrice:poll` |

### API

```ts
// Wrap any async function — returns its result, re-throws on error
const data = await traceWorker("worker:my:task", async () => fetchData(), { page: 1 });

// Manual span lifecycle
const finish = startSpan("worker:my:task", { key: "value" });
try {
  await doWork();
  finish("ok");
} catch (err) {
  finish("error", err as Error);
}
```

Each span captures: `traceId`, `spanId`, `name`, `startedAt`, `endedAt`, `durationMs`, `status`, `attributes`, and `error` (if any).

In development (`NODE_ENV=development`) spans are logged to `console.debug`. Replace the `emit` function in the service to forward spans to any observability backend (Datadog, OpenTelemetry, etc.).

### Security

- Attributes are caller-controlled — the service never reads or mutates them.
- No secrets are injected or logged by the tracing layer itself.
- Existing authentication and authorization semantics are fully preserved.

### Running tests

```bash
npm test
```

