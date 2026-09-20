# BindSight

> BindSight turns static appetite guidelines into a live, evidence-backed underwriting queue—showing what to pursue, what to ask, and why.

## Inspiration

Commercial underwriters rarely suffer from a lack of data. The harder problem is turning a large, uneven book of submissions into a defensible order of work.

We were inspired by the gap between an appetite document and an underwriter's actual day. Guidelines may say which states, premiums, construction types, or loss histories are desirable, but those rules still have to be matched against records spread across policies, submissions, insureds, claims, locations, and buildings. When that work is manual, valuable opportunities can be buried in the queue and a missing field can be mistaken for a failed risk.

We wanted to build something more useful than another opaque score or general-purpose chatbot. BindSight is an underwriting workbench where every recommendation can be traced back to a rule, a calculation, and the source evidence that produced it.

## What it does

BindSight connects to Federato and turns the available policy and submission graph into three clear underwriting workflows:

- **New property candidates** are evaluated and ranked against the active commercial-property appetite.
- **Renewals** are reviewed in a separate workflow instead of being rejected by new-business rules.
- **Other lines of business** remain visible and are routed for manual review until a matching appetite profile is available.

An underwriter can search the queue by account, submission ID, state, or line of business and filter it by recommended treatment. Opening an account reveals a complete decision packet containing:

- the recommended workflow and transparent score components;
- each appetite rule marked target, pass, fail, missing, conflict, or not applicable;
- the evidence and calculations behind every rule result;
- raw Federato values alongside normalized values;
- data-quality issues and documented assumptions;
- the next best question when missing information could change the treatment; and
- an AI-assisted senior reviewer that is restricted to the evidence in the packet.

Appetite Studio exposes the versioned source language behind the rules and previews how a strategy change would affect the book before that change reaches the decision queue.

BindSight supports triage; it does not quote, price, bind coverage, contact brokers, write back to Federato, or make a final underwriting decision.

## How we built it

We built BindSight as a single Next.js 16 application using the App Router, React 19, TypeScript, and Zod.

The server authenticates to Federato with OAuth client credentials and reads `Policy` records with their insured, headquarters, originating submission, claims, exposure units, locations, and buildings expanded. A normalization layer converts that relationship graph into the exact fields needed by the supplied commercial-property appetite: submission type, line of business, primary risk state, premium, total insured value, oldest building year, supported-construction percentage, and five-year incurred losses.

The underwriting engine is deterministic. Versioned TypeScript predicates evaluate the appetite rules, create stable evidence and calculation IDs, and produce a validated `DecisionPacket`. The frontend consumes that contract directly; it never tries to infer the decision from generated prose.

OpenAI powers the senior-reviewer experience through narrow, read-only tools. Reviewer responses are budget-capped, checked against the packet, and rejected if they cite evidence or rules that do not exist. Baseten-compatible compiler, query-planning, and explanation lanes are available behind a provider boundary, with deterministic fallbacks when a model or provider is unavailable.

Sentry captures application errors and traces with credential and sensitive-field redaction. A short-lived live-data cache, bounded pagination, request deduplication, per-record validation, and a labeled fallback snapshot keep the demo useful when an upstream service is slow or unavailable.

The frontend is designed as a high-density underwriting routing board rather than a generic SaaS dashboard. It uses semantic tables, visible keyboard focus, non-color status labels, responsive stacked records, and direct links between decisions, rules, evidence, calculations, and JSON packets.

## Challenges we ran into

The first major challenge was the shape of the Federato dataset. The dataset contains 158 submission records, but the evidence required by the appetite guide—premium, claims, insured information, and building schedules—lives on linked policy records. Only 113 bound submissions have that complete relationship path. We chose to analyze the evidence-backed policy/submission cohort instead of inventing values for records that could not be supported by the published graph.

The second challenge was semantic, not technical. Our earliest routing logic made too many records look like declines because it treated renewals, unsupported lines, missing evidence, and verified appetite failures as variations of the same outcome. We reworked the system around explicit screening cohorts and distinct statuses. A renewal is now a renewal workflow, an unsupported line is a missing-profile workflow, and only a verified rule failure can produce an outside-appetite result.

The appetite document also contains real-world ambiguity. Some criteria are precise enough to compile directly; others require careful definitions, such as which location determines primary state or how construction mix should be weighted. We preserved source wording, assigned stable rule versions, documented assumptions, and linked every decision back to the relevant rule rather than hiding those judgments.

Finally, adding AI without weakening trust required strong boundaries. The model can explain, compare, and ask for evidence, but deterministic code owns calculations, predicates, action precedence, rankings, cost limits, and citation validation.

## Accomplishments that we're proud of

- We replaced a cached demonstration queue with live, paginated Federato relationship data while retaining a clearly labeled resilient fallback.
- We made every underwriting result auditable from the queue down to raw source values and derived calculations.
- We corrected the false-decline problem by separating new business, renewals, and unsupported lines into honest workflows.
- We built an appetite-change preview that shows the exact rules and submissions affected without changing application code or model weights.
- We constrained the AI reviewer to read-only, evidence-grounded tools instead of allowing it to invent or override decisions.
- We created a distinctive, accessible interface designed for repeated underwriting work rather than a one-off demo.
- The current release passes 119 unit, integration, rule, query, provider, reviewer, and cost checks; the production build, secret audit, live-route smoke tests, and dependency audit also pass.

## What we learned

We learned that trustworthy underwriting software starts with semantics and provenance, not scoring. The most important distinction in the product is often not “good risk versus bad risk,” but “verified failure versus missing evidence versus wrong workflow.”

We also learned that an evidence ID is more valuable than a confident paragraph. Once every rule result carries stable references to its inputs and calculations, explanations become reviewable, the AI can be constrained, and an underwriter can challenge the system without losing context.

The integration reinforced how much the shape of an API influences product design. Federato's relationship graph encouraged us to treat a decision packet as a connected evidence object rather than a flattened submission row.

Finally, we learned that models are most useful when they operate inside a small, explicit authority boundary. Letting deterministic code own the decision while the model helps people interrogate it produced a system that is both more useful and easier to trust.

## What's next for BindSight

The next step is to add versioned appetite profiles for additional lines of business and a renewal-specific evaluation profile, so every visible cohort can receive meaningful review without borrowing rules from another workflow.

We also want to add broker-intake workflows that request missing evidence, persistent run history and reviewer notes, role-based access controls, and richer portfolio-concentration views. Appetite Studio can grow into a collaborative strategy tool with approval, version history, and deterministic before-and-after simulations.

Before production use, we would complete a deployment rehearsal against the hosted environment, validate the full provider path under realistic concurrency, capture Sentry release evidence, and work with underwriting and compliance teams to calibrate profiles, permissions, retention, and human-approval requirements.
