# Build Status

## G0 — access and contracts

- [x] Repository scaffolded with Next.js, TypeScript, Zod, Vitest, and stable commands.
- [x] Shared decision, query, evidence, calculation, and reviewer contracts frozen.
- [x] `npm run typecheck` passed on 2026-09-19.
- [x] `npm run lint` passed on 2026-09-19.
- [x] `npm audit --audit-level=moderate` reported zero vulnerabilities on 2026-09-19.
- [ ] Provider credentials available in the runtime environment.
- [x] Six Federato source documents supplied locally and audited on 2026-09-19.
- [x] Deterministic appetite oracle and evidence ledger implemented; full unit suite passes 58 tests.
- [x] Federato adapter aligned to primary docs; 24 focused tests and 9 query evals passed.
- [x] OpenAI reviewer tool/citation/cost guards implemented; reviewer and cost evals passed.
- [x] Cached analysis API and five-tier demo implemented; 3 integration tests passed.
- [x] Bare-bones queue and packet UI production build passed.
- [x] All eight appetite rules, next-best questions, appetite version diff, run state, and portfolio preview implemented.
- [x] Baseten compiler/planner/explanation lanes implemented with repairs, grounding validation, batching, cache, and fallback.
- [x] OpenAI Responses reviewer transport and read-only runtime implemented behind budget and citation guards.
- [x] Sentry tracing, logs, Replay, error handling, and telemetry redaction configured but disabled without a DSN.
- [x] Appetite Studio and Senior Reviewer exposed in the bare-bones UI.
- [ ] Live provider probes completed.
- [ ] Authentic Sentry trace-to-fix evidence captured after credentials are supplied.
- [ ] Vercel deployment and live/cached browser rehearsal completed.

Command results are recorded as implementation progresses.
