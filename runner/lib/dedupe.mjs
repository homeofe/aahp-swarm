import { createHash } from "node:crypto";

export function findingKey(f) {
  const basis = JSON.stringify([f.file ?? "", f.rule ?? f.title ?? "", f.line ?? ""]);
  return createHash("sha256").update(basis).digest("hex").slice(0, 16);
}

export function diffFindings(prevKeys, current) {
  const prev = new Set(prevKeys);
  const currentKeys = current.map(findingKey);
  const curSet = new Set(currentKeys);
  const fresh = current.filter((f) => !prev.has(findingKey(f)));
  const resolvedKeys = [...prev].filter((k) => !curSet.has(k));
  return { fresh, resolvedKeys, currentKeys };
}
