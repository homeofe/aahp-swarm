export const RESULTS = ["pass", "warning", "fail", "block", "hold"];
export const DECISION_STATES = [
  "ALLOW",
  "DENY_POLICY",
  "HOLD_AMBIGUOUS",
  "HOLD_METADATA_REQUIRED",
  "ESCALATE_REVIEW",
  "FAIL_CONFIGURATION",
];

// Mirrors the invariants in aahp-swarm/schemas/verdict.schema.json without
// pulling in a JSON-Schema dependency.
export function validateVerdict(v) {
  if (typeof v !== "object" || v === null) {
    return { ok: false, errors: ["verdict is not an object"] };
  }
  const errors = [];
  if (v.role !== "verdict") errors.push('role must be "verdict"');
  if (!RESULTS.includes(v.result)) errors.push("result must be one of " + RESULTS.join(", "));
  if (!DECISION_STATES.includes(v.decision_state)) {
    errors.push("decision_state must be one of " + DECISION_STATES.join(", "));
  }
  if (typeof v.blocking !== "boolean") errors.push("blocking must be a boolean");
  if (typeof v.safe_to_commit !== "boolean") errors.push("safe_to_commit must be a boolean");
  if (v.decision_state !== "ALLOW" && v.safe_to_commit === true) {
    errors.push("safe_to_commit must be false when decision_state is not ALLOW");
  }
  if (v.decision_state && !["ALLOW", "DENY_POLICY"].includes(v.decision_state)) {
    if (typeof v.ambiguity !== "object" || v.ambiguity === null) {
      errors.push("ambiguity object is required when decision_state is a HOLD, ESCALATE, or FAIL state");
    }
  }
  return { ok: errors.length === 0, errors };
}
