# Codex Build Log

## 2026-09-19 — repository and contract foundation

**Problem:** The repository contained implementation documents but no application scaffold.

**Artifact supplied:** Primary build specification and supporting domain, evaluation, demo, and research references.

**Proposed change:** Establish one Next.js TypeScript application, freeze Zod-backed shared contracts, provide stable verification commands, and split disjoint workstreams across deterministic logic, Federato access, and UI.

**Human decision:** Requested implementation with parallel subagents and commits to `main` when ready.

**Files changed:** Package/configuration, `lib/contracts/**`, health route, secret audit, and build-state documents.

**Tests run:** `npm run typecheck`, `npm run lint`, and `npm audit --audit-level=moderate` passed. The initial Next.js pin was rejected after installation reported a security advisory; dependencies were upgraded to a clean audit before feature work began.

## 2026-09-19 — Federato source-document audit

**Problem:** Planning references were available, but exact API wire syntax and several appetite boundaries depended on the missing challenge package.

**Artifact supplied:** Federato's API, query-language, data-schema, appetite, glossary, and student-guideline PDFs.

**Proposed change:** Audit the primary PDFs visually and textually, revise the provisional Federato adapter to the documented Mongo-flavored query pipeline, and record uncovered boundaries instead of silently resolving them.

**Human decision:** Supplied the local challenge-document directory and explicitly prioritized a bare-bones UI over design polish.

**Before result:** Federato lowering intentionally stopped at a provider-neutral plan because the wire contract was unknown.

**After result:** The adapter now implements the exact Auth0 body and audience, action envelopes, direct/wrapped response normalization, documented schema shapes, Mongo operators, expansions, projections, `$sum`/`$count`, and offset pagination. Twenty-four focused tests and nine adversarial query evals pass.

## 2026-09-19 — deterministic cached vertical slice

**Problem:** Live credentials were unavailable, but the product needed a working end-to-end path without misrepresenting fixture data as live.

**Proposed change:** Build five Zod-validated synthetic Decision Packets through the deterministic evaluator, expose cached analysis and packet APIs, and render a deliberately minimal semantic queue/detail UI.

**Human decision:** Asked to hold off on UI design and keep it bare-bones for speed.

**Files changed:** `lib/appetite/**`, `lib/evidence/**`, `fixtures/demo/**`, `lib/cache/**`, analysis routes, minimal pages/components, and tests.

**Before result:** No executable application or decision output.

**After result:** All five action tiers render from auditable cached packets; unit, integration, rule, reviewer, cost, query, lint, typecheck, production-build, dependency-audit, and secret-audit checks pass.

## 2026-09-19 — credential-independent feature completion

**Problem:** Provider credentials were intentionally deferred, while the full product still needed to be implemented and testable.

**Proposed change:** Use injected transports and fixed fixtures to complete the Baseten compilation/planning/explanation lanes, OpenAI Responses reviewer loop, full eight-rule orchestration, appetite diffs, portfolio preview, and privacy-safe Sentry configuration.

**Human decision:** Directed development to continue and leave environment variables and live validation until the end.

**Before result:** Only a cached five-packet vertical slice and provider safety foundations existed.

**After result:** The complete credential-independent application builds with provider transports dormant behind environment checks; deterministic fallbacks preserve every UI/API workflow. Live probes, authentic Sentry evidence, and deployment remain the final external validation gate.
