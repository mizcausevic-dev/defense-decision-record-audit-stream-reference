// verifier.mjs — Validates the produced stream against the 3 DefenseTech invariants.

import { canonicalize, sha256, ZERO_HASH } from "./event-builder.mjs";

const SEVENTY_TWO_HOURS_MS = 72 * 60 * 60 * 1000;

export function verify(events) {
  const errors = [];

  // Invariant chain: each event's prev_hash must equal the prior event's hash; first must be ZERO_HASH.
  let expectedPrev = ZERO_HASH;
  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    if (e.prev_hash !== expectedPrev) {
      errors.push(`chain: event[${i}] (${e.event_id}) prev_hash ${e.prev_hash} ≠ expected ${expectedPrev}`);
    }
    const { hash: _h, ...body } = e;
    const computed = sha256(canonicalize(body));
    if (e.hash !== computed) {
      errors.push(`chain: event[${i}] (${e.event_id}) hash ${e.hash} ≠ computed ${computed}`);
    }
    expectedPrev = e.hash;
  }

  // Invariant #1: CUI-Specified+ events require distribution_statement (DoDI 5230.24).
  const SPECIFIED_PLUS = new Set(["CUI-SPECIFIED","CUI-SPECIFIED-NOFORN","CONTROLLED-NOFORN","CLASSIFIED-CONFIDENTIAL","CLASSIFIED-SECRET","CLASSIFIED-TOP-SECRET","SCI"]);
  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    if (SPECIFIED_PLUS.has(e.resource?.cui_categorization) && !e.distribution_statement) {
      errors.push(`invariant#1: event[${i}] (${e.event_id}) cui_categorization=${e.resource.cui_categorization} requires distribution_statement (DoDI 5230.24)`);
    }
  }

  // Invariant #2: ITAR resources require us-person-verified or stricter on agent (22 CFR 120.62).
  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    if (e.resource?.export_control_status === "ITAR") {
      const ok = e.agent?.human_user_us_person_status === "US-PERSON-VERIFIED" || e.agent?.human_user_us_person_status === "AUTHORIZED-FOREIGN-PERSON-WITH-LICENSE";
      if (!ok) errors.push(`invariant#2: event[${i}] (${e.event_id}) ITAR resource requires US-PERSON-VERIFIED or AUTHORIZED-FOREIGN-PERSON-WITH-LICENSE`);
    }
  }

  // Invariant #3: DFARS 72-hour cyber-incident reporting clock.
  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    if (e.kind === "defensetech.dfars.cyber-incident-flagged") {
      if (!e.dfars_cyber_incident_report_ref?.filed_at) {
        errors.push(`invariant#3: event[${i}] (${e.event_id}) DFARS cyber-incident-flagged requires dfars_cyber_incident_report_ref.filed_at`);
      } else {
        const filed = new Date(e.dfars_cyber_incident_report_ref.filed_at).getTime();
        const occurred = new Date(e.timestamp).getTime();
        if (filed - occurred > SEVENTY_TWO_HOURS_MS) {
          errors.push(`invariant#3: event[${i}] (${e.event_id}) DFARS 72-hour clock missed (${Math.round((filed-occurred)/3600000)}h)`);
        }
      }
    }
  }

  return { ok: errors.length === 0, errors };
}
