# BindSight

BindSight is an evidence-backed underwriting triage workbench built for the Hack the North 2026 Federato challenge. It turns the supplied insurance portfolio into a ranked work queue, explains every appetite decision, and lets an underwriter ask follow-up questions without hiding the underlying evidence.

## What the user gets

The home page first segments the portfolio into new-property candidates, renewals, and lines without a configured profile. Only new-property candidates are ranked against the supplied commercial-property appetite. Opening a record shows:

- its assessment or routing treatment;
- all eight appetite checks and their target, pass, fail, missing, or conflict status;
- the exact evidence used by every check;
- evidence-completeness and target-alignment scores;
- a next-best question when critical information is missing; and
- an AI reviewer scoped to that decision packet.

The decision queue can be searched by account, submission ID, line, or state and filtered by treatment without changing the server-ranked source data. Its responsive layout turns each table row into a labeled record on narrow screens while preserving semantic table markup for assistive technology.

Deterministic rules make the underwriting recommendation. The language model explains and reviews the result; it cannot silently override the rules or cite evidence that is not in the packet.

## Data flow

The Next.js server authenticates to Federato with OAuth client credentials and queries `Policy` records with their insured, HQ, originating submission, claims, exposures, locations, and buildings expanded. It normalizes that graph into the fields required by the supplied 2025 commercial-property appetite guide:

1. submission type;
2. line of business;
3. primary risk state (the insured HQ, with largest-TIV location only as a fallback);
4. total insured value;
5. total premium;
6. oldest building year;
7. TIV-weighted supported construction percentage; and
8. five-year incurred loss value.

The dataset contains 158 `Submission` records, but only the 113 bound submissions have linked `Policy` records containing all fields required by the appetite guide. The remaining submission statuses do not expose premium or insured building schedules through the published relationship graph. BindSight therefore analyzes the complete, evidence-backed policy/submission cohort rather than inventing missing values for unlinked records. This is a challenge-data limitation, not a claim that those 113 records are a live operational inbox.

The supplied appetite is intentionally narrow: new property business only, selected states, $50K–$175K premium, TIV up to $150M, strict building age/construction rules, and losses below $100K. Renewals are routed to a separate workflow and do not run through the remaining new-business gates. New business in other lines is marked “no matching profile,” not declined. All cohorts remain visible for auditability.

Rule IDs in a decision packet link to the exact versioned source wording on `/appetite`. Decision atoms link to their evidence and calculation records, raw values are expandable, and every report links to its complete JSON representation. Federato does not expose a public browser URL for individual challenge records, so BindSight links to the locally retrieved decision packet rather than fabricating an upstream deep link.

Live reads use a 10-second upstream timeout, bounded pagination, relationship deduplication, per-record validation, request deduplication, and a 30-second in-process cache. If a refresh fails, BindSight serves the last successful live snapshot when possible. Without any live snapshot it serves a clearly labeled bundled demo fallback.

## Local setup

Use Node.js 20 or newer.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Next.js prints an alternate URL if that port is occupied.

Populate `.env.local` from `.env.example`:

- **Federato, for live evidence:** `FEDERATO_CLIENT_ID`, `FEDERATO_CLIENT_SECRET`, `FEDERATO_AUTH_URL`, `FEDERATO_HANDLER_URL`.
- **OpenAI, for reviewer answers:** `OPENAI_API_KEY`; model and budget defaults are already listed.
- **Sentry, for telemetry:** `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`.
- **Baseten, optional:** only required when `AI_PROVIDER=baseten`.

Federato and AI credentials are server-only. Never put them in `NEXT_PUBLIC_*` variables and never commit `.env.local`.

Check environment readiness without calling paid or external providers:

```bash
curl http://localhost:3000/api/providers/health
```

## Main endpoints

- `GET /api/health` — service liveness.
- `GET /api/providers/health` — configuration readiness.
- `GET or POST /api/analyze` — versioned decision-queue response with cohort/tier summaries, profile metadata, and live or labeled fallback packets.
- `GET /api/submissions/:submissionId/decision` — one current decision packet.
- `POST /api/review` — evidence-grounded reviewer answer, optionally scoped by `submissionId`.
- `POST /api/schema/sync` — live Federato schema discovery.

The browser never receives provider credentials and never calls Federato or OpenAI directly.

The queue contract currently reports `schemaVersion: "1.0"`. Frontend code should use `summary.cohorts` for section counts, `summary.tiers` for outcome counts, `profiles` for source attribution, and each packet’s `screening` and `analysis.mode` fields rather than recreating routing logic in the browser.

```json
{
  "schemaVersion": "1.0",
  "source": "live",
  "summary": {
    "total": 113,
    "cohorts": { "evaluated": 20, "renewal": 48, "unsupported_line": 45 },
    "tiers": { "standard_review": 1, "outside_appetite": 19, "screened_out": 48, "not_evaluated": 45 },
    "assessmentMode": "retrospective"
  },
  "profiles": [],
  "packets": []
}
```

## Validation

```bash
npm run verify
npm run build
```

`verify` runs TypeScript, ESLint, unit and integration tests, rule/query/provider/reviewer evaluations, cost checks, and a repository secret audit. Fixture-backed provider evaluations do not spend API credits; live smoke tests are separate and deliberate.

## Project map

- `app/` — pages and server route handlers.
- `components/` — decision queue, packet, and reviewer UI.
- `lib/analysis/` — Federato normalization and decision orchestration.
- `lib/appetite/` — versioned deterministic rules, evaluation, and ranking.
- `lib/federato/` — authentication, schema/query handling, and HTTP transport.
- `lib/openai/` — reviewer provider, citation validation, and budget controls.
- `lib/contracts/` — runtime-validated data contracts.
- `tests/` and `evals/` — correctness, safety, quality, and cost checks.
- `docs/planning/` — detailed build, domain, evaluation, demo, and architecture references.

For deeper implementation context, start with the [build specification](docs/planning/Federato_BindSight_Build_Spec.md).
