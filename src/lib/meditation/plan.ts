import type { Line, Script, Section } from '@/lib/types';
import { CHUNK_MAX_LINES, CHUNK_MAX_WORDS, CHUNK_TARGET_WORDS, SPEECH_WPM, type SectionSpec } from '@/lib/script/plan';

/**
 * Meditation timing.
 *
 * Deliberately separate from the affirmation planner rather than a shared abstraction, because
 * the two disagree about nearly everything: a meditation is linear (no cycling, no repetition
 * clusters), it has three phases rather than six, and its pauses are longer than its sentences.
 * See docs/MEDITATION-DESIGN.md.
 */

/** Three acts. Shares sum to 1. */
export const MEDITATION_ARC: SectionSpec[] = [
  {
    section: 'arrival',
    share: 0.15,
    pauseStart: 4,
    pauseEnd: 6,
    label: 'Arrival',
    purpose: 'Posture, settling, the first breaths. An anchor out, offered early.',
  },
  {
    section: 'practice',
    share: 0.7,
    pauseStart: 6,
    pauseEnd: 12,
    label: 'Practice',
    purpose: 'The technique itself. Gaps widen as attention settles.',
  },
  {
    section: 'return',
    share: 0.15,
    pauseStart: 5,
    pauseEnd: 3,
    label: 'Return',
    purpose: 'Widening attention, back to the room, control handed back.',
  },
];

export const MEDITATION_SPEC = new Map(MEDITATION_ARC.map((s) => [s.section, s]));
export const MEDITATION_SECTIONS: Section[] = ['arrival', 'practice', 'return'];

/**
 * A line that asks the listener to *move attention or notice something* needs far more silence
 * after it than a line that merely orients them — they cannot comply while being talked at.
 * The practitioner sources put an ordinary cue at 3–5 s and an action cue at 10–15 s.
 */
const ACTION_CUE =
  /\b(notice|feel|bring your attention|move your attention|let your attention|scan|soften|release|allow|rest your attention|breathe into|sense|observe|see if you can)\b/i;

export function isActionCue(text: string): boolean {
  return ACTION_CUE.test(text);
}

export const GUIDANCE_MULTIPLIER = { close: 0.65, normal: 1, spacious: 1.5 } as const;
export type Guidance = keyof typeof GUIDANCE_MULTIPLIER;

/**
 * The longest a single silence may run, per guidance setting.
 *
 * Silence is the practice, so it is allowed to be long — but not unbounded. Filling a short
 * meditation's time budget by scaling every gap put two thirty-second silences back to back in
 * a five-minute sit, measured as a full minute of digital silence with no bed under it. On a
 * phone that reads as the audio having stopped.
 *
 * Anything the cap leaves unspent becomes one deliberate silent stretch at the end of the
 * practice phase, which is what a real sit does anyway: the guidance thins out and then leaves
 * you to it.
 */
const MAX_PAUSE_SEC = { close: 12, normal: 20, spacious: 45 } as const;

/** And a ceiling on that closing stretch, so it is a silent sit rather than an abandonment. */
const MAX_SILENT_SIT_SEC = 90;

export function meditationPause(
  section: Section,
  t: number,
  line: Line,
  guidance: Guidance = 'normal',
): number {
  const spec = MEDITATION_SPEC.get(section);
  const base = spec
    ? spec.pauseStart + (spec.pauseEnd - spec.pauseStart) * Math.min(1, Math.max(0, t))
    : 5;
  // An action cue roughly doubles the gap; the ceiling is the practitioner convention of
  // 10–15 seconds, and deep in the practice phase that is allowed to run longer still.
  const factor = isActionCue(line.text) ? 2 : 1;
  return base * factor * GUIDANCE_MULTIPLIER[guidance];
}

export function meditationSpeechSeconds(text: string): number {
  return (text.trim().split(/\s+/).filter(Boolean).length / SPEECH_WPM) * 60;
}

/**
 * How many lines each phase needs.
 *
 * Derived from the pause schedule rather than the other way round — the silence is the
 * practice, so it gets budgeted first and the words fill what is left. This is the direct
 * countermeasure to the failure the sources name most often: talking too much.
 */
export function meditationLineCounts(minutes: number, guidance: Guidance = 'normal'): Record<string, number> {
  const out: Record<string, number> = {};
  for (const spec of MEDITATION_ARC) {
    const budget = spec.share * minutes * 60;
    const avgPause = ((spec.pauseStart + spec.pauseEnd) / 2) * 1.4 * GUIDANCE_MULTIPLIER[guidance];
    const avgSpeech = (11 / SPEECH_WPM) * 60;
    out[spec.section] = Math.max(2, Math.round(budget / (avgSpeech + avgPause)));
  }
  return out;
}

export interface MeditationChunk {
  index: number;
  hashKey: string;
  section: Section;
  lines: Line[];
  text: string;
  pauses: number[];
}

export function planMeditationChunks(script: Script, guidance: Guidance = 'normal'): MeditationChunk[] {
  const chunks: MeditationChunk[] = [];

  for (const section of MEDITATION_SECTIONS) {
    const group = script.lines.filter((l) => l.section === section);
    if (group.length === 0) continue;

    let current: Line[] = [];
    let pauses: number[] = [];
    let words = 0;

    const flush = () => {
      if (!current.length) return;
      chunks.push({
        index: chunks.length,
        hashKey: '',
        section,
        lines: current,
        text: current.map((l) => l.text).join('\n\n'),
        pauses,
      });
      current = [];
      pauses = [];
      words = 0;
    };

    group.forEach((line, i) => {
      const w = line.text.trim().split(/\s+/).length;
      if (
        current.length > 0 &&
        (words + w > CHUNK_MAX_WORDS ||
          current.length >= CHUNK_MAX_LINES ||
          (words >= CHUNK_TARGET_WORDS && current.length >= 4))
      ) {
        flush();
      }
      current.push(line);
      pauses.push(meditationPause(section, group.length > 1 ? i / (group.length - 1) : 0, line, guidance));
      words += w;
    });
    flush();
  }
  return chunks;
}

export interface MeditationPlay {
  chunk: MeditationChunk;
  pauses: number[];
  /**
   * Always 0. Meditations never repeat — a looped practice would be a different one. The field
   * exists only so a play is structurally the same shape the shared assembler expects.
   */
  cycle: number;
}

/**
 * Lay the chunks out and scale each phase's silence so the track lands on its target length.
 * Nothing repeats — a meditation that looped would be a different practice.
 */
export function buildMeditationTimeline(
  chunks: MeditationChunk[],
  minutes: number,
  guidance: Guidance = 'normal',
): { plays: MeditationPlay[]; estimatedSec: number } {
  const plays: MeditationPlay[] = [];
  const maxPause = MAX_PAUSE_SEC[guidance];
  let unspent = 0;

  for (const spec of MEDITATION_ARC) {
    const inSection = chunks.filter((c) => c.section === spec.section);
    if (!inSection.length) continue;

    const speech = inSection.reduce(
      (a, c) => a + c.lines.reduce((x, l) => x + meditationSpeechSeconds(l.text), 0),
      0,
    );
    const nominal = inSection.reduce((a, c) => a + c.pauses.reduce((x, y) => x + y, 0), 0);
    const budget = spec.share * minutes * 60;
    // Wide bounds: silence genuinely is the material here, so stretching it is legitimate in
    // a way it is not for affirmations.
    const scale = nominal > 0 ? Math.min(3, Math.max(0.5, (budget - speech) / nominal)) : 1;

    for (const chunk of inSection) {
      const pauses = chunk.pauses.map((p) => {
        const wanted = p * scale;
        const given = Math.min(wanted, maxPause);
        unspent += wanted - given;
        return given;
      });
      plays.push({ chunk, pauses, cycle: 0 });
    }
  }

  // Hand the capped-off time back as one silent stretch at the end of the practice phase.
  if (unspent > 1) {
    const lastPractice = plays.map((p) => p.chunk.section).lastIndexOf('practice');
    const target = lastPractice >= 0 ? plays[lastPractice] : plays[plays.length - 1];
    if (target && target.pauses.length > 0) {
      const i = target.pauses.length - 1;
      const room = Math.max(0, MAX_SILENT_SIT_SEC - target.pauses[i]);
      target.pauses[i] += Math.min(unspent, room);
    }
  }

  const estimatedSec = plays.reduce(
    (a, p) =>
      a +
      p.chunk.lines.reduce((x, l) => x + meditationSpeechSeconds(l.text), 0) +
      p.pauses.reduce((x, y) => x + y, 0),
    0,
  );
  return { plays, estimatedSec };
}
