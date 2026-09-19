# BindSight Evaluation and Release Reference

Use this file when building tests, selecting model routes, verifying fallbacks, or deciding whether the demo is ready. The primary execution contract is [Federato_BindSight_Build_Spec.md](./Federato_BindSight_Build_Spec.md).

## 1. Evaluation principle

The models interpret, plan, explain, and choose tools. Deterministic code owns rule execution, calculations, rankings, and counterfactual outcomes. Evaluation should therefore test both the model boundary and the non-model oracle.

Freeze fixtures before prompt tuning. When a case fails, fix the smallest prompt, tool schema, validator, or code path, then rerun the unchanged suite. Do not “fix” a failure by weakening the expected result.

## 2. Stable commands

Create these commands early:

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

`npm run verify` runs every required non-destructive check. Provider tests must support a fixture or mocked mode so routine verification does not consume credits.

## 3. Rule-boundary suite

Cover at minimum:

- premium at $49,999, $50,000, $75,000, $100,000, $175,000, and $175,001;
- TIV immediately below, at, and above $50M, $100M, and $150M;
- building years 1989, 1990, 1991, 2010, and 2011;
- every acceptable, target, and unacceptable state;
- new business versus renewal;
- property versus another line;
- acceptable construction mixture at 49%, 50%, and 51%;
- five-year loss value immediately below, at, and above $100K;
- loss inside versus outside the five-year window.

An equality boundary not defined by the guide must return a visible configured assumption or manual review—not an invented interpretation.

## 4. Messy-data suite

Cover:

- absent building year or loss history;
- empty locations;
- buildings with conflicting years;
- contradictory TIV fields;
- duplicate claims;
- null premium;
- numeric values represented as strings;
- multiple states;
- unsupported construction labels;
- stale records;
- references that fail to expand.

Assert that missing, conflict, and fail remain distinct and that no unsupported evidence is created.

## 5. Query-planner suite

Cover:

- unknown resource or field;
- unsupported operator;
- a scalar dot path incorrectly traversing an array;
- missing reference expansion;
- invalid aggregation;
- unbounded pagination;
- excessive expansion depth;
- a zero-result query followed by safe diagnosis;
- 401 followed by one token refresh;
- timeout with bounded retry and cached fallback;
- plain-message validation errors.

Measure first-pass validity, validity after one repair, unnecessary query count, and total Stage A/Stage B calls. Planning revisions are capped at two.

## 6. Explanation suite

Reject any generated explanation when:

- an evidence, calculation, or rule ID does not exist;
- a numeric value differs from its source;
- missing is described as failure;
- a hard failure is concealed;
- target and acceptable are conflated;
- a portfolio assumption is called carrier policy;
- an external signal is described as Federato data;
- the prose recommends a different action tier than the packet.

After two invalid attempts, use a deterministic template.

## 7. OpenAI reviewer suite

The reviewer must call narrow, read-only tools. Fail the build when:

- it answers a factual submission question without retrieving the relevant packet;
- a tool receives invalid or over-broad arguments;
- a response cites an unknown ID;
- a response contradicts the deterministic action tier;
- a counterfactual is calculated in prose rather than by the deterministic tool;
- it attempts to write, bind, decline, or modify data;
- a tool cycle exceeds four calls;
- an estimated request exceeds the configured per-run or total budget;
- its unavailable-provider fallback fails.

Golden cases should include:

1. Explain one recommendation with citations.
2. Compare two submissions on specified dimensions.
3. Trace one TIV calculation to source evidence.
4. Simulate one missing building-year value.
5. Explain an appetite-version decision change.
6. Refuse or return insufficient evidence for an unsupported question.

## 8. Provider evaluation

Evaluate the relevant Baseten lanes and configured OpenAI reviewer models on fixed cases. Report by task and difficulty slice:

- JSON/schema validity;
- exact operators, numbers, units, and state lists;
- preservation of exceptions and ambiguity;
- first-pass and repaired query-plan validity;
- reviewer tool-selection accuracy;
- grounded citation rate;
- agreement with deterministic outputs;
- insufficient-evidence behavior;
- latency, token count, and estimated cost;
- catastrophic regressions.

Do not collapse results into one aggregate. Select the cheapest route that satisfies grounding and boundary requirements. A cheaper or faster model is unacceptable if it introduces unsupported facts.

## 9. OpenAI cost tests

Implement a local ledger that estimates before sending and reconciles from returned usage. Required behavior:

- reject or downgrade a request predicted to exceed `OPENAI_MAX_RUN_USD`;
- reject OpenAI calls after `OPENAI_MAX_EVENT_USD` is exhausted;
- fall back from deep to review to fast models;
- cap output tokens and tool cycles;
- avoid replaying paid calls during ordinary unit tests;
- log model, tokens, and cost to Sentry without prompt contents;
- preserve at least $15 of the $50 credit as an emergency reserve until final rehearsals.

Recommended allocation:

| Use | Cap |
|---|---:|
| Development and provider evals | $10 |
| Rehearsals and live runtime | $25 |
| Emergency reserve | $15 |

## 10. Browser acceptance

Automate only the flows that protect the demo:

1. Analyze the queue and open the first Decision Packet.
2. Show a request-information case and its next-best question.
3. Edit one appetite rule and observe a correct decision diff.
4. Ask the Senior Reviewer to compare two submissions and open a cited source.

Run once against the live path and once against the sanitized cached fallback.

## 11. Sentry acceptance

Required products beyond error monitoring:

- distributed tracing;
- structured logs;
- Session Replay;
- model/agent monitoring where supported, otherwise explicit spans.

Expected underwriting trace:

    underwriting.run
      ├─ federato.auth
      ├─ federato.schema
      ├─ baseten.appetite.compile
      ├─ baseten.schema.map
      ├─ federato.query.stage_a
      ├─ federato.query.stage_b
      ├─ rules.evaluate
      ├─ baseten.explain.batch
      └─ openai.review
         ├─ openai.response
         ├─ reviewer.tool_call
         └─ reviewer.citation_validate

Tags may contain IDs, hashes, counts, status, provider, model, latency, tokens, and cost. They may not contain credentials or complete submission payloads.

Before submission, preserve one authentic improvement loop:

| Evidence | Finding | Change | Verified result |
|---|---|---|---|
| Trace, log, or replay link | Actual observed defect | Commit or patch | Before/after metric |

Do not invent the finding. Plausible discoveries include sequential Stage B calls, duplicate evidence queries, N+1 reference lookups, repeated explanation calls, an overlooked missing-data caveat, excessive reviewer tool calls, or an omitted citation.

## 12. Metrics for the demo and README

- submissions analyzed;
- deterministic fixture accuracy;
- query-plan validity before and after one repair;
- missing-versus-fail accuracy;
- explanation citation validity;
- average and p95 analysis latency;
- Stage A and Stage B call counts;
- Baseten latency by lane;
- OpenAI reviewer tool-selection and citation rates;
- reviewer insufficient-evidence rate;
- OpenAI usage and estimated spend;
- provider fallback rate;
- Sentry before-and-after improvement;
- autonomous binds, quotes, or declines: zero.

## 13. Release checklist

The project is ready only when:

- every Federato submission produces a Decision Packet or explicit recoverable error;
- final predicates execute deterministically;
- evidence and calculation citations resolve;
- all five action tiers can be demonstrated where records permit;
- the OpenAI reviewer completes a real tool cycle;
- budget and tool-loop limits pass;
- Baseten and OpenAI failure paths preserve the deterministic workbench;
- Sentry traces, logs, Replay, and model/tool spans are visible;
- one real Sentry observation changed the implementation;
- three concrete Codex contributions are documented;
- the Vercel and local builds work;
- the cached demo path works;
- secret scanning passes;
- a backup video exists.
