# BindSight Demo and Prize Reference

Use this file for rehearsals, submission copy, and sponsor judging. Do not let pitch polish delay the primary build contract in [Federato_BindSight_Build_Spec.md](./Federato_BindSight_Build_Spec.md).

## 1. Product identity

Name: **BindSight**

One-line pitch:

> BindSight turns static appetite guidelines into a live, evidence-backed underwriting queue—showing what to pursue, what to ask, and why.

Memorable distinction:

> We did not build a chatbot over insurance records. We made underwriting appetite executable.

The product is an end-to-end triage and review workbench, not an autonomous insurer. It does not price, quote, bind, message brokers, or issue a final legal decision.

## 2. 105-second demo

### 0–12 seconds: establish the problem

Show the unsorted queue and the written appetite guide.

> “An underwriter has more submissions than time, a static appetite document, and evidence scattered across related records. In a first-in-first-out inbox, the best opportunity can sit at the bottom.”

### 12–30 seconds: adaptive triage

Click Analyze and let the queue reorder.

> “BindSight discovers Federato's schema at runtime. Baseten turns the current appetite into validated rules, maps those rules to the unfamiliar schema, and plans the minimum evidence queries. Deterministic code evaluates and ranks every submission.”

Briefly expose the Stage A and selective Stage B trace. Do not wait on a blank loading screen.

### 30–48 seconds: trustworthy decision

Open the top result and expand its TIV or loss-history calculation.

> “This is not an unexplained model score. Every target match, failure, calculation, and caveat links to the exact Federato evidence and appetite rule.”

### 48–62 seconds: useful uncertainty

Open an incomplete submission.

> “We do not call missing data a failure. Here, the building year is unknown and could change the action tier. BindSight calculates the highest-value question to ask the broker next.”

Show the question and deterministic counterfactual outcomes.

### 62–77 seconds: changing requirements

Change California from target to acceptable-only in Appetite Studio.

> “Underwriting strategy changes constantly. Baseten recompiles the rule, the engine reevaluates only affected submissions, and the queue shows exactly what moved and why—without a code change or model retraining.”

### 77–88 seconds: OpenAI Senior Reviewer

Ask why the top submission ranks above another.

> “OpenAI's Responses API acts as a senior reviewer. It does not guess from raw context. It selects our narrow comparison and evidence tools, then cites the exact facts, calculations, and rules behind its answer.”

Open one citation and land on the corresponding evidence.

### 88–105 seconds: operational proof

Open the prepared Sentry trace or Replay.

> “Sentry traces the whole recommendation path. This trace exposed our real [finding]. Codex used the evidence to implement [change], improving [metric] from [before] to [after].”

Replace every bracketed value with authentic evidence. Never invent the observability story.

## 3. Three-minute expansion

If judges allow more time:

1. Spend the first 60 seconds on queue triage and the evidence ledger.
2. Spend 30 seconds on missing versus failure and next-best question.
3. Spend 30 seconds on Appetite Studio.
4. Spend 30 seconds on the OpenAI reviewer tool call.
5. Spend 30 seconds on Sentry and the Codex improvement loop.

Keep architecture explanation tied to visible product behavior. Avoid listing technologies without demonstrating why each one matters.

## 4. Federato pitch

Lead with:

- live schema discovery rather than a hardcoded data model;
- adaptive query planning across related records;
- executable, versioned appetite;
- prioritization of scarce underwriter attention;
- explicit target, pass, fail, missing, and conflict states;
- one next-best broker question;
- evidence and calculation provenance;
- immediate response to changing requirements.

The system resembles FDE work: ingest an unfamiliar customer schema, translate incomplete business rules into a working product, adapt to changed requirements, and preserve trust under messy data.

Closing line:

> BindSight helps an underwriter spend judgment where it matters. It finds the right evidence, distinguishes bad risk from incomplete data, ranks the queue, and shows its work.

## 5. Baseten pitch

Baseten is the high-throughput reasoning layer, not a decorative API call. Demonstrate:

- appetite prose to validated RuleIR;
- domain concepts mapped onto the runtime Federato schema;
- adaptive declarative query planning;
- validator-feedback repair;
- evidence-bound explanations across the queue;
- batching, bounded concurrency, caching, and retries;
- measured latency and schema-conformance metrics;
- stronger-model routing only for difficult compilation/planning cases;
- deterministic fallback when generation is invalid or unavailable.

Closing line:

> Baseten turns changing strategy and an unfamiliar schema into a ranked, explained queue at inference time, while deterministic code preserves underwriting auditability.

Do not mention training, H100s, custom checkpoints, or synthetic training data. They are not part of this project.

## 6. Sentry pitch

Use at least two products beyond error monitoring; the plan targets Tracing, Logs, Session Replay, and agent/model monitoring.

Show:

- one trace spanning browser, Next.js, Federato, Baseten, OpenAI, and deterministic evaluation;
- searchable structured decision logs;
- model/tool spans with provider, latency, tokens, validation, and estimated cost;
- a privacy-safe Replay of queue, packet, appetite edit, or reviewer interaction;
- one genuine observation that caused a measured change.

Closing line:

> In underwriting, an unexplained AI recommendation is itself an operational incident. Sentry shows how the recommendation was produced and where trust, cost, or performance broke down.

## 7. OpenAI API pitch

OpenAI has a distinct product responsibility:

- Responses API tool calling;
- a natural Senior Reviewer experience;
- cited cross-submission comparisons;
- deterministic counterfactuals invoked through tools;
- independent challenge of ambiguous or high-value cases;
- fast/review/deep model routing under a hard $50 cap;
- safe refusal when evidence is insufficient;
- no write access and no ability to override rule results.

The reviewer is intentionally not the queue engine. This separation makes the OpenAI usage more credible: it provides interactive expert reasoning where conversation helps, while the product retains a stable auditable core.

Closing line:

> OpenAI gives the underwriter a senior reviewer that can interrogate the entire decision trail without inventing the decision itself.

## 8. Codex development pitch

The prize asks how Codex helped the team go further. “It wrote code” is weak. Preserve evidence that Codex:

- decomposed the build into dependency-aware workstreams;
- translated sponsor documentation into typed contracts;
- generated hard boundary and messy-data fixtures;
- diagnosed a Federato query-shape failure;
- implemented or audited reviewer tools and cost controls;
- used a Sentry trace or Replay to identify a real issue;
- created a focused fix and regression test;
- challenged or rejected an unsafe architectural proposal;
- helped rehearse provider failures and the cached demo path.

Maintain `docs/CODEX_BUILD_LOG.md`. Each entry records:

    Problem
    Artifact supplied to Codex
    Proposed change
    Human decision
    Files changed
    Tests run
    Before result
    After result

Show three concrete examples during judging:

1. A rule-boundary defect.
2. A Federato query or schema defect.
3. A Baseten, OpenAI, or Sentry-observed failure with measurable improvement.

Closing line:

> OpenAI is the interactive senior reviewer, and Codex is the engineering teammate that made the entire system safer, observable, and shippable in one hackathon.

## 9. Judge-question preparation

**Why not just use one model?**

Baseten owns batch inference and schema/query work; OpenAI owns interactive review and independent challenge. Neither is trusted with the final predicate result.

**Why is this an agent?**

It discovers an unfamiliar schema, compiles a goal, plans queries, receives validator feedback, gathers evidence, chooses whether deeper work is needed, and exposes safe reviewer tools.

**Why no training?**

Federato provides 50+ synthetic records without expert outcomes or profitability labels. Runtime adaptation and rigorous evaluation provide more value within 24 hours than manufacturing questionable labels.

**What happens when a model hallucinates?**

Structured outputs are validated, query plans are checked before execution, explanations require valid IDs, reviewer answers must cite tool results, and deterministic templates remain available.

**Can this bind or decline a policy?**

No. It ranks human attention and produces non-binding review recommendations.

**What happens if an API fails during judging?**

The app has bounded retries, deterministic fallbacks, a sanitized cached Federato snapshot, a local Next.js standby, and a backup video.

## 10. Submission evidence folder

Before freeze, collect:

- public Vercel URL;
- repository URL and commit;
- 105-second and three-minute videos;
- live and cached demo screenshots;
- Sentry trace, log query, and Replay links;
- provider evaluation summary;
- redacted OpenAI tool-call trace;
- OpenAI spend summary;
- Codex build log;
- architecture diagram;
- limitations and assumptions.
