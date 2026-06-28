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
  lines.push(`## New findings (${run.freshCount ?? run.fresh.length})`);
  for (const f of run.fresh) {
    lines.push(findingLine(f));
  }
  return lines.join("\n");
}

function findingLine(f) {
  const head = `- [${f.severity ?? "?"}] ${f.title ?? f.rule ?? "finding"} - ${f.file ?? "?"}:${f.line ?? "?"}`;
  return f.detail ? `${head}\n  ${f.detail}` : head;
}

// Rolling tracking issue: one issue per target. Its body reflects the latest
// full state; weekly changes are posted as comments so unchanged findings are
// not re-filed.
export function formatRollingTitle(run) {
  return `Swarm review (rolling): ${run.target}`;
}

export function formatRollingBody(run, findings) {
  const counts = run.severityCounts ?? {};
  const sev = SEVERITIES.map((s) => `${s}:${counts[s] ?? 0}`).join(" ");
  const lines = [];
  lines.push(
    `Rolling AAHP Swarm review of ${run.target}. The body reflects the latest run; weekly changes are posted as comments.`,
  );
  lines.push("");
  lines.push(`- Last run: ${run.date}`);
  lines.push(`- Commit: ${run.sha}`);
  lines.push(`- Verdict: ${run.decision_state} (result=${run.result}, safe_to_commit=${run.safe_to_commit})`);
  lines.push(`- Findings: ${sev}`);
  if (run.reason) {
    lines.push("");
    lines.push(`Reason: ${run.reason}`);
  }
  lines.push("");
  lines.push(`## Current findings (${findings.length})`);
  if (findings.length === 0) {
    lines.push("None.");
  } else {
    for (const f of findings) lines.push(findingLine(f));
  }
  return lines.join("\n");
}

export function formatDeltaComment(run, fresh, resolvedCount) {
  const lines = [];
  lines.push(
    `Run ${run.date} (${run.sha}): ${fresh.length} new, ${resolvedCount} resolved. Verdict ${run.decision_state}.`,
  );
  if (fresh.length > 0) {
    lines.push("");
    lines.push(`### New findings (${fresh.length})`);
    for (const f of fresh) lines.push(findingLine(f));
  }
  return lines.join("\n");
}
