// vault.mjs — Mock CUI vault implementing the 3-axis policy contract.
//
// In production this would be Azure Government, AWS GovCloud, or an
// on-prem FIPS-140-validated vault. Here we satisfy the same interface
// in-memory so the reference impl is runnable without a real vault.

import { resolveNAxis } from "./resolver.mjs";

const VAULT_CONTRACT = {
  contract_id: "STRATOS-VAULT-GUARDIANAI-2026Q4",
  schema_version: "0.1",
  axis_policies: {
    cui_handling_policy: {
      PUBLIC:                    { allowed_actions: ["read","search","generate","summarize","redact"], minimum_human_user_status: "any",                requires_distribution_statement: false, requires_fso_cosign: false, requires_audit_stream_event: false },
      "CUI-BASIC":               { allowed_actions: ["read","search","generate","summarize","redact"], minimum_human_user_status: "us-person-verified", requires_distribution_statement: false, requires_fso_cosign: false, requires_audit_stream_event: true  },
      "CUI-SPECIFIED":           { allowed_actions: ["read","search","generate","summarize"],         minimum_human_user_status: "us-person-verified", requires_distribution_statement: true,  requires_fso_cosign: false, requires_audit_stream_event: true  },
      "CUI-SPECIFIED-NOFORN":    { allowed_actions: ["read","search","summarize"],                     minimum_human_user_status: "us-person-verified", requires_distribution_statement: true,  requires_fso_cosign: false, requires_audit_stream_event: true  },
      "CONTROLLED-NOFORN":       { allowed_actions: ["read","summarize"],                              minimum_human_user_status: "us-person-verified", requires_distribution_statement: true,  requires_fso_cosign: true,  requires_audit_stream_event: true  },
      "CLASSIFIED-CONFIDENTIAL": { allowed_actions: ["read","summarize"],                              minimum_human_user_status: "secret-clearance",   requires_distribution_statement: true,  requires_fso_cosign: true,  requires_audit_stream_event: true  },
      "CLASSIFIED-SECRET":       { allowed_actions: ["read","summarize"],                              minimum_human_user_status: "secret-clearance",   requires_distribution_statement: true,  requires_fso_cosign: true,  requires_audit_stream_event: true  },
      "CLASSIFIED-TOP-SECRET":   { allowed_actions: ["read"],                                          minimum_human_user_status: "top-secret-clearance", requires_distribution_statement: true, requires_fso_cosign: true,  requires_audit_stream_event: true  },
      SCI:                       { allowed_actions: [],                                                minimum_human_user_status: "ts-sci-clearance",   requires_distribution_statement: true,  requires_fso_cosign: true,  requires_audit_stream_event: true  }
    },
    export_control_handling_policy: {
      "NOT-EXPORT-CONTROLLED":   { allowed_actions: ["read","search","generate","summarize","redact"], minimum_human_user_status: "any",                requires_distribution_statement: false, requires_fso_cosign: false, requires_audit_stream_event: false },
      "EAR-99":                  { allowed_actions: ["read","search","generate","summarize","redact"], minimum_human_user_status: "any",                requires_distribution_statement: false, requires_fso_cosign: false, requires_audit_stream_event: false },
      "EAR-CCL-RESTRICTED":      { allowed_actions: ["read","search","generate","summarize"],         minimum_human_user_status: "us-person-verified", requires_distribution_statement: false, requires_fso_cosign: false, requires_audit_stream_event: true  },
      ITAR:                      { allowed_actions: ["read","search","summarize"],                     minimum_human_user_status: "us-person-verified", requires_distribution_statement: true,  requires_fso_cosign: false, requires_audit_stream_event: true  }
    },
    foreign_person_handling_policy: {
      "US-PERSON-ONLY":          { allowed_actions: ["read","search","generate","summarize","redact"], minimum_human_user_status: "us-person-verified", requires_distribution_statement: false, requires_fso_cosign: false, requires_audit_stream_event: true  },
      "AUTHORIZED-FOREIGN-PERSON-WITH-LICENSE": { allowed_actions: ["read","search","summarize"],     minimum_human_user_status: "authorized-foreign-person-with-license", requires_distribution_statement: true, requires_fso_cosign: false, requires_audit_stream_event: true },
      "FIVE-EYES-ONLY":          { allowed_actions: ["read","search","generate","summarize"],         minimum_human_user_status: "us-person-verified", requires_distribution_statement: false, requires_fso_cosign: false, requires_audit_stream_event: true  },
      "NATO-PLUS-ONLY":          { allowed_actions: ["read","search","summarize"],                     minimum_human_user_status: "us-person-verified", requires_distribution_statement: false, requires_fso_cosign: false, requires_audit_stream_event: true  },
      "NO-RESTRICTION":          { allowed_actions: ["read","search","generate","summarize","redact"], minimum_human_user_status: "any",                requires_distribution_statement: false, requires_fso_cosign: false, requires_audit_stream_event: false }
    }
  }
};

const AXES = [
  { name: "cui",            policies: VAULT_CONTRACT.axis_policies.cui_handling_policy },
  { name: "export_control", policies: VAULT_CONTRACT.axis_policies.export_control_handling_policy },
  { name: "foreign_person", policies: VAULT_CONTRACT.axis_policies.foreign_person_handling_policy }
];

/**
 * Mock CUI vault — resolves an access request against the 3-axis contract.
 * Returns { allowed, reason, resolved } where:
 *   - allowed: true/false
 *   - reason:  explanation string when denied
 *   - resolved: the full resolved policy from kg-suite-vault-contract-resolver
 */
export function requestAccess({ cuiTier, exportTier, foreignTier, action, agentUserStatus }) {
  const resolved = resolveNAxis({
    axes: AXES,
    tierTuple: { cui: cuiTier, export_control: exportTier, foreign_person: foreignTier }
  });

  if (!resolved.resolved_allowed_actions.includes(action)) {
    return {
      allowed: false,
      reason: `action "${action}" not in resolved allowed_actions [${resolved.resolved_allowed_actions.join(", ")}] (blocking axis: ${resolved.diagnostics.blocking_axis_on_actions})`,
      resolved
    };
  }

  const statusRank = ["any","us-person-verified","authorized-foreign-person-with-license","secret-clearance","top-secret-clearance","ts-sci-clearance"];
  const haveIdx = statusRank.indexOf(agentUserStatus);
  const needIdx = statusRank.indexOf(resolved.resolved_minimum_human_user_status);
  if (haveIdx < needIdx) {
    return {
      allowed: false,
      reason: `agent user status "${agentUserStatus}" does not meet resolved minimum "${resolved.resolved_minimum_human_user_status}" (max-status axis: ${resolved.diagnostics.max_status_axis})`,
      resolved
    };
  }

  return { allowed: true, reason: null, resolved };
}

export { VAULT_CONTRACT };
