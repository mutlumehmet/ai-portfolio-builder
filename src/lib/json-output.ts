// Models behind OpenAI-compatible APIs do not all honour response_format, so
// a JSON answer can arrive wrapped in a code fence or with a sentence around
// it. This takes the first complete JSON object out of the text. The caller
// still validates it with zod.

export class JsonOutputError extends Error {}

export function parseJsonObject(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    // fall through to the defensive path
  }
  const fenced = trimmed.match(/```(?:json|JSON)?\s*\n?([\s\S]*?)```/);
  const body = fenced ? fenced[1] : trimmed;
  const start = body.indexOf("{");
  if (start === -1) throw new JsonOutputError("The model's answer had no JSON object.");

  let depth = 0;
  let inString = false;
  for (let i = start; i < body.length; i++) {
    const c = body[i];
    if (inString) {
      if (c === "\\") i++;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') inString = true;
    else if (c === "{") depth++;
    else if (c === "}" && --depth === 0) {
      try {
        return JSON.parse(body.slice(start, i + 1));
      } catch {
        throw new JsonOutputError("The model's answer had malformed JSON.");
      }
    }
  }
  throw new JsonOutputError("The model's answer had an unfinished JSON object.");
}
