# Changelog

## 1.0.0-prod — 2026-05-31

- Hardened to v1.0-prod per squad doctrine; member of the DefenseTech vertical 6-pack.
- Spec-component repo (no Pages deploy required); AGPL-3.0-or-later, synthetic example data only.
- Pulse universe entry not applicable (no custom subdomain).



## [0.1] — 2026-05-30

### Added

- Initial AGPL-3.0 reference implementation.
- **`vault.mjs`** — In-memory mock CUI vault implementing the 3-axis policy contract from `cui-data-vault-contract-profile`. All 9 CUI tiers × 4 export-control tiers × 5 foreign-person tiers populated. `requestAccess()` returns `{allowed, reason, resolved}`.
- **`resolver.mjs`** — Inlined N-axis resolver (same logic as `kg-suite-vault-contract-resolver` npm package; inlined for dependency-free auditability).
- **`event-builder.mjs`** — Canonical-JSON SHA-256 hash-chained event builder with `Chain` class.
- **`orchestrator.mjs`** — Runs the 3-step Stratos Aerospace × VendorD GuardianAI 3.x trajectory: (1) CUI-Basic RFP read, (2) CUI-Specified-NoForn + ITAR technical-data-package search with distribution statement D, (3) DFARS cyber-incident flagged with 72-hour report. Each step request-gates through the vault before emitting the event.
- **`verifier.mjs`** — Independent post-hoc verifier: chain integrity + 3 invariants (CUI distribution-statement, ITAR us-person verification, DFARS 72-hour wall-clock).
- **`cli.mjs`** — `npm start` orchestrates + writes stream + runs verifier in one command.
- 9 unit tests including: orchestrator output, verifier on canonical stream, chain hash-linking, vault denials on too-restrictive tier, vault denials on under-cleared user, tampered-hash detection, missing-distribution-statement detection, missed-72-hour-window detection.

### Not yet

- Real-vault adapter (Azure Government / AWS GovCloud / on-prem FIPS-140). Today's vault is in-memory.
- ed25519 signature on events (DefenseTech spec allows but doesn't require; sibling LegalTech reference makes it required).
- TOP-SECRET / SCI compartmented trajectory (would require fictional program designations).
- AUTHORIZED-FOREIGN-PERSON flow with valid DDTC license number.
- HTTP API exposing `requestAccess()` for cross-language integration.