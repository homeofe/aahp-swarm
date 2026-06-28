// Robustly pull the verdict JSON out of the agent's text output. The agent is
// asked for JSON only, but may wrap it in prose or a code fence, and finding text
// can contain stray braces (e.g. "${org}"). We scan for complete, string-aware
// balanced {...} objects and return the last one that parses and looks like a
// verdict, so surrounding prose cannot corrupt the parse.
export function extractVerdict(raw) {
  const candidates = balancedObjects(String(raw));
  // Prefer the last candidate that parses AND looks like a verdict.
  for (let i = candidates.length - 1; i >= 0; i--) {
    const obj = tryParse(candidates[i]);
    if (obj && (obj.decision_state !== undefined || obj.role === "verdict")) return obj;
  }
  // Otherwise the last candidate that parses at all.
  for (let i = candidates.length - 1; i >= 0; i--) {
    const obj = tryParse(candidates[i]);
    if (obj) return obj;
  }
  return null;
}

function tryParse(s) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

// Return every top-level balanced {...} substring, ignoring braces and quotes
// that appear inside JSON string values.
function balancedObjects(raw) {
  const out = [];
  let depth = 0;
  let start = -1;
  let inStr = false;
  let esc = false;
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') {
      inStr = true;
    } else if (c === "{") {
      if (depth === 0) start = i;
      depth++;
    } else if (c === "}") {
      if (depth > 0) {
        depth--;
        if (depth === 0 && start !== -1) {
          out.push(raw.slice(start, i + 1));
          start = -1;
        }
      }
    }
  }
  return out;
}
