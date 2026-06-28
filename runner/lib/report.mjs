const SEVERITIES = ["critical", "high", "medium", "low"];

// PUBLIC, sanitized: one line for the target's trust record. No file paths, no
// exploit detail, only the verdict and per-severity counts.
export function formatCadenceMarker(run) {
  const counts = run.severityCounts ?? {};
  const sev = SEVERITIES.map((s) => `${s}:${counts[s] ?? 0}`).join(" ");
  return `swarm-review ${run.date} verdict=${run.decision_state} findings(${sev})`;
}

export function formatIssueTitle(run) {
  return `Swarm review ${run.date}: ${run.decision_state} (${run.freshCount} new)`;
}

// PRIVATE sink only: full detail is allowed here.
export function formatIssueBody(run) {
  const lines = [];
  lines.push(`Target: ${run.target} @ ${run.sha}`);
  lines.push(`Verdict: ${run.decision_state} (result=${run.result}, safe_to_commit=${run.safe_to_commit})`);
  lines.push(`Reason: ${run.reason ?? "(none)"}`);
  lines.push("");
  lines.push(`## New findings (${run.fresh.length})`);
  for (const f of run.fresh) {
    lines.push(`- [${f.severity ?? "?"}] ${f.title ?? f.rule ?? "finding"} - ${f.file ?? "?"}:${f.line ?? "?"}`);
    if (f.detail) lines.push(`  ${f.detail}`);
  }
  return lines.join("\n");
}
