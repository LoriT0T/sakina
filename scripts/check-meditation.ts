/**
 * Prove the meditation path end to end without spending TTS quota.
 *
 *   GEMINI_API_KEY=... npx tsx scripts/check-meditation.ts [--minutes 10] [--technique breath]
 *
 * It runs the real writer against the live model, the real validator, and the real chunk and
 * timeline planners, then reports whether the plan actually fills the requested duration and
 * how much of it is silence. Speech is the one thing it does not generate — the assembler and
 * encoder are shared with the affirmation path and already measured.
 */
import { writeFile, mkdir } from 'node:fs/promises';
import { callInteractions, TEXT_MODEL, withRetry } from '@/lib/gemini/client';
import { extractText } from '@/lib/gemini/script';
import { buildMeditationPrompt, parseMeditationJson } from '@/lib/meditation/script';
import {
  buildMeditationTimeline,
  MEDITATION_ARC,
  MEDITATION_SECTIONS,
  planMeditationChunks,
  type Guidance,
} from '@/lib/meditation/plan';
import { hasWanderingPermission, validateMeditation } from '@/lib/meditation/validator';
import { formatDuration } from '@/lib/script/plan';
import type { Intake, MeditationTechnique, Script } from '@/lib/types';

function arg(name: string, fallback: string): string {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

async function main() {
  const minutes = Number(arg('minutes', '10'));
  const technique = arg('technique', 'breath') as MeditationTechnique;
  const guidance = arg('guidance', 'normal') as Guidance;
  const intake: Intake = { goals: [], note: undefined };

  console.log(`Writing a ${minutes}-minute ${technique} meditation (${guidance} guidance)…`);
  const t0 = Date.now();

  const phases = await Promise.all(
    MEDITATION_SECTIONS.map(async (section) => ({
      section,
      lines: parseMeditationJson(
        extractText(
          await withRetry(() =>
            callInteractions({
              model: TEXT_MODEL,
              input: buildMeditationPrompt(intake, minutes, section, technique, guidance),
            }),
          ),
        ),
        section,
      ),
    })),
  );

  let lines = MEDITATION_SECTIONS.flatMap(
    (s) => phases.find((p) => p.section === s)?.lines ?? [],
  );
  console.log(`  ${lines.length} lines in ${((Date.now() - t0) / 1000).toFixed(0)}s`);

  const issues = validateMeditation(lines);
  const errors = issues.filter((i) => i.severity === 'error');
  const warns = issues.filter((i) => i.severity === 'warn');
  console.log(`  validator: ${errors.length} errors, ${warns.length} warnings`);
  for (const e of errors.slice(0, 12)) console.log(`    ✗ ${e.rule}: "${e.match}"`);
  for (const w of warns.slice(0, 5)) console.log(`    · ${w.rule}: "${w.match}"`);

  const bad = new Set(errors.map((i) => i.lineId));
  lines = lines.filter((l) => !bad.has(l.id));

  console.log(`  wandering permission present: ${hasWanderingPermission(lines) ? 'yes' : 'NO'}`);
  const bySection = new Map<string, number>();
  for (const l of lines) bySection.set(l.section, (bySection.get(l.section) ?? 0) + 1);
  console.log(`  sections: ${[...bySection].map(([k, v]) => `${k}=${v}`).join(' ')}`);

  const script: Script = { lines, cycles: 1 };
  const chunks = planMeditationChunks(script, guidance);
  chunks.forEach((c, i) => (c.hashKey = `${c.section}:${i}`));
  const { plays, estimatedSec } = buildMeditationTimeline(chunks, minutes);

  // Speech is estimated from word count at the measured rate for this voice; the point is the
  // ratio, not a to-the-second prediction.
  const WPM = 96.4;
  const words = lines.reduce((a, l) => a + l.text.trim().split(/\s+/).length, 0);
  const speechSec = (words / WPM) * 60;
  const pauseSec = plays.reduce((a, p) => a + p.pauses.reduce((x, y) => x + y, 0), 0);

  console.log(`
════════ PLAN ════════
 target              ${formatDuration(minutes * 60)}
 timeline            ${formatDuration(estimatedSec)}   (${(estimatedSec - minutes * 60).toFixed(1)}s off)
 chunks              ${chunks.length}  (= TTS requests)
 words               ${words}
 estimated speech    ${formatDuration(speechSec)}
 planned silence     ${formatDuration(pauseSec)}
 silence share       ${((pauseSec / (minutes * 60)) * 100).toFixed(0)}%
 longest pause       ${Math.max(...plays.flatMap((p) => p.pauses)).toFixed(1)}s
 arc                 ${MEDITATION_ARC.map((s) => `${s.section} ${(s.share * 100).toFixed(0)}%`).join(', ')}
══════════════════════`);

  await mkdir('artifacts', { recursive: true });
  const out = `artifacts/meditation-${technique}-${minutes}min.json`;
  await writeFile(out, JSON.stringify({ settings: { minutes, technique, guidance }, script }, null, 2));
  console.log(`saved ${out}\n`);

  console.log('---- the script ----');
  for (const l of lines) console.log(`  [${l.section}] ${l.text}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
