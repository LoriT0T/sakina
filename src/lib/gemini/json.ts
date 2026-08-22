/**
 * Reading a model's JSON when the model does not finish it.
 *
 * A long phase can hit the output limit mid-object, and `JSON.parse` on a truncated array
 * throws — which threw away every complete line that came before the cut too. Measured on a
 * ten-minute breath meditation: the practice phase returned fourteen well-formed lines and one
 * half-written fifteenth, and the whole phase was lost.
 *
 * So parsing happens twice. Strict first, because a complete response should be read exactly
 * as written. If that fails, the objects inside the `lines` array are walked one at a time and
 * every complete one is kept. Fourteen lines is a usable meditation; zero is not.
 */

/** Strip a code fence and trim to the outermost braces. */
function unwrap(raw: string): string {
  let s = raw.trim();
  const fence = /```(?:json)?\s*([\s\S]*?)```/.exec(s);
  if (fence) s = fence[1].trim();
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start >= 0 && end > start) s = s.slice(start, end + 1);
  return s;
}

/**
 * Walk the text collecting balanced top-level `{...}` objects, respecting string literals and
 * escapes so a brace inside a quoted line does not throw the depth off. Anything left open at
 * the end of the input is the truncated tail, and is dropped.
 */
function salvageObjects(s: string): Array<Record<string, unknown>> {
  const out: Array<Record<string, unknown>> = [];
  let depth = 0;
  let startAt = -1;
  let inString = false;
  let escaped = false;

  // Start after "lines" if it is present, so a wrapper object is not itself collected.
  const linesAt = s.indexOf('"lines"');
  const from = linesAt >= 0 ? s.indexOf('[', linesAt) + 1 : 0;
  if (from <= 0 && linesAt >= 0) return out;

  for (let i = Math.max(0, from); i < s.length; i++) {
    const c = s[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') {
      inString = true;
    } else if (c === '{') {
      if (depth === 0) startAt = i;
      depth++;
    } else if (c === '}') {
      depth--;
      if (depth === 0 && startAt >= 0) {
        try {
          out.push(JSON.parse(s.slice(startAt, i + 1)) as Record<string, unknown>);
        } catch {
          // A malformed object in the middle is skipped rather than ending the walk.
        }
        startAt = -1;
      }
    } else if (c === ']' && depth === 0) {
      break;
    }
  }
  return out;
}

/**
 * The `lines` array from a model response, tolerant of truncation.
 *
 * Returns an empty array rather than throwing when there is genuinely nothing to read — the
 * callers all treat "no lines" as a failure with a better message than a SyntaxError.
 */
export function readLines(raw: string): Array<Record<string, unknown>> {
  const s = unwrap(raw);
  try {
    const parsed = JSON.parse(s) as { lines?: Array<Record<string, unknown>> };
    if (Array.isArray(parsed.lines)) return parsed.lines;
  } catch {
    // Fall through to salvage.
  }
  return salvageObjects(s);
}
