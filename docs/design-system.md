# BindSight interface system

BindSight is an underwriting routing board: operational, evidence-led, and compact enough to support repeated daily review. It avoids the generic SaaS-card aesthetic in favor of stable work surfaces, dossier tabs, and strong typographic alignment.

## Mode and protected contracts

- Mode: redesign overhaul.
- Preserve: `/`, `/appetite`, `/submissions/[id]`, all API routes, cohort anchors, evidence anchors, source links, semantic tables, and reviewer behavior.
- Improve: scan hierarchy, filtering, keyboard focus, narrow-screen legibility, and decision provenance.
- Remove: generic Arial styling, interchangeable rounded cards, and undifferentiated table chrome.
- Highest risk: keeping 100+ records useful on small screens. The fallback is a labeled stacked row, using the same table markup and source order.

## Calibration

- Visual variance: 6 — the routing-board frame and dossier tabs carry the identity; tables stay familiar.
- Motion intensity: 2 — state feedback only.
- Information density: 8 — analytical tables, tight controls, and progressive disclosure.
- Asset dependence: 2 — typography, real data, and interface structure carry the product.
- Brand fidelity: 5 — the BindSight name and product behavior remain; the visual language is new.

## Tokens

- Ink `#102a30`: primary text and application rail.
- Board `#d8e3e1`: workspace background.
- Sheet `#f7f4e9`: evidence and decision surfaces.
- Signal `#ed6a32`: focused work and urgent review.
- Verdict `#1f6b56`: passing and target outcomes.
- Exception `#a33a34`: failed appetite checks.
- Caution `#9a6719`: missing evidence and requests.
- Rule `#91a4a5`: dividers and table structure.
- Manual `#7b4d35`: conflicts that need human review.
- Renewal `#356273`: renewal-workflow treatment.
- Cohort tabs `#8bb9b0` and `#c9b7a7`: quiet workflow differentiation.

Commissioner is the workhorse face. Petrona is reserved for account names and top-level headings, giving decision packets the character of formal underwriting documents without imitating a newspaper.

Spacing follows a 4px base. Controls use 2px corners, work surfaces use 4px corners, and semantic labels remain rectangular. Shadows are reserved for the fixed navigation rail on compact screens.

## Interaction principles

- Search and treatment filtering must never alter source data or ranking logic.
- Color is always paired with text.
- Focus states use a high-contrast double outline.
- Tables become labeled stacked records below 760px; they do not become horizontally squeezed.
- Motion is optional and must collapse under `prefers-reduced-motion`.
