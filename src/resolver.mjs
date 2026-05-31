// resolver.mjs — Inlined N-axis resolver.
//
// This is the same logic published as the kg-suite-vault-contract-resolver
// npm package; inlined here so the reference implementation has zero
// runtime dependencies and is auditable in one read-through.
// To swap to the published package, replace this file with:
//   export { resolveNAxis } from "kg-suite-vault-contract-resolver";

const DEFAULT_STATUS_ORDERING = [
  "any", "us-person-verified", "authorized-foreign-person-with-license",
  "secret-clearance", "top-secret-clearance", "ts-sci-clearance"
];

export function resolveNAxis({ axes, tierTuple, statusOrdering = DEFAULT_STATUS_ORDERING }) {
  if (!Array.isArray(axes) || axes.length === 0) throw new Error("axes must be a non-empty array");
  const perAxisPolicies = axes.map((axis) => {
    const tier = tierTuple[axis.name];
    if (tier === undefined) throw new Error(`tierTuple missing entry for axis "${axis.name}"`);
    const policy = axis.policies[tier];
    if (policy === undefined) throw new Error(`axis "${axis.name}" has no policy for tier "${tier}"`);
    return { axisName: axis.name, tier, policy };
  });
  const actionSets = perAxisPolicies.map((p) => new Set(p.policy.allowed_actions ?? []));
  const intersectedActions = [...actionSets[0]].filter((a) => actionSets.every((s) => s.has(a)));
  const indices = perAxisPolicies.map((p) => {
    const idx = statusOrdering.indexOf(p.policy.minimum_human_user_status ?? "any");
    if (idx === -1) throw new Error(`axis "${p.axisName}" tier "${p.tier}" minimum_human_user_status "${p.policy.minimum_human_user_status}" not in statusOrdering`);
    return idx;
  });
  const maxIdx = Math.max(...indices);
  const requirementFields = new Set();
  for (const p of perAxisPolicies) for (const k of Object.keys(p.policy)) if (k.startsWith("requires_")) requirementFields.add(k);
  const resolvedRequirements = {};
  for (const f of requirementFields) resolvedRequirements[f] = perAxisPolicies.some((p) => p.policy[f] === true);
  return {
    tuple: tierTuple,
    resolved_allowed_actions: intersectedActions,
    resolved_minimum_human_user_status: statusOrdering[maxIdx],
    ...resolvedRequirements,
    diagnostics: {
      per_axis: perAxisPolicies.map((p) => ({ axis: p.axisName, tier: p.tier, allowed_actions: p.policy.allowed_actions ?? [], minimum_human_user_status: p.policy.minimum_human_user_status ?? "any" })),
      blocking_axis_on_actions: actionSets.map((set, idx) => ({ axis: perAxisPolicies[idx].axisName, set_size: set.size })).sort((a, b) => a.set_size - b.set_size)[0]?.axis ?? null,
      max_status_axis: perAxisPolicies[indices.indexOf(maxIdx)].axisName
    }
  };
}
