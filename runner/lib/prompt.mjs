// Builds the single prompt the server-side claude CLI runs. The agent plays the
// full Scout -> Tester -> Risk -> Verdict chain and must return one JSON object
// that validates against the verdict schema, with a findings array attached.
export function assemblePrompt({ roles, profile, repoTree }) {
  return [
    "You are an aahp-swarm reviewer. Play the Scout, Tester, Risk, and Verdict",
    "roles in sequence against the target repository described below.",
    "",
    "## Role contracts",
    roles,
    "",
    "## Target review profile",
    profile,
    "",
    "## Target repository file tree",
    repoTree,
    "",
    "## Output contract",
    "Return ONE JSON object and nothing else. It MUST have the verdict fields",
    "(role:\"verdict\", result, decision_state, blocking, safe_to_commit) and a",
    "top-level findings array of { file, line, rule, title, severity, detail }.",
    "An ambiguous result resolves to a typed HOLD state, never a false ALLOW.",
    "If decision_state is not ALLOW, safe_to_commit MUST be false and an",
    "ambiguity object MUST be present.",
  ].join("\n");
}
