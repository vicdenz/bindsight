# Architecture Decisions

## ADR-001: Deterministic underwriting outcomes

Models may compile, map, plan, explain, and select read-only reviewer tools. TypeScript code exclusively owns rule predicates, calculations, action precedence, ranking, counterfactual outcomes, and citation validation.

## ADR-002: Fixture-first fallback

The application remains usable with sanitized synthetic fixtures when providers are unavailable. Cached data is always labeled and no fixture contains credentials or claims to be live Federato data.
