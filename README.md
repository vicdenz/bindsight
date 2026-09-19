# BindSight

BindSight is an evidence-backed commercial-insurance underwriting triage workbench for Hack the North 2026.

## Planning documents

Start with the compact execution contract:

- [Primary Build Specification](docs/planning/Federato_BindSight_Build_Spec.md)

Load the supporting references only when the active task needs them:

- [Domain Reference](docs/planning/Federato_BindSight_Domain_Reference.md)
- [Evaluation Reference](docs/planning/Federato_BindSight_Evals.md)
- [Demo and Prize Reference](docs/planning/Federato_BindSight_Demo_and_Prizes.md)
- [Research and Architecture Rationale](docs/planning/Federato_BindSight_Research.md)

## Current implementation

The project now includes a Next.js workbench, deterministic appetite evaluator, evidence ledger, cached five-tier demo, Federato Auth0/query adapter, and OpenAI reviewer budget/tool guards. Start it with:

```bash
npm install
npm run dev
```

Without provider credentials the UI uses clearly labeled synthetic cached packets. Add the server-only variables from `.env.example` to enable later live-provider integration.

Run the non-destructive checks with `npm run verify`.
