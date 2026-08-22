import type { Line, ValidationIssue } from '@/lib/types';

/**
 * Meditation line validator.
 *
 * A completely separate ruleset from the affirmation one. Every rule the affirmation validator
 * enforces would reject a competent body scan — it bans body sensation and second person, which
 * are the two things a meditation is made of. See docs/MEDITATION-DESIGN.md section 1.
 */

interface Rule {
  id: string;
  severity: 'error' | 'warn';
  why: string;
  test: (line: Line) => string | null;
}

function firstMatch(text: string, patterns: RegExp): string | null {
  const m = patterns.exec(text);
  return m ? m[0] : null;
}

/** Anything that turns an instruction into an offer. One of these anywhere clears a line. */
const SOFTENER =
  /\b(see if you can|you might|allow|allowing|if it feels|if that feels|when you are ready|perhaps|you can|maybe|invite|inviting|there is no|no need to)\b/i;

/** Sentences that open with one of these are orders rather than offers. */
const HARD_COMMAND =
  /^(breathe|hold|relax|focus|clear|stop|keep|push|force|sit up|straighten|do it|make sure|concentrate)\b/i;

export const MEDITATION_RULES: Rule[] = [
  {
    id: 'unachievable-instruction',
    severity: 'error',
    why: 'design §6 — nobody can empty their mind on command. The instruction sets up a failure the listener then blames themselves for, and it is the single most criticised line in the genre.',
    test: (l) =>
      firstMatch(
        l.text,
        /\b(clear your mind|empty your mind|stop thinking|don'?t think|blank your mind|no thoughts)\b/i,
      ),
  },
  {
    id: 'commanding',
    severity: 'error',
    why: 'design §6 — guidance is invitational. A bare command leaves someone who cannot comply with nowhere to go; "see if you can" leaves the door open.',
    test: (l) => {
      if (SOFTENER.test(l.text)) return null;
      // A bare imperative standing alone: "Relax." / "Let go."
      const alone = firstMatch(l.text, /^(relax|calm down|let go|breathe deeply|clear|focus)\b[.!]?$/i);
      if (alone) return alone;
      // Or two or more hard commands stacked into one line with nothing softening any of
      // them. A single "Notice the breath." is ordinary guidance and stays allowed; "Breathe
      // in now. Hold it. Do it properly." is being ordered about.
      const commands = l.text
        .split(/(?<=[.?])\s+/)
        .map((s) => s.trim())
        .filter((s) => HARD_COMMAND.test(s));
      return commands.length >= 2 ? commands.slice(0, 2).join(' ') : null;
    },
  },
  {
    id: 'judgemental',
    severity: 'error',
    why: 'design §6 — there is no correct way to be doing this, and implying one turns a wandering mind into a failure.',
    test: (l) =>
      firstMatch(l.text, /\b(properly|correctly|the right way|you should (feel|be)|try harder|failing|doing (it|this|that) wrong)\b/i),
  },
  {
    id: 'promised-outcome',
    severity: 'error',
    why: 'design §7 — promising a result is a claim the practice cannot keep, and for a listener it does not work on, it reads as another personal failure.',
    test: (l) =>
      firstMatch(
        l.text,
        /\b(will (make you|help you|cure|heal|fix)|you will (feel|be|become|find|sleep|fall asleep)|your (anxiety|stress|worry|pain) will|guaranteed|this will (stop|end))\b/i,
      ),
  },
  {
    id: 'medical-claim',
    severity: 'error',
    why: 'design §7 — this is not treatment and must never present itself as treatment.',
    test: (l) => firstMatch(l.text, /\b(cure|treat|diagnos\w*|therapy|therapeutic|medication|symptoms? will)\b/i),
  },
  {
    id: 'mystical',
    severity: 'error',
    why: 'consistent with the rest of the app — no metaphysical framing.',
    test: (l) =>
      firstMatch(l.text, /\b(chakra\w*|aura|the universe|vibration\w*|energy field|life force|third eye|cosmic)\b/i),
  },
  {
    id: 'first-person',
    severity: 'error',
    why: 'design §6 — a meditation is spoken to the listener. First person is the affirmation voice, and mixing the two is disorienting.',
    test: (l) => firstMatch(l.text, /\b(I am|I'm|I have|I can|my own)\b/),
  },
  {
    id: 'exclamation',
    severity: 'error',
    why: 'no hype anywhere in this app.',
    test: (l) => (l.text.includes('!') ? '!' : null),
  },
  {
    id: 'distress-instruction',
    severity: 'error',
    why: 'design §7 — for some people interoceptive focus increases distress. Never instruct anyone to stay with something painful.',
    test: (l) =>
      firstMatch(
        l.text,
        /\b(stay with (the |it|that)?(pain|discomfort|distress|panic|anxiety|fear|grief|ache)|push through|don'?t avoid|force yourself|do not move)\b/i,
      ),
  },
  {
    id: 'too-long',
    severity: 'warn',
    why: 'design §4 — one instruction per sentence. A long line is usually two cues that should each have had silence after them.',
    test: (l) => {
      const n = l.text.trim().split(/\s+/).length;
      return n > 22 ? `${n} words` : null;
    },
  },
];

export function validateMeditationLine(line: Line): ValidationIssue[] {
  const out: ValidationIssue[] = [];
  for (const rule of MEDITATION_RULES) {
    const match = rule.test(line);
    if (match) {
      out.push({ lineId: line.id, rule: rule.id, severity: rule.severity, message: rule.why, match });
    }
  }
  return out;
}

export function validateMeditation(lines: Line[]): ValidationIssue[] {
  return lines.flatMap(validateMeditationLine);
}

/**
 * Does the track ever tell the listener that a wandering mind is fine?
 *
 * Checked at script level rather than per line, because it is a property of the whole
 * meditation. The sources are unanimous that its absence is what makes people quit.
 */
export function hasWanderingPermission(lines: Line[]): boolean {
  return lines.some((l) =>
    /\b(wander\w*|drift\w*|distract\w*|thoughts? come|mind goes|notice that too|come back|return your attention)\b/i.test(
      l.text,
    ),
  );
}
