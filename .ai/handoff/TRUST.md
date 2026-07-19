# AAHP-SWARM Trust Register

| Claim | Status | Verified | TTL | Expires | Provenance |
|------|--------|----------|-----|---------|------------|
| Scaffold structure exists | Verified | 2026-06-26 | 30d | 2026-07-26 | source_verified |
| v0.2 role templates exist | Verified | 2026-06-26 | 30d | 2026-07-26 | source_verified |

---

## Provenance (Draft v0.1, proposed)

The Grounded Reflection Layer adds an orthogonal *provenance* field recording HOW a
claim was checked, separate from the Status above. Provenance tokens, weakest to
strongest: `model_claim`, `self_reviewed`, `cross_model_reviewed`, `source_verified`,
`tool_verified`, `test_verified`, `runtime_observed`, `human_confirmed`.
`cross_model_reviewed` maps to status `assumed`, never `verified`; only
`source_verified` / `tool_verified` / `test_verified` / `runtime_observed` /
`human_confirmed` can support `verified` (grounded). To record it in this register, add
a `Provenance` column to the tables above and use `-` when it is unknown. TTL and expiry
stay governed by the Trust Decay rule (README section 2.5). See GROUNDING.md for the anchor
matrix and README section 2.10 for the doctrine.
