type JsonObject = Record<string, unknown>;

const nullableString = (value: unknown): value is string | null => value === null || typeof value === "string";

function isExtractionObject(value: unknown): value is JsonObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const row = value as JsonObject;
  const requiredStrings = ["title", "description", "date", "startTime", "endTime", "venueName", "address", "category"];
  if (!requiredStrings.every(key => nullableString(row[key]))) return false;
  if (!Array.isArray(row.unresolvedFields) || !row.unresolvedFields.every(item => typeof item === "string")) return false;
  if (typeof row.notes !== "string") return false;
  if (row.occurrences !== undefined) {
    if (!Array.isArray(row.occurrences) || row.occurrences.length > 20) return false;
    for (const occurrence of row.occurrences) {
      if (!occurrence || typeof occurrence !== "object" || Array.isArray(occurrence)) return false;
      const item = occurrence as JsonObject;
      if (!["date", "endDate", "startTime", "endTime"].every(key => nullableString(item[key]))) return false;
    }
  }
  return true;
}

function jsonObjectsIn(text: string): unknown[] {
  const results: unknown[] = [];
  for (let start = 0; start < text.length; start++) {
    if (text[start] !== "{") continue;
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let i = start; i < text.length; i++) {
      const char = text[i];
      if (inString) {
        if (escaped) escaped = false;
        else if (char === "\\") escaped = true;
        else if (char === '"') inString = false;
        continue;
      }
      if (char === '"') inString = true;
      else if (char === "{") depth++;
      else if (char === "}" && --depth === 0) {
        try { results.push(JSON.parse(text.slice(start, i + 1)) as unknown); } catch { /* Keep scanning later candidates. */ }
        break;
      }
    }
  }
  return results;
}

/** Search all Claude text blocks from last to first for the final complete event object. */
export function parseClaudeExtraction(content: unknown): JsonObject | null {
  if (!Array.isArray(content)) return null;
  for (let blockIndex = content.length - 1; blockIndex >= 0; blockIndex--) {
    const block = content[blockIndex];
    if (!block || typeof block !== "object" || (block as { type?: unknown }).type !== "text") continue;
    const text = (block as { text?: unknown }).text;
    if (typeof text !== "string") continue;
    const candidates = jsonObjectsIn(text);
    for (let candidateIndex = candidates.length - 1; candidateIndex >= 0; candidateIndex--) {
      const candidate = candidates[candidateIndex];
      if (isExtractionObject(candidate)) return candidate;
    }
  }
  return null;
}
