# BindSight Research and Architecture Rationale

This file preserves supporting research and decisions that should not occupy the primary orchestrator context. The build contract is [Federato_BindSight_Build_Spec.md](./Federato_BindSight_Build_Spec.md).

## 1. Why this product shape

Federato's challenge asks for an agent that ingests submissions, enriches them with real-world risk information, and produces explainable insights relative to appetite. The highest-value workflow is not a final yes/no response and not an open-ended chat window. Underwriters work queues: they need to know what to inspect first, what evidence supports it, what is missing, and what action could change the result.

The ranked workbench therefore provides a stronger demonstration than a chatbot:

- every record receives a comparable action tier;
- the interface makes missing and conflicting information visible;
- evidence and calculations can be audited;
- an appetite change can reevaluate the queue;
- conversation becomes a targeted review layer over structured decisions.

This also aligns the sponsor tracks without forcing unrelated features into the product.

## 2. Provider responsibilities

### Baseten

Baseten performs repeated, structured inference across the queue:

1. Compile appetite prose into validated rule objects.
2. Map underwriting concepts to a runtime-discovered schema.
3. Plan declarative Federato queries.
4. Repair one invalid plan from validator feedback.
5. Generate short evidence-bound explanations in batches.

This showcases inference engineering: model selection, structured outputs, validation, caching, batching, concurrency control, retries, routing, latency measurement, and fallback behavior.

### OpenAI

OpenAI powers the interactive Senior Reviewer through the Responses API:

1. Interpret the underwriter's follow-up question.
2. Select a narrow read-only tool.
3. Inspect existing Decision Packets, rules, and evidence.
4. Invoke deterministic comparisons or counterfactuals.
5. Return a concise answer with resolvable citations.
6. Challenge ambiguous or high-value cases independently of the Baseten pipeline.

Suggested tools:

    get_decision_packet(submission_id)
    inspect_evidence(evidence_ids)
    inspect_rule(rule_ids)
    compare_submissions(submission_ids, dimensions)
    simulate_counterfactual(submission_id, field, proposed_value)
    diff_appetite_versions(old_version, new_version)
    draft_broker_question(submission_id, missing_field)

The reviewer cannot execute arbitrary code, write to Federato, contact a broker, bind coverage, or override an action tier.

### Deterministic application code

TypeScript owns:

- schema and query validation;
- evidence normalization;
- calculations;
- appetite predicates;
- action precedence and ranking;
- next-best-question impact calculation;
- portfolio simulations;
- citation verification;
- provider budget and loop limits.

This makes the system inspectable and prevents a persuasive paragraph from becoming the decision oracle.

## 3. Why no training

The supplied 50+ submissions do not include reliable expert decisions, loss outcomes, profitability labels, or gold rationales. They are too small and too synthetic to justify fine-tuning. Creating a synthetic dataset would add licensing, provenance, leakage, validation, training, deployment, and evaluation risk without guaranteeing useful domain behavior.

Runtime compilation is also more faithful to underwriting work. Carrier appetite changes frequently. A rule edit should take effect immediately rather than require a new model checkpoint.

The project therefore uses only hosted pretrained inference. The supplied records serve as live workload, integration corpus, regression fixtures, and demo cases.

## 4. OpenAI model strategy

Keep model names configurable because catalogs and account access change. Recommended current routing:

- `gpt-5.6-luna`: inexpensive follow-up questions and simple tool selection;
- `gpt-5.6-terra`: ambiguous comparisons, adversarial review, and the judging demo;
- `gpt-6-astra`: optional single difficult showcase case when access and remaining budget permit.

Use the Responses API and strict tool schemas. Verify configured models at startup and show only a redacted health result to the browser.

The $50 credit should be divided into $10 for development/evals, $25 for rehearsal/runtime, and $15 reserve. Compact evidence packets, short outputs, cached stable instructions, no more than four tool calls, and fixed provider fixtures keep costs bounded. The application estimates cost before sending and reconciles it from actual usage.

Official references:

- [OpenAI model catalog](https://developers.openai.com/api/docs/models)
- [OpenAI Responses API reference](https://developers.openai.com/api/reference/cli/resources/responses/methods/create)
- [OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs)

## 5. Serving architecture rationale

Use a single React application built with Next.js App Router and TypeScript. Deploy it to Vercel and keep `npm run dev` running locally as the judging standby.

Server-only route handlers perform Federato authentication and call Baseten and OpenAI. The browser receives sanitized Decision Packets and streaming status. Secrets never enter `NEXT_PUBLIC_*` variables. No separate Python service, database, vector store, or queue is necessary for 50+ records and a 24-hour build.

Recommended topology:

    Browser
      → Vercel Next.js application
        → server route handlers
          ├─ Federato Auth0 and query handler
          ├─ Baseten Model API
          ├─ OpenAI Responses API
          └─ Sentry telemetry

Use in-memory run state and a sanitized checked-in Federato snapshot. If Vercel request duration is restrictive, split analysis into bounded batches and stream results rather than adding a second backend.

## 6. Sentry rationale

Sentry is valuable because this system crosses UI, orchestration, two model providers, a data API, validation, and deterministic logic. An error message alone cannot explain why a decision is slow or untrustworthy.

Use:

- Tracing for the end-to-end run and each provider/tool span.
- Logs for searchable decision metadata and provider performance.
- Session Replay for confusing or broken review flows.
- Agent/model instrumentation for model latency, tokens, tool calls, repairs, and validation.

The strongest prize evidence is a real feedback loop: Sentry reveals a duplicate query, slow sequential call, missed caveat, excessive tool cycle, or broken UI flow; Codex implements a correction and regression test; the team shows a before/after measurement.

## 7. Codex rationale

Codex should operate as a development system rather than autocomplete. Give it bounded workstreams, typed interfaces, tests, and Sentry artifacts. Preserve the relationship between prompt, patch, test, and outcome.

The orchestrator should:

- own shared types and integration;
- delegate disjoint modules only;
- require acceptance commands from every task;
- freeze deterministic fixtures before prompt iteration;
- use Codex to cluster failures and propose the smallest correction;
- record rejected proposals as evidence of human judgment;
- avoid concurrent writes to shared files.

Official reference:

- [OpenAI Codex subagent guidance](https://developers.openai.com/es-419/docs/agent-configuration/subagents)
- [OpenAI Codex use cases](https://learn.chatgpt.com/use-cases)

## 8. Security and privacy

- Keep Federato, Baseten, OpenAI, and Sentry secrets in server-side environment variables.
- Remove authorization, cookie, client-secret, and API-key headers before telemetry.
- Do not log complete prompts or complete submissions.
- Prefer IDs, hashes, counts, outcomes, model names, tokens, latency, and cost.
- Mask Replay by default and selectively unmask only synthetic demo fields.
- Validate one captured event manually before relying on redaction.
- Run a repository and built-bundle secret audit before deployment.

The credentials shared in the event channel should not be reproduced in documentation or committed files.

## 9. Federato and underwriting sources

- [Federato: Submission Triage—Eliminate the Intake Bottleneck](https://www.federato.ai/articles/solving-submission-intake-bottleneck)
- [Federato: Submission Triage—How It Works](https://www.federato.ai/articles/submission-triage-how-it-works)
- [Federato: 2025 State of Underwriting](https://www.federato.ai/articles/introducing-the-2025-federato-state-of-underwriting-report)
- [Federato: Why Insurance AI Has Not Transformed the Work](https://www.federato.ai/articles/why-insurance-ai-hasnt-transformed-the-work)
- [NAIC: Artificial Intelligence](https://content.naic.org/insurance-topics/artificial-intelligence)
- [NAIC Model Bulletin on the Use of AI Systems by Insurers](https://content.naic.org/sites/default/files/inline-files/2023-12-4%20Model%20Bulletin_Adopted_0.pdf)

## 10. Platform sources

- [Baseten Model APIs](https://docs.baseten.co/inference/model-apis/overview)
- [Baseten Function Calling](https://docs.baseten.co/inference/function-calling)
- [Baseten Structured Outputs](https://docs.baseten.co/inference/structured-outputs)
- [Sentry Agent Tracing](https://sentry.io/changelog/agent-tracing-is-now-ga/)
- [Sentry Session Replay for Next.js](https://docs.sentry.io/platforms/javascript/guides/nextjs/session-replay/)

## 11. Supplied challenge package

The event ZIP contains:

- `STUDENT_PROJECT_GUIDELINES.pdf`
- `API_DOCUMENTATION.pdf`
- `QUERY_REQUEST_BODY.pdf`
- `GLOSSARY.pdf`
- `APPETITE_GUIDELINES.pdf`
- `DATA_SCHEMA.pdf`

Implementation agents should consult those primary files for exact request syntax and live schema behavior. Research summaries never override the supplied documentation or a verified live response.
