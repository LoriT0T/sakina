import type { Intake, Line, MeditationTechnique, Section } from '@/lib/types';
import { meditationLineCounts, type Guidance } from './plan';

/**
 * Meditation writing.
 *
 * Built against docs/MEDITATION-DESIGN.md. The rules here are close to the inverse of the
 * affirmation rules — second person, body sensation central, silence over words — which is
 * why this is a separate writer rather than a mode of the other one.
 */

const TECHNIQUE_BRIEF: Record<MeditationTechnique, string> = {
  'body-scan': `TECHNIQUE: BODY SCAN — the best-evidenced practice of the set.
Move attention through the body in a clear order, one region at a time: feet, lower legs, knees,
thighs, hips, lower back, stomach, chest, upper back, shoulders, arms, hands, neck, jaw, face,
scalp. One region per instruction. Invite noticing whatever is there — warmth, weight, tightness,
numbness, nothing at all — and say explicitly that "nothing at all" is a perfectly good answer.
Never suggest a region should feel any particular way.`,

  breath: `TECHNIQUE: BREATH AWARENESS.
Settle attention at ONE place where the breath is felt — the nostrils, the chest, or the belly —
and have them pick which. Then it is the same instruction returned to many times: notice this
breath, and when the mind has wandered, notice that too and come back. Say clearly and more than
once that wandering is not failure and is what minds do. Do not count breaths for them and do not
tell them to change the breath.`,

  'letting-go': `TECHNIQUE: LETTING GO.
Work through the body releasing held tension, tying each release to an out-breath. Name a region,
invite them to notice any holding there, then let it go on the next out-breath. Move downward or
outward in a clear order. Acknowledge that some tension will not release and that this is fine —
noticing it is the whole instruction.`,

  'loving-kindness': `TECHNIQUE: LOVING-KINDNESS.
The traditional widening order, one stage at a time, with real time in each: themselves first,
then someone they love easily, then someone neutral they barely know, then someone difficult
(offered gently, and explicitly skippable), then everyone. Simple well-wishing phrases repeated
quietly. If a stage brings up resistance, say that resistance is allowed and they can stay with
the easier stage.`,

  gratitude: `TECHNIQUE: GRATITUDE.
Attention to specific things that are already here — not abstractions. Guide them to bring one
concrete thing to mind at a time and stay with it long enough to actually feel it, rather than
listing. Small and ordinary is better than large and worthy. Never imply they should feel
grateful, and never compare their situation to anyone else's.`,

  sleep: `TECHNIQUE: SLEEP.
A body scan that deliberately never returns. Move slowly through the body, downward, with
lengthening gaps and softening language. There is NO rousing close: no widening of attention, no
coming back to the room, no counting up. It simply thins out and stops. Say early that falling
asleep partway through is the point, not a failure.`,
};

const MEDITATION_RULES = `═══ HOW A GUIDED MEDITATION IS WRITTEN ═══

SECOND PERSON, present tense. "Notice…", "let…", "see if you can…". Never "I".

INVITE, NEVER COMMAND. This is the most important rule in the whole document.
  ✓ "See if you can notice…", "you might let…", "allow your shoulders to…", "if it feels okay…"
  ✗ "Clear your mind", "you must", "relax now", "stop thinking"
A wandering mind is normal. A listener who believes wandering is failure stops practising, so
say more than once, plainly, that the mind will wander and that noticing it IS the practice.

ONE INSTRUCTION PER SENTENCE. Short sentences. Then stop talking. The silence after a cue is
where the practice actually happens, and the commonest failure in guided meditation is filling
it. You are writing perhaps a third as many words as feels natural.

BODY SENSATION IS THE MATERIAL. Unlike every other kind of script in this app, naming physical
sensation is exactly right here: weight, warmth, contact, tightness, breath moving.

AN ANCHOR OUT, EARLY. Somewhere in the opening, offer an alternative for anyone who finds
attention on the body uncomfortable: eyes open, feet pressed into the floor, or attention on
sound instead. Offer it plainly, once, as a normal option and not as a warning.

═══ BANNED ═══
  • "Clear your mind", "empty your mind", "stop thinking", "don't think about" — unachievable.
  • Judgement: "properly", "correctly", "you should feel", "try harder", "failing".
  • Promised outcomes: "this will make you sleep", "your anxiety will disappear", "you will feel".
  • Any medical or therapeutic claim.
  • Mystical or metaphysical framing: energy, chakras, auras, the universe, vibrations.
  • First person. That is the affirmation voice and mixing them is disorienting.
  • Exclamation marks.
  • Telling anyone to stay with a sensation that is distressing them.`;

function contextBlock(intake: Intake): string {
  if (!intake.goals.length) return '';
  const g = intake.goals[0];
  const bits = [
    `They said they want to work on: ${g.text}`,
    g.why.trim() ? `Why it matters to them: ${g.why}` : '',
    g.obstacle.trim() ? `What is hard for them: ${g.obstacle}` : '',
  ].filter(Boolean);
  return `\n═══ WHO THIS IS FOR ═══\n${bits.join('\n')}\n\nLet this colour the choice of words and images very lightly. Do NOT turn the meditation into
coaching about their goal, do not give advice, and do not mention the goal directly more than
once. A meditation is not a pep talk.\n`;
}

const PHASE_BRIEF: Record<'arrival' | 'practice' | 'return', (n: number) => string> = {
  arrival: (n) => `Write ${n} ARRIVAL lines. Settling in: posture, letting the eyes close if that
feels okay, a few slower breaths, and permission to be here without doing it well. Include the
anchor out described above. Do not begin the technique yet.`,

  practice: (n) => `Write ${n} PRACTICE lines — the technique itself, following the brief above.
This is the body of the meditation. Move in a clear order, one instruction at a time, and leave
the listener alone between instructions. Return at least twice to the idea that a wandering mind
is normal and welcome.`,

  return: (n) => `Write ${n} RETURN lines. Widen attention back out — sounds in the room, the
weight of the body on the chair or bed, the light behind the eyelids. Hand control back
explicitly: "when you are ready", "in your own time", "there is no rush". End simply.`,
};

export function buildMeditationPrompt(
  intake: Intake,
  minutes: number,
  section: Section,
  technique: MeditationTechnique,
  guidance: Guidance = 'normal',
  lineCount?: number,
): string {
  const counts = meditationLineCounts(minutes, guidance);
  const phase = section as 'arrival' | 'practice' | 'return';
  const wanted = lineCount ?? counts[section] ?? 8;

  return `You are writing one phase of a ${minutes}-minute guided meditation, to be read aloud by a
single calm voice with long silences between the lines.

${TECHNIQUE_BRIEF[technique]}
${contextBlock(intake)}
${MEDITATION_RULES}

═══ YOUR TASK ═══

${PHASE_BRIEF[phase](wanted)}

Write exactly ${wanted} lines. Each line is ONE spoken instruction or observation, between four
and eighteen words. Remember that several seconds of silence follow every line.

Return ONLY a JSON object, no prose, no markdown fences:

{"lines":[{"text":"…","section":"${section}"}]}`;
}

/** Parse the writer's JSON into lines. Tolerant of fences and stray prose. */
export function parseMeditationJson(raw: string, section: Section): Line[] {
  let s = raw.trim();
  const fence = /```(?:json)?\s*([\s\S]*?)```/.exec(s);
  if (fence) s = fence[1].trim();
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start >= 0 && end > start) s = s.slice(start, end + 1);

  const parsed = JSON.parse(s) as { lines?: Array<{ text?: unknown }> };
  return (parsed.lines ?? [])
    .map((l, i): Line | null => {
      const text = typeof l.text === 'string' ? l.text.trim() : '';
      if (!text) return null;
      return {
        id: `m${i}_${Math.random().toString(36).slice(2, 8)}`,
        text,
        // Meditation lines carry no affirmation pattern; `sensory` is the closest honest label
        // and keeps the shared Line type intact.
        pattern: 'sensory',
        section,
        goalId: null,
      };
    })
    .filter((l): l is Line => l !== null);
}
