import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, extname } from "node:path";

// Reads all *.md role files from rolesDir in sorted order and joins them.
function readRoles(rolesDir) {
  if (!existsSync(rolesDir)) return "";
  const files = readdirSync(rolesDir)
    .filter((f) => extname(f) === ".md")
    .sort();
  return files.map((f) => readFileSync(join(rolesDir, f), "utf8")).join("\n\n---\n\n");
}

// Reads the swarm review profile from the cloned target repo.
function readProfile(targetDir) {
  const profilePath = join(targetDir, ".ai", "swarm", "profile.md");
  if (!existsSync(profilePath)) return "";
  return readFileSync(profilePath, "utf8");
}

/**
 * Assembles a swarm-review prompt from role definitions and the target repo profile.
 *
 * @param {{ rolesDir: string, targetDir: string }} opts
 * @returns {{ prompt: string, bytes: number }}
 */
export function assemblePrompt({ rolesDir, targetDir }) {
  const rolesText = readRoles(rolesDir);
  const profileText = readProfile(targetDir);

  const sections = [];

  sections.push("# Swarm Review Prompt");
  sections.push("");
  sections.push(
    "You are running a multi-role swarm review. Apply each role in turn and emit " +
      "a single JSON verdict object that conforms to the typed-verdict schema."
  );

  if (rolesText) {
    sections.push("");
    sections.push("## Role Definitions");
    sections.push("");
    sections.push(rolesText);
  }

  if (profileText) {
    sections.push("");
    sections.push("## Target Repository Profile");
    sections.push("");
    sections.push(profileText);
  }

  sections.push("");
  sections.push(
    "## Instructions\n\n" +
      "1. Read the role definitions above.\n" +
      "2. Apply Scout, Risk, Tester, and Verdict roles to the repository state.\n" +
      "3. Emit a single JSON object as your final output. The object must have:\n" +
      "   role=verdict, result, decision_state, blocking, safe_to_commit, reason.\n" +
      "4. Never collapse an ambiguous state to ALLOW. Emit a typed HOLD instead.\n" +
      "5. Set safe_to_commit=true only when decision_state is ALLOW."
  );

  const prompt = sections.join("\n");
  const bytes = Buffer.byteLength(prompt, "utf8");
  return { prompt, bytes };
}
