import test from 'node:test';
import assert from 'node:assert/strict';
import { validateMeditation, validateMeditationLine, hasWanderingPermission } from '@/lib/meditation/validator';
import { meditationLineCounts, MEDITATION_ARC } from '@/lib/meditation/plan';
import type { Line, Section } from '@/lib/types';

/**
 * The meditation ruleset is nearly the inverse of the affirmation one — second person is
 * required here and banned there, body sensation is required here and banned there — so it
 * gets its own tests rather than sharing a fixture. What both share is the set of rules about
 * harm rather than taste: no promised outcomes, no medical claims, no telling someone in
 * distress to stay with it.
 */

let n = 0;
const line = (text: string, section: Section = 'practice'): Line => ({
  id: `m${n++}`,
  text,
  pattern: 'sensory',
  section,
  goalId: null,
});

const rules = (text: string) => validateMeditationLine(line(text)).map((i) => i.rule);

test('rejects the instruction nobody can follow', () => {
  assert.ok(rules('Clear your mind of all thoughts.').includes('unachievable-instruction'));
  assert.ok(rules('Empty your mind completely.').includes('unachievable-instruction'));
  assert.ok(rules('Stop thinking now.').includes('unachievable-instruction'));
});

test('rejects promised outcomes and medical claims', () => {
  assert.ok(rules('You will feel completely calm after this.').includes('promised-outcome'));
  assert.ok(rules('This will cure your anxiety.').includes('medical-claim'));
});

test('rejects commanding and judgemental wording', () => {
  assert.ok(rules('Breathe in now. Hold it. Do it properly.').includes('commanding'));
  assert.ok(rules('You are doing this wrong.').includes('judgemental'));
});

test('rejects telling someone in distress to stay with it', () => {
  assert.ok(
    rules('If you feel panic rising, stay with the panic and do not move.').includes(
      'distress-instruction',
    ),
  );
});

test('rejects first person — a meditation is not spoken as the listener', () => {
  assert.ok(rules('I am calm and centred.').includes('first-person'));
});

test('accepts ordinary, well-formed guidance', () => {
  const good = [
    'Let your eyes close, if that feels right.',
    'Notice where the breath is easiest to feel.',
    'When you notice the mind has wandered, that is the practice working.',
    'See if you can let the shoulders be a little heavier.',
    'There is nothing to get right here.',
  ];
  for (const t of good) {
    const issues = validateMeditationLine(line(t)).filter((i) => i.severity === 'error');
    assert.equal(issues.length, 0, `${t} — ${issues.map((i) => i.rule).join(', ')}`);
  }
});

test('notices when nothing gives permission to wander', () => {
  const silent = [line('Notice the breath.'), line('Let the shoulders drop.')];
  assert.equal(hasWanderingPermission(silent), false);
  assert.equal(
    hasWanderingPermission([...silent, line('If your mind wanders, that is not a mistake.')]),
    true,
  );
});

test('validateMeditation walks every line', () => {
  const issues = validateMeditation([line('Clear your mind.'), line('Notice the breath.')]);
  assert.equal(issues.filter((i) => i.severity === 'error').length, 1);
});

/**
 * The property that matters most about the plan: silence is budgeted first and the words are
 * fitted into what is left. If a longer meditation ever produced proportionally more words per
 * minute, the silence would be getting squeezed out by the guidance.
 */
test('longer meditations do not get proportionally wordier', () => {
  const perMinute = (minutes: number) => {
    const counts = meditationLineCounts(minutes, 'normal');
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    return total / minutes;
  };
  assert.ok(perMinute(30) <= perMinute(10) + 0.01, 'a 30-minute sit should not be denser than a 10');
});

test('the arc has no fade section — a meditation is spoken to the end', () => {
  assert.equal(MEDITATION_ARC.some((s) => s.section === 'fade'), false);
  assert.equal(Math.abs(MEDITATION_ARC.reduce((a, s) => a + s.share, 0) - 1) < 1e-9, true);
});

/**
 * Truncation salvage. The model hit its output limit mid-object on a real ten-minute practice
 * phase, and JSON.parse threw away the fourteen complete lines that came before the cut.
 */
test('a truncated response keeps the lines that did arrive', async () => {
  const { readLines } = await import('@/lib/gemini/json');
  const truncated = `{"lines":[
    {"text":"Settle into a posture that feels steady."},
    {"text":"Let the eyes close, if that feels right."},
    {"text":"Notice where the brea`;
  const got = readLines(truncated);
  assert.equal(got.length, 2);
  assert.equal(got[1].text, 'Let the eyes close, if that feels right.');
});

test('salvage is not used when the JSON is complete', async () => {
  const { readLines } = await import('@/lib/gemini/json');
  const whole = '```json\n{"lines":[{"text":"One."},{"text":"Two."},{"text":"Three."}]}\n```';
  assert.deepEqual(readLines(whole).map((l) => l.text), ['One.', 'Two.', 'Three.']);
});

test('a brace inside a line does not confuse the walk', async () => {
  const { readLines } = await import('@/lib/gemini/json');
  const tricky = '{"lines":[{"text":"A line with a } brace and a \\" quote."},{"text":"Next.';
  const got = readLines(tricky);
  assert.equal(got.length, 1);
  assert.equal(got[0].text, 'A line with a } brace and a " quote.');
});

/**
 * Silence is the practice, but it is not unbounded. Filling a short meditation's budget by
 * scaling every gap put two thirty-second silences back to back in a five-minute sit — a full
 * minute of digital silence with no bed under it, which reads as the audio having stopped.
 */
test('no single silence runs past the cap for its guidance setting', async () => {
  const { planMeditationChunks, buildMeditationTimeline } = await import('@/lib/meditation/plan');
  const lines: Line[] = [
    ...Array.from({ length: 3 }, (_, i) => line(`Arrival line ${i}.`, 'arrival')),
    ...Array.from({ length: 6 }, (_, i) => line(`Notice the breath, ${i}.`, 'practice')),
    ...Array.from({ length: 3 }, (_, i) => line(`Return line ${i}.`, 'return')),
  ];
  for (const [guidance, cap] of [['close', 12], ['normal', 20], ['spacious', 45]] as const) {
    const chunks = planMeditationChunks({ lines, cycles: 1 }, guidance);
    chunks.forEach((c, i) => (c.hashKey = `${c.section}:${i}`));
    const { plays } = buildMeditationTimeline(chunks, 5, guidance);
    const all = plays.flatMap((p) => p.pauses);
    // The one deliberate exception is the closing silent sit, which absorbs what the cap
    // leaves unspent and has its own ceiling.
    const overCap = all.filter((p) => p > cap + 0.01);
    assert.ok(overCap.length <= 1, `${guidance}: ${overCap.length} pauses over ${cap}s`);
    assert.ok(Math.max(...all) <= 90.01, `${guidance}: longest ${Math.max(...all)}s`);
  }
});
