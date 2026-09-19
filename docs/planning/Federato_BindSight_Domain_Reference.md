# BindSight Domain Reference

Use this file when implementing underwriting logic, interpreting Federato data, or explaining the product. The primary execution contract is [Federato_BindSight_Build_Spec.md](./Federato_BindSight_Build_Spec.md).

## 1. What a commercial underwriter does

A commercial underwriter is the insurer-side professional who decides which submitted risks deserve investigation and whether they fit the carrier's strategy. A broker submits a business and requested coverage. The underwriter examines the business, insured property, locations, construction, requested limits, premium opportunity, loss history, and the insurer's current portfolio.

The practical question is not simply, “Is this risky?” It is:

> Given our appetite, available evidence, premium opportunity, portfolio, and limited time, what deserves attention now—and what should I ask next?

That work includes:

- screening submissions against hard eligibility requirements;
- distinguishing acceptable business from especially attractive target business;
- finding disqualifying facts;
- identifying missing or contradictory information;
- comparing one opportunity with the rest of the queue;
- checking whether writing it worsens a concentration;
- recording the evidence behind the recommendation;
- deciding which broker question has the greatest decision value.

BindSight optimizes scarce underwriter attention. It supports triage and review; it does not price risk, issue quotes, bind coverage, or replace a licensed decision-maker.

## 2. Product outcomes

Every appetite rule has one of five evidence states:

1. **Target:** verified evidence matches the carrier's preferred range.
2. **Pass:** verified evidence is acceptable but not preferred.
3. **Fail:** verified evidence violates a hard appetite rule.
4. **Missing:** required evidence is unavailable.
5. **Conflict:** sources disagree in a way that affects the decision.

These produce five action tiers:

1. **Review now:** all hard gates pass, evidence is sufficiently complete, and target alignment is strong.
2. **Standard review:** all hard gates pass, but the opportunity has less target alignment.
3. **Request information:** a decision-critical fact is missing.
4. **Manual review:** ambiguity or conflicting evidence cannot be resolved safely.
5. **Likely decline:** a verified hard failure exists.

Missing is never failure. A missing building year means “ask for the year,” not “the building is too old.” A verified old building may be a hard failure. Keeping those states distinct is central to the product's credibility.

The precedence rule is:

- a verified hard failure produces likely decline even when unrelated facts are absent;
- an irreducible conflict affecting a hard gate produces manual review unless another verified hard failure already determines likely decline;
- missing hard-gate evidence produces request information;
- passing all hard gates with sufficient evidence produces review now or standard review based on target alignment.

## 3. Federato challenge resources

The supplied package contains:

- 50+ synthetic commercial insurance submissions;
- a schema-discovery operation;
- a query operation;
- a sample 2025 commercial-property appetite guide;
- an underwriting glossary;
- Federato query-language documentation;
- permission to add optional enrichment.

Both data operations use the event handler:

    POST https://product.federato.ai/integrations-api/handlers/federato-hack-north?outputOnly=true

Schema request:

    { "action": "schema" }

Query request:

    {
      "action": "query",
      "payload": {
        "resource": "Policy",
        "pagination": { "limit": 5 }
      }
    }

Authentication uses the event's Auth0 endpoint. The token is valid for approximately four hours. Credentials and tokens must remain server-side and must never enter browser bundles, Git history, model prompts, telemetry, fixtures, or screenshots.

The submissions are runtime and evaluation records, not a labeled training set. This project performs no training or fine-tuning.

## 4. Supplied appetite

| Factor | Acceptable | Target | Not acceptable |
|---|---|---|---|
| Submission type | New business | — | Renewal |
| Line of business | Property | — | Other lines |
| Primary state | OH, PA, MD, CO, CA, FL, NC, SC, GA, VA, UT | OH, PA, MD, CO, CA, FL | All other states |
| Total insured value | Up to $150M | $50M–$100M | Over $150M |
| Premium | $50K–$175K | $75K–$100K | Below $50K or above $175K |
| Building age | Newer than 1990 | Newer than 2010 | Older than 1990 |
| Construction | More than 50% joisted masonry, non-combustible/steel, or masonry non-combustible | — | More than 50% other types |
| Five-year loss value | Under $100K | — | Over $100K |

Expected evidence includes account name, primary risk state, line of business, effective and expiration dates, TIV, construction, building year, premium, and five-year loss history.

Do not silently resolve ambiguous boundaries. For example, “newer than 1990” and “older than 1990” do not define exactly 1990. Store the boundary interpretation as configuration, surface it in Appetite Studio, and return manual review until Federato clarifies it.

## 5. Evidence model

Generated prose is never the source of truth. Each displayed conclusion must link through stable IDs:

    Evidence E17
    Source: Building b-102
    Field: tiv
    Value: $50,000,000

    Calculation C04
    Operation: SUM
    Inputs: E17, E18
    Result: $82,500,000

    Decision D02
    Rule: TIV-2025-02
    Predicate: $50M <= C04 <= $100M
    Result: TARGET

The evidence ledger should retain resource, record ID, field path, normalized value, retrieval time, and provenance. Calculations should retain operation, inputs, units, and result. Decision atoms should retain the rule, evidence/calculation references, outcome, and explanation template.

## 6. Two-stage retrieval

Stage A is a broad, inexpensive scan across all submissions. Retrieve identifiers, account, line, business type, state, premium, dates, and available summaries. Use it to remove obvious hard failures and find candidates needing more evidence.

Stage B performs targeted evidence queries only for viable, incomplete, or ambiguous candidates. Retrieve locations, buildings, TIV inputs, construction, years, loss records, and available portfolio context. This reduces latency and gives Sentry an understandable trace: weak candidates should not trigger the same work as promising candidates.

The query planner proposes a declarative plan. Application code checks every resource, field, operator, array traversal, expansion, pagination limit, and aggregation before execution. Planning is capped at one correction after validator feedback and one optional deeper query.

## 7. Next-best question

For every missing decision-critical field:

1. Enumerate plausible values or rule outcomes.
2. Re-run the deterministic decision for each outcome.
3. Measure the largest possible action-tier change.
4. Prefer high impact and low broker effort.
5. Phrase one clear question using known context only.

Example:

> What year was the primary insured structure constructed?

The UI should explain why it comes first: a value at or below the configured cutoff may create a hard appetite problem, while a newer value may create a target match.

## 8. Portfolio preview

If the discovered schema exposes active or bound policies, calculate current and pro-forma concentration for state, TIV, premium, construction, or available hazard tags. Add the candidate only in memory and show absolute and percentage deltas. Label this as concentration analysis, not catastrophe modeling. If reliable portfolio data is unavailable, hide the preview or say so explicitly.

## 9. Questions for Federato

Record answers in `docs/ASSUMPTIONS.md` and encode them as configuration:

1. Is exactly 1990 acceptable, unacceptable, or manual review?
2. Is exactly 2010 target or merely acceptable?
3. When multiple buildings exist, does one old building fail the account?
4. Is construction percentage weighted by count, square footage, or TIV?
5. Does loss value mean paid, incurred, or paid plus outstanding?
6. Is the five-year window measured from today, submission date, or effective date?
7. How is primary state determined across multiple locations?
8. Which resource and status represent the current portfolio?
9. Do judges prefer “likely decline” or a different non-binding recommendation?
10. Which explanation details make a Federato engineer trust the result?
11. What messy-data failure do Federato FDEs encounter most often?
