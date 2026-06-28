import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname } from "node:path";

// Per-target persistent state for the rolling review: the tracking issue number
// and the finding keys seen on the previous run, so weekly runs only report what
// changed. Missing or corrupt state is treated as a fresh start.
export function loadState(file) {
  if (!existsSync(file)) return { issueNumber: null, prevKeys: [] };
  try {
    const s = JSON.parse(readFileSync(file, "utf8"));
    return {
      issueNumber: typeof s.issueNumber === "number" ? s.issueNumber : null,
      prevKeys: Array.isArray(s.prevKeys) ? s.prevKeys.filter((k) => typeof k === "string") : [],
    };
  } catch {
    return { issueNumber: null, prevKeys: [] };
  }
}

export function saveState(file, state) {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(
    file,
    JSON.stringify({ issueNumber: state.issueNumber ?? null, prevKeys: state.prevKeys ?? [] }, null, 2),
  );
}
