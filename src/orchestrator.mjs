// orchestrator.mjs — Runs the canonical Stratos Aerospace × VendorD
// GuardianAI 3.x trajectory end-to-end. Returns the array of hash-
// chained events.

import { requestAccess } from "./vault.mjs";
import { Chain } from "./event-builder.mjs";

const AGENT_BASE = {
  ai_tool_card_url:     "https://vendord-guardianai.example/.well-known/ai-tool-cards/guardianai-3.x.json",
  ai_decision_card_url: "https://stratos-aerospace.example/.well-known/decisions/STRATOS-DEC-2026-DEF-0084.json"
};
const DECISION_CARD = AGENT_BASE.ai_decision_card_url;

const STEPS = [
  {
    event_id: "0190dt-r-0001", timestamp: "2026-11-03T14:00:00Z",
    kind: "defensetech.rfp.requirement-analyzed",
    source: "stratos-cui-enclave-prod",
    subject_ref: { scheme: "rfp-solicitation-number-tokenized", value: "tok_rfp_AF_RFP_2027_001" },
    resource: { type: "rfp-solicitation-document", id_tokenized: "tok_res_rfp_a1", cui_categorization: "CUI-BASIC", export_control_status: "NOT-EXPORT-CONTROLLED", foreign_person_access_restriction: "US-PERSON-ONLY" },
    action: "read",
    agent: { ...AGENT_BASE, human_user_clearance_level_tokenized: "tok_clr_UNCLASSIFIED", human_user_us_person_status: "US-PERSON-VERIFIED", us_person_status: "us-person-verified" },
    regulatory_basis: ["dfars-252-204-7012-cdi-safeguarding", "nist-sp-800-171-cui-protection", "cui-notice-2020-04-implementation"],
    decision_card_ref: DECISION_CARD
  },
  {
    event_id: "0190dt-r-0002", timestamp: "2026-11-03T15:30:00Z",
    kind: "defensetech.export-control.itar-ear-screening-performed",
    source: "stratos-export-control-prod",
    subject_ref: { scheme: "technical-data-package-id-tokenized", value: "tok_tdp_F35_subsystem_22" },
    resource: { type: "technical-data-package", id_tokenized: "tok_res_tdp_b2", cui_categorization: "CUI-SPECIFIED-NOFORN", export_control_status: "ITAR", foreign_person_access_restriction: "US-PERSON-ONLY" },
    action: "search",
    agent: { ...AGENT_BASE, human_user_clearance_level_tokenized: "tok_clr_SECRET", human_user_us_person_status: "US-PERSON-VERIFIED", us_person_status: "us-person-verified" },
    regulatory_basis: ["itar-22-cfr-120-130", "ear-deemed-export-22-cfr-120-50", "nist-sp-800-172-enhanced-security-requirements"],
    distribution_statement: { statement_letter: "D", applied_at: "2026-11-03T15:30:00Z", rationale: "Distribution authorized to DoD + DoD contractors only" },
    decision_card_ref: DECISION_CARD
  },
  {
    event_id: "0190dt-r-0003", timestamp: "2026-11-03T18:00:00Z",
    kind: "defensetech.dfars.cyber-incident-flagged",
    source: "stratos-soc-prod",
    subject_ref: { scheme: "cage-code-tokenized", value: "tok_cage_STRATOS_AERO_1A2B3" },
    resource: { type: "cui-spillage-event-log", id_tokenized: "tok_res_spillage_e5", cui_categorization: "CUI-BASIC", export_control_status: "NOT-EXPORT-CONTROLLED", foreign_person_access_restriction: "US-PERSON-ONLY" },
    action: "read",
    agent: { ...AGENT_BASE, human_user_clearance_level_tokenized: "tok_clr_SECRET", human_user_us_person_status: "US-PERSON-VERIFIED", us_person_status: "us-person-verified" },
    regulatory_basis: ["dfars-252-204-7012-cyber-incident-reporting", "nist-sp-800-171-cui-protection"],
    dfars_cyber_incident_report_ref: {
      report_id: "STRATOS-DFARS-REF-2026-0011",
      filed_at: "2026-11-04T15:30:00Z",
      dibnet_dod_mil_url: "https://dibnet.dod.mil/reports/STRATOS-DFARS-REF-2026-0011"
    },
    decision_card_ref: DECISION_CARD
  }
];

export function orchestrate({ skipVaultCheck = false } = {}) {
  const chain = new Chain();
  const events = [];
  const denials = [];
  for (const step of STEPS) {
    // Vault gate: request access through the 3-axis vault before emitting the event.
    if (!skipVaultCheck) {
      const check = requestAccess({
        cuiTier: step.resource.cui_categorization,
        exportTier: step.resource.export_control_status,
        foreignTier: step.resource.foreign_person_access_restriction,
        action: step.action,
        agentUserStatus: step.agent.us_person_status
      });
      if (!check.allowed) {
        denials.push({ event_id: step.event_id, reason: check.reason });
        continue;
      }
    }
    events.push(chain.build(step));
  }
  return { events, denials };
}
