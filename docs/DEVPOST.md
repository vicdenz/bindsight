# BindSight

> BindSight turns static appetite guidelines into a live, evidence-backed underwriting queue—showing what to pursue, what to ask, and why.

## Inspiration

Commercial underwriters have plenty of data, but turning that data into a defensible order of work is difficult. Appetite guidelines may describe desirable states, premiums, construction types, or loss histories, while the actual evidence is scattered across policies, submissions, claims, locations, and buildings.

We built BindSight to bridge that gap. Instead of another opaque score or general-purpose chatbot, BindSight gives underwriters a transparent workbench where every recommendation can be traced back to a rule, calculation, and source value.

## What it does

BindSight connects to Federato and organizes accounts into clear workflows:

- **New property candidates** are ranked against the active commercial-property appetite.
- **Renewals** are handled separately from new-business rules.
- **Unsupported lines of business** remain visible and are routed for manual review.

Opening an account shows a complete decision packet with the recommended workflow, score components, rule results, supporting evidence, calculations, normalized and raw values, data-quality issues, and the next best question when missing information could change the outcome.

An AI-assisted senior reviewer can explain and compare decisions, but it is restricted to the evidence already present in the packet. Appetite Studio also exposes versioned appetite rules and previews how strategy changes would affect the current book.

BindSight is a triage and decision-support tool—it does not quote, price, bind coverage, contact brokers, or make final underwriting decisions.

## How we built it

BindSight is a **Next.js 16, React 19, TypeScript, and Zod** application.

The backend authenticates to Federato using OAuth and reads connected policy, insured, submission, claims, exposure, location, and building data. A normalization layer converts that relationship graph into the fields required by the appetite guide, including state, premium, total insured value, building age, construction mix, and five-year losses.

The underwriting engine is deterministic. Versioned TypeScript predicates evaluate each rule and produce validated `DecisionPacket` objects containing stable evidence and calculation references. The frontend renders those packets directly rather than deriving decisions from AI-generated text.

OpenAI powers the senior-reviewer interface through narrow, read-only tools with citation validation and cost limits. Baseten-compatible model lanes sit behind a provider boundary with deterministic fallbacks.

We also added Sentry tracing, sensitive-value redaction, request deduplication, bounded pagination, caching, record validation, and a labeled fallback dataset for upstream failures.

## Challenges and learnings

One of the biggest challenges was the shape of the Federato dataset. The information required for appetite evaluation lives across multiple linked records rather than directly on submissions, so we only evaluate accounts where the necessary relationship path can be supported by evidence.

We also discovered that our initial routing logic treated renewals, missing information, unsupported lines, and actual appetite failures too similarly. We redesigned the engine around explicit cohorts so only verified rule failures become outside-appetite decisions.

Another challenge was introducing AI without weakening trust. Our solution was to keep calculations, predicates, rankings, and action precedence deterministic, while allowing the model to explain and interrogate the resulting evidence.

The biggest lesson was that **provenance matters more than a confident score**. Once every decision links back to stable rules, inputs, and calculations, both humans and AI can reason about it without losing accountability.

## Accomplishments

We’re especially proud that BindSight:

- works against live, paginated Federato relationship data;
- makes every decision auditable down to its raw evidence;
- separates new business, renewals, and unsupported lines into appropriate workflows;
- previews the effect of appetite changes before they reach production;
- restricts AI to grounded, read-only decision support; and
- passes **119 unit, integration, rule, provider, reviewer, query, and cost checks**, along with production-build and security audits.

## What’s next

Next, we want to add appetite profiles for more lines of business, renewal-specific rules, broker workflows for collecting missing evidence, persistent reviewer history, role-based access controls, and richer portfolio analysis.

We also see Appetite Studio evolving into a collaborative strategy layer with approvals, version history, and deterministic before-and-after simulations.