# defense-decision-record-audit-stream-reference

> **AGPL-3.0 reference implementation of [`defense-decision-record-audit-stream`](https://github.com/mizcausevic-dev/defense-decision-record-audit-stream).** Runs the canonical Stratos Aerospace × VendorD GuardianAI 3.x trajectory **end-to-end against a mock CUI vault** that enforces the 3-axis vault contract (`cui_categorization` × `export_control_status` × `foreign_person_access_restriction`). Proves the DefenseTech design works in code, not just on paper.

Part of the [Kinetic Gain Protocol Suite](https://suite.kineticgain.com).

> Sibling to [`fhir-resource-access-audit-reference`](https://github.com/mizcausevic-dev/fhir-resource-access-audit-reference) (HealthTech) and [`matter-decision-record-audit-stream-reference`](https://github.com/mizcausevic-dev/matter-decision-record-audit-stream-reference) (LegalTech). Same role across the Suite: prove the spec is operable end-to-end.

## What this proves

The DefenseTech spec ships with three invariants enforced by a verifier. This reference impl proves that:

1. **The vault layer enforces the 3-axis intersection** — a request to operate on a `(CUI-Specified-NoForn, ITAR, US-Person-Only)` resource correctly resolves to "read + search + summarize only," matching the spec's declared policy. The vault denies what the contract denies; it permits what the contract permits.
2. **The audit-stream layer satisfies all 3 invariants simultaneously** — `cui-distribution-statement` on Specified+, `itar-us-person-verification` on ITAR resources, `dfars-72-hour-wall-clock` on cyber-incident events. The reference run produces a 3-event hash-chained stream that passes the verifier with no errors.
3. **The two layers interlock** — the vault gates access at request-time; the verifier independently checks the produced events at audit-time. Both pass on the same canonical trajectory.

## Architecture

```
orchestrator.mjs
   │
   ├─ requests access via vault.mjs (uses resolver.mjs for 3-axis intersection)
   │      └─ resolver.mjs: most-restrictive merge across cui × export × foreign axes
   │
   ├─ builds hash-chained event via event-builder.mjs (canonical-JSON SHA-256)
   │
   └─ emits to examples/stratos-guardianai-reference-stream.ndjson

verifier.mjs (independent, post-hoc)
   │
   ├─ chain validation (each prev_hash = prior hash)
   ├─ invariant #1 (CUI distribution statement on Specified+)
   ├─ invariant #2 (ITAR us-person verification)
   └─ invariant #3 (DFARS 72-hour wall-clock)
```

## Run it

```bash
git clone https://github.com/mizcausevic-dev/defense-decision-record-audit-stream-reference
cd defense-decision-record-audit-stream-reference
npm install
npm start    # orchestrates + writes the stream + runs the verifier
npm test     # 9 unit tests including vault gating + invariant-trip cases
```

Expected output:
```
Built 3 events → examples/stratos-guardianai-reference-stream.ndjson
OK · 3 events · chain ✓ · 3 invariants ✓ (cui-distribution-statement + itar-us-person + dfars-72-hour)
```

## What the vault enforces (3-axis intersection in action)

| Tuple | Resolved actions | Notes |
| --- | --- | --- |
| `(CUI-Basic, NOT-EXPORT-CONTROLLED, US-Person-Only)` | read · search · generate · summarize · redact | full vocabulary |
| `(CUI-Specified-NoForn, ITAR, US-Person-Only)` | read · search · summarize | ITAR removes generate (export-control); NoForn removes redact |
| `(CLASSIFIED-Secret, NOT-EXPORT-CONTROLLED, US-Person-Only)` | read · summarize | classified tier removes search/generate; requires secret clearance |
| `(SCI, NOT-EXPORT-CONTROLLED, US-Person-Only)` | **(empty — no actions allowed)** | SCI tier is no-action-allowed for GuardianAI v3.x; vault denies all |

## Why a separate AGPL-3.0 reference impl

- **The spec repo** ([`defense-decision-record-audit-stream`](https://github.com/mizcausevic-dev/defense-decision-record-audit-stream)) is MIT-licensed and contains schema + example data + a static verifier. It does *not* run end-to-end.
- **This reference impl** wires the vault + audit-stream + verifier into a runnable trajectory. AGPL-3.0 because reference implementations under the Suite's parallel-structure thesis carry a stronger copyleft posture than the specs themselves.
- Sibling reference impls follow the same pattern. The shared rule across the Suite: **specs are MIT, reference implementations are AGPL-3.0.**

## Composes with

- [`defense-decision-record-audit-stream`](https://github.com/mizcausevic-dev/defense-decision-record-audit-stream) — the spec this implements
- [`cui-data-vault-contract-profile`](https://github.com/mizcausevic-dev/cui-data-vault-contract-profile) — the 3-axis vault contract this references
- [`kg-suite-vault-contract-resolver`](https://github.com/mizcausevic-dev/kg-suite-vault-contract-resolver) — the N-axis resolver; this repo inlines a copy under `src/resolver.mjs` for dependency-free auditability
- [`cmmc-l2-l3-readiness-evidence-bundle`](https://github.com/mizcausevic-dev/cmmc-l2-l3-readiness-evidence-bundle) — evidence-bundle that ingests events produced here
- [`defense-ai-incident-card-profile`](https://github.com/mizcausevic-dev/defense-ai-incident-card-profile) — any verifier failure becomes an Incident Card
- [Kinetic Gain Protocol Suite](https://suite.kineticgain.com) — umbrella

## Compliance posture

Reference implementation **readiness scaffolding** for DFARS / CMMC / NIST 800-171/172 / ITAR / EAR / NISPOM / DoDI 5230.24 / FAR / FCA. Does NOT constitute CMMC certification, DDTC export licensing, or DCSA security-program accreditation. The mock vault is in-memory — production deployments must use Azure Government / AWS GovCloud / on-prem FIPS-140-validated vault. Per the standing Suite public-language guardrail: *readiness · evidence · posture · controls · scaffolding* — never "compliant" / "certified" without external attestation.

## License

AGPL-3.0-only. Spec repos this depends on remain MIT.
