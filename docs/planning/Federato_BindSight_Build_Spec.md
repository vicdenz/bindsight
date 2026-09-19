# BindSight: Primary Build Specification

**Hackathon:** Hack the North 2026

**Status:** implementation-ready

**Time remaining:** approximately 24 hours

**Primary target:** Federato

**Secondary targets:** Baseten, Sentry, and OpenAI

**Frontend and server:** React with Next.js App Router and TypeScript

**Deployment:** Vercel, with local and cached-demo fallbacks

**Model strategy:** hosted Baseten and OpenAI inference only; no training or fine-tuning

This is the source of truth for the implementation orchestrator. Read it completely before editing code. Load supporting references only when the active task requires them:

- [Domain Reference](./Federato_BindSight_Domain_Reference.md): underwriting concepts, appetite rules, Federato data, evidence semantics, and questions for the sponsor.
- [Evaluation Reference](./Federato_BindSight_Evals.md): fixtures, provider tests, Sentry acceptance, metrics, and release checklist.
- [Demo and Prize Reference](./Federato_BindSight_Demo_and_Prizes.md): demo scripts, sponsor-specific pitches, judge questions, and submission evidence.
- [Research and Architecture Rationale](./Federato_BindSight_Research.md): provider choices, security, serving rationale, and sources.

---

## 1. Mission and product boundary

Build **BindSight**, a ranked underwriting triage workbench that:

1. discovers Federato's schema at runtime;
2. converts appetite prose into validated structured rules;
3. plans and executes the evidence queries needed for each submission;
4. deterministically evaluates and ranks every submission;
5. distinguishes target, pass, fail, missing information, and conflicting evidence;
6. displays an auditable evidence and calculation chain;
7. calculates the next most valuable question for incomplete submissions;
8. uses Baseten for batch inference and OpenAI for interactive senior review;
9. uses Sentry to find and prove at least one genuine improvement;
10. preserves concrete evidence of Codex-led planning, implementation, testing, and debugging.

The one-line pitch is:

> BindSight turns static appetite guidelines into a live, evidence-backed underwriting queue—showing what to pursue, what to ask, and why.

The core interface is a workbench, not a chatbot. The OpenAI Senior Reviewer is a focused interface over completed Decision Packets.

BindSight supports triage. It must not price risk, issue a quote, bind coverage, contact a broker, mutate Federato, or autonomously make a final insurance decision.

## 2. Fixed architectural decisions

- Build one React application with Next.js App Router and TypeScript.
- Deploy it to Vercel and keep `npm run dev` as the judging standby.
- Keep Federato, Baseten, OpenAI, and Sentry credentials in server-only environment variables.
- Use no separate Python service, database, vector store, or message queue.
- Use a sanitized Federato snapshot as the external-service fallback.
- Use Baseten for appetite compilation, schema mapping, query planning, plan repair, and batch explanations.
- Use OpenAI's Responses API for the Senior Reviewer, narrow tool calls, comparisons, deterministic counterfactuals, and selective adversarial review.
- Use deterministic TypeScript for validation, calculations, rule predicates, action precedence, rankings, portfolio simulation, and reviewer citation checks.
- Perform no model training, fine-tuning, synthetic training-data generation, or custom model deployment.
- Treat Federato's 50+ records as runtime and evaluation data only.
- Treat missing evidence differently from verified failure.
- Validate all model output before use. Provide deterministic fallback behavior.
- Enforce the $50 OpenAI credit limit in application code and telemetry.

## 3. User experience

### 3.1 Decision Queue

The landing screen is a ranked table containing:

- rank and account;
- action tier;
- appetite status and evidence completeness;
- premium, TIV, and primary state;
- leading positive and negative factors;
- whether a missing fact could change the result;
- analysis status and latency.

Order tiers as:

1. Review now.
2. Standard review.
3. Request information.
4. Manual review.
5. Likely decline.

Within a tier, sort by target alignment, evidence completeness, portfolio contribution, premium opportunity, and submission age. Never rely on color alone.

### 3.2 Decision Packet

Each submission opens into:

- recommendation and transparent score components;
- concise explanation and proposed next action;
- every appetite rule marked target, pass, fail, missing, conflict, or not applicable;
- evidence ledger with resource, record, field, normalized value, and stable ID;
- calculations with input IDs, operation, units, and result;
- data-quality problems and explicit assumptions;
- one prioritized next-best broker question;
- portfolio concentration preview when the schema supports it.

Generated prose is never authoritative. Every factual sentence must resolve to an evidence, calculation, or rule ID.

### 3.3 Appetite Studio

Show original appetite prose beside compiled rules, schema mappings, unresolved ambiguities, version, and affected submissions. The demo edit is:

> Move California from target to acceptable-only.

Recompile, validate, reevaluate only affected submissions, and show the exact rule and ranking differences. No code change or model-weight update is allowed.

### 3.4 OpenAI Senior Reviewer

The reviewer accepts natural-language questions but can inspect the system only through narrow, read-only tools:

    get_decision_packet(submission_id)
    inspect_evidence(evidence_ids)
    inspect_rule(rule_ids)
    compare_submissions(submission_ids, dimensions)
    simulate_counterfactual(submission_id, field, proposed_value)
    diff_appetite_versions(old_version, new_version)
    draft_broker_question(submission_id, missing_field)

The tool layer validates every argument with Zod. The reviewer may explain or challenge a recommendation but cannot recalculate outcomes in prose or override deterministic results. Cap the loop at four tool calls. Answers must cite valid IDs or return “insufficient evidence.”

## 4. Runtime architecture

    Browser
      → Next.js application on Vercel
        → server-only route handlers
          → Federato authentication and schema discovery
          → Baseten appetite compilation
          → validated RuleIR
          → Baseten schema mapping and QueryPlan
          → local query validation and lowering
          → Federato Stage A queue scan
          → selective Stage B evidence queries
          → deterministic evidence, calculations, and decisions
          → Baseten batch explanations
          → Decision Queue and Decision Packets
          → OpenAI reviewer tool cycle on demand
        → Sentry traces, logs, Replay, and model/tool spans

Use streamed HTTP responses or Server-Sent Events for visible analysis and reviewer progress. If Vercel request duration becomes restrictive, split analysis into bounded batches rather than adding infrastructure.

Server routes:

    GET  /api/health
    GET  /api/providers/health
    POST /api/schema/sync
    POST /api/appetite/compile
    POST /api/analyze
    GET  /api/runs/[runId]
    GET  /api/submissions/[submissionId]/decision
    POST /api/portfolio/simulate
    POST /api/appetite/diff
    POST /api/review

The browser never calls Federato, Baseten, or OpenAI directly.

## 5. Provider boundaries

### 5.1 Baseten

Use Baseten's OpenAI-compatible API and configure model names through environment variables. Probe structured output, latency, context, and schema-conformance at startup.

Baseten lanes:

1. **Appetite compiler:** appetite prose and glossary to versioned RuleIR plus unresolved ambiguities.
2. **Schema mapper/query planner:** compact schema graph and evidence goals to declarative QueryPlans.
3. **Explanation lane:** final deterministic packet to two or three cited sentences.

Allow one structured-output repair using validator errors. Cap query planning at two revisions. Batch independent explanations. If explanation validation fails twice, use a deterministic template.

### 5.2 OpenAI

Use the Responses API. Recommended configurable routing:

    OPENAI_FAST_MODEL=gpt-5.6-luna
    OPENAI_REVIEW_MODEL=gpt-5.6-terra
    OPENAI_DEEP_MODEL=gpt-6-astra
    OPENAI_MAX_RUN_USD=2.00
    OPENAI_MAX_EVENT_USD=50.00

Probe actual access before relying on a slug. Use the fast model for simple reviewer questions, the review model for comparisons and ambiguous cases, and the deep model only for one difficult showcase case when budget permits.

Allocate $10 to development/evals, $25 to rehearsal/live use, and $15 as reserve. Estimate cost before sending, reconcile from returned usage, cap outputs, compact evidence, cache stable instructions, and downgrade or refuse requests that exceed limits.

### 5.3 Deterministic engine

For each rule:

1. obtain mapped evidence;
2. perform required calculations;
3. detect absent and conflicting values;
4. execute acceptable, target, and unacceptable predicates;
5. produce a typed DecisionAtom.

A verified hard failure produces likely decline. A decision-critical conflict produces manual review unless another hard failure already determines likely decline. Missing hard-gate evidence produces request information. Passing all gates produces review now or standard review based on target alignment and completeness.

## 6. Required contracts

Define and freeze these Zod-backed types before connecting the UI:

- `AppetiteRule`: ID, version, concept, scope, acceptable/target/unacceptable predicates, missing behavior, ambiguity, and source text.
- `QueryPlan`: resource, selected fields, filters, expansions, pagination, aggregation, purpose, and expected evidence.
- `EvidenceItem`: ID, resource, record, field path, raw/normalized value, provenance, and timestamp.
- `Calculation`: ID, operation, input IDs, units, and result.
- `DecisionAtom`: rule ID, evidence/calculation IDs, target/pass/fail/missing/conflict status, and reason.
- `DecisionPacket`: submission summary, atoms, tier, score components, explanation, next-best question, quality issues, and portfolio delta.
- `ReviewerResponse`: answer, tool calls, cited IDs, insufficient-evidence flag, provider/model, tokens, cost, and validation result.

The UI consumes `DecisionPacket`; it never parses model prose to discover the decision.

## 7. Repository shape

    bindsight/
    ├─ app/
    │  ├─ page.tsx
    │  ├─ submissions/[id]/page.tsx
    │  ├─ appetite/page.tsx
    │  └─ api/{health,providers,schema,appetite,analyze,runs,submissions,portfolio,review}/
    ├─ components/
    │  ├─ decision-queue.tsx
    │  ├─ decision-packet.tsx
    │  ├─ evidence-ledger.tsx
    │  ├─ next-best-question.tsx
    │  ├─ appetite-diff.tsx
    │  └─ reviewer-panel.tsx
    ├─ lib/
    │  ├─ federato/{auth,client,schema,schema-graph,query-validator,query-lowerer}.ts
    │  ├─ appetite/{types,compiler,validator,evaluator,ranking,diff}.ts
    │  ├─ evidence/{ledger,calculations,data-quality}.ts
    │  ├─ baseten/{client,appetite-agent,query-agent,explanation-agent}.ts
    │  ├─ openai/{client,reviewer,tools,budget}.ts
    │  ├─ portfolio/simulate.ts
    │  ├─ cache/demo-snapshot.ts
    │  └─ observability/{sentry,redaction}.ts
    ├─ evals/
    ├─ fixtures/
    ├─ docs/
    │  ├─ STATUS.md
    │  ├─ DECISIONS.md
    │  ├─ ASSUMPTIONS.md
    │  ├─ CODEX_BUILD_LOG.md
    │  ├─ DEMO_EVIDENCE.md
    │  ├─ OPENAI_USAGE.md
    │  └─ PROVIDER_BOUNDARIES.md
    └─ README.md

## 8. Orchestrator protocol

The orchestrator owns shared contracts, integration, package configuration, and release decisions. Delegate only bounded tasks with disjoint writable paths.

Workstreams:

| ID | Owns |
|---|---|
| ORCH | shared contracts, integration, status, release |
| FED | Federato auth, schema, client, query validation, fixtures |
| DEC | appetite evaluator, evidence, ranking, portfolio logic |
| BTEN | Baseten client, compiler, planner, explanation lanes |
| OAI | OpenAI reviewer, tools, budget guard, reviewer evals |
| UI | Next.js pages and visual components |
| OBS | Sentry, redaction, trace and Replay verification |
| QA | read-only review, integration/e2e tests, demo evidence |

Every task packet must include objective, inputs, allowed and forbidden paths, deliverables, acceptance commands, fallback, and required return summary. Do not permit concurrent edits to shared files. The orchestrator integrates one handoff at a time and updates `docs/STATUS.md` with actual command results.

Stable commands:

    npm run typecheck
    npm run lint
    npm run test:unit
    npm run test:integration
    npm run eval:rules
    npm run eval:queries
    npm run eval:providers
    npm run eval:reviewer
    npm run audit:cost
    npm run test:e2e
    npm run audit:secrets
    npm run verify

## 9. Dependency graph

| Task | Owner | Depends on | Acceptance |
|---|---|---|---|
| T00 repository and contracts | ORCH | none | typecheck passes |
| T10 Federato probe | FED | T00 | schema snapshot and five live rows |
| T11 Federato client | FED | T10 | auth, refresh, pagination, and query tests pass |
| T20 deterministic oracle | DEC | T00 | appetite boundary suite passes |
| T21 evidence pipeline | DEC | T11, T20 | every record yields a packet or recoverable error |
| T30 Baseten probe | BTEN | T00 | valid structured output and latency recorded |
| T31 Baseten lanes | BTEN | T20, T30 | lane fixture evaluation passes |
| T32 OpenAI probe | OAI | T00 | one valid Responses API tool cycle |
| T33 reviewer and budget | OAI | T21, T32 | citation, refusal, loop, and cap tests pass |
| T40 provider integration | ORCH | T11, T20, T31, T33 | queue and reviewer run end to end |
| T50 static workbench | UI | T00 | all action states render from fixtures |
| T51 live workbench | UI | T21, T50 | queue, packet, appetite, and reviewer work |
| T60 observability | OBS | T00, T40 | safe trace, logs, Replay, and model spans inspected |
| T61 improvement loop | OBS, QA, ORCH | T40, T51, T60 | real before/after result and regression test |
| T70 release | ORCH, QA | all P0 predecessors | `npm run verify` and both demo paths pass |

## 10. Twenty-four-hour execution

### G0 — Hour 0–1: access and contracts

- Create the Next.js repository and shared-state documents.
- Install Sentry immediately with redaction defaults.
- Call Federato schema discovery and a five-row query; save sanitized fixtures.
- Produce one valid Baseten structured output.
- Produce one valid OpenAI Responses tool call.
- Add the first OpenAI budget ledger.

Exit: shared types compile, providers respond, and telemetry contains no secret.

### G1 — Hour 1–4: deterministic foundation

- FED implements auth, refresh, schema graph, pagination, and verified query shapes.
- DEC implements the appetite oracle, evidence types, hard gates, missing/conflict states, and action precedence.
- BTEN implements typed client and appetite compilation with repair.
- OAI defines reviewer tools, citation contract, and spend enforcement.
- UI renders queue and packets from fixtures.

Exit: query and rule tests pass; all five action tiers render.

### G2 — Hour 4–8: full queue

- Connect mappings, plans, evidence gathering, and deterministic evaluation.
- Implement Stage A scan and selective Stage B retrieval.
- Complete Baseten planning and batch explanation lanes.
- Analyze every Federato submission and save a sanitized fallback.
- Implement the first three OpenAI tools and refusal behavior.
- Trace Federato and provider calls.

Exit: every record yields a packet or recoverable error; provider fixtures pass.

### G3 — Hour 8–11: live React workbench

- Connect queue, packet, evidence ledger, data-quality panel, and next-best question.
- Implement appetite versioning and affected-decision diffs.
- Deploy the first Vercel build.
- Verify local and cached paths and audit the browser bundle for secrets.

Exit: four representative tiers work; one appetite edit moves a record correctly; public and local builds run.

### G4 — Hour 11–15: differentiators

- Finish Appetite Studio.
- Add OpenAI comparison, counterfactual, appetite-diff, and broker-question tools.
- Add model routing, four-tool limit, per-run cap, and total cap.
- Add cited reviewer UI.
- Enable privacy-safe Replay and complete model/tool spans.

Exit: real OpenAI comparison and counterfactual work; citations open; spend appears safely in Sentry.

### G5 — Hour 15–18: evaluate and harden

- Run rule, query, explanation, reviewer, budget, provider, and browser suites.
- Test timeout, invalid output, tool-loop, and cached fallbacks.
- Compare OpenAI fast and review routes on fixed cases.
- Select the cheapest route meeting grounding and boundary requirements.
- Finish `OPENAI_USAGE.md` and `PROVIDER_BOUNDARIES.md`.

Exit: P0 tests pass and every provider has a graceful fallback.

### G6 — Hour 18–21: Sentry and Codex proof

- Inspect authentic traces, logs, model failures, and Replay.
- Select one real latency, correctness, cost, or UX problem.
- Give Codex the artifact and request the smallest correction plus regression test.
- Re-run affected and global tests.
- Record before/after evidence in the Codex build log and demo evidence.

Exit: one Sentry-derived improvement and three evidenced Codex contributions.

### G7 — Hour 21–24: freeze

- Stop feature work.
- Run `npm run verify`.
- Test live, local, and cached demonstrations.
- Audit secrets and telemetry.
- Save Sentry links, screenshots, and provider metrics.
- Complete README and submission materials.
- Record a backup video and rehearse 105-second and three-minute demos.

Only after every item passes may the deep OpenAI model be enabled for one showcase case.

## 11. Sentry requirements

Use at least Tracing, structured Logs, and Session Replay beyond error monitoring. Add agent/model spans through supported instrumentation or manual spans.

Trace the browser-to-decision path, including Federato auth/schema/query, every Baseten lane, deterministic evaluation, OpenAI response, reviewer tool calls, and citation validation. Log IDs, hashes, counts, status, provider, model, latency, tokens, repair count, and estimated cost—not raw credentials or complete payloads.

The Sentry prize requires a genuine improvement. Preserve the trace or Replay, actual finding, patch, regression test, and before/after metric. See the [Evaluation Reference](./Federato_BindSight_Evals.md) for the trace shape and acceptance criteria.

## 12. Codex evidence requirements

Codex is the development teammate and orchestrator, not just code completion. Maintain `docs/CODEX_BUILD_LOG.md` with:

- the problem and input artifact;
- Codex's proposed change;
- human approval, correction, or rejection;
- files changed and commands run;
- before/after test or Sentry result.

Preserve three strong examples: one appetite-boundary issue, one Federato schema/query issue, and one provider or Sentry-observed issue. The OpenAI prize demo must show both a real API tool cycle and a concrete way Codex improved the product.

## 13. P0, P1, and non-goals

### P0

- Federato auth, schema discovery, pagination, and dynamic query.
- Validated appetite rules and deterministic evaluation.
- Target/pass/fail/missing/conflict distinction.
- Ranked queue and evidence-backed Decision Packet.
- Baseten compiler, planner, and explanations.
- OpenAI reviewer with at least three tools, citation checks, and budget enforcement.
- Sentry tracing, logs, Replay, and a real improvement.
- Codex build evidence.
- Vercel, local, and cached demo paths.

### P1

- Adaptive Stage A/Stage B queries.
- Next-best question.
- Appetite Studio and live decision diff.
- Reviewer comparison and counterfactual tools.
- OpenAI fast/review routing.
- Portfolio concentration preview.
- Polished accessibility and loading states.

### Non-goals

- training or fine-tuning;
- external public datasets unrelated to the live demo;
- actuarial pricing, quote issuance, or binding;
- autonomous decline or broker messaging;
- document OCR;
- vector database or complex authentication;
- full catastrophe modeling;
- generic chatbot homepage.

## 14. Definition of done

Do not submit until:

- every supplied submission is processed or has an explicit recoverable error;
- appetite and queries are derived from runtime inputs rather than hardcoded per record;
- final outcomes and counterfactuals execute deterministically;
- every displayed fact and calculation has a valid citation;
- missing and failure are demonstrably different;
- one appetite edit creates a correct decision diff;
- Baseten powers all three required lanes;
- OpenAI completes a real grounded tool cycle and safely refuses unsupported evidence;
- cost and tool-loop guards pass;
- provider failures preserve a usable deterministic interface;
- Sentry shows Tracing, Logs, Replay, and model/tool spans;
- one authentic Sentry observation changed the build;
- three Codex contributions have artifacts and measured results;
- no model is trained or fine-tuned;
- no secret appears in code, Git history, client bundles, prompts, telemetry, or screenshots;
- Vercel, local, and cached paths work;
- the demo has been rehearsed and recorded.

## 15. Orchestrator kickoff

Copy this into the first implementation-agent task:

    Read Federato_BindSight_Build_Spec.md completely. It is the primary
    execution contract. Load a linked reference only when its topic is
    required by the active task.

    Build the working product, not another plan. Begin at G0. Own shared
    contracts and integration centrally; delegate only bounded tasks with
    disjoint writable paths and executable acceptance criteria. Update
    docs/STATUS.md with actual command results at every gate.

    Prioritize Federato, then Baseten, Sentry, and OpenAI. Build the
    deterministic evidence path before expanding model behavior. Baseten
    owns batch compilation, mapping, planning, and explanations. OpenAI
    owns the read-only Senior Reviewer. Neither model may determine or
    override an underwriting predicate.

    Instrument Sentry from the beginning and preserve one authentic
    trace-to-fix or replay-to-fix loop. Maintain CODEX_BUILD_LOG.md with
    prompts, decisions, patches, tests, and measured outcomes. Enforce the
    $50 OpenAI budget. Never expose credentials or perform an autonomous
    insurance action. At G7, stop features and deliver live, local, cached,
    and recorded demonstrations.
