'use client';

import { getCachedChunk, putCachedChunk } from '@/lib/db';
import { generateText, speakChunk as speakDirect } from '@/lib/gemini/browser';
import { assembleInBrowser, type ChunkPcm } from '@/lib/audio/webaudio';
import { encodeMp3 } from '@/lib/audio/mp3';
import { buildMeditationPrompt, parseMeditationJson } from '@/lib/meditation/script';
import {
  buildMeditationTimeline,
  MEDITATION_ARC,
  MEDITATION_SECTIONS,
  planMeditationChunks,
  type Guidance,
} from '@/lib/meditation/plan';
import { hasWanderingPermission, validateMeditation } from '@/lib/meditation/validator';
import type { Intake, Line, MeditationTechnique, Measurement, Script, TrackSettings } from '@/lib/types';

/**
 * Meditation generation, entirely in the browser — same transport and same assembler as the
 * affirmation path, but its own writer, its own validator and its own timeline.
 */

export interface MeditationProgress {
  phase: 'write' | 'speak' | 'assemble' | 'encode' | 'done';
  message: string;
  fraction: number;
}

export async function writeMeditation(
  intake: Intake,
  minutes: number,
  technique: MeditationTechnique,
  guidance: Guidance,
  onProgress: (message: string) => void,
): Promise<Script> {
  onProgress('Writing the meditation...');
  let done = 0;

  const phases = await Promise.all(
    MEDITATION_SECTIONS.map(async (section) => {
      const raw = await generateText(
        buildMeditationPrompt(intake, minutes, section, technique, guidance),
      );
      done++;
      onProgress(`Writing - ${done} of ${MEDITATION_SECTIONS.length} phases`);
      return { section, lines: parseMeditationJson(raw, section) };
    }),
  );

  let lines = MEDITATION_SECTIONS.flatMap(
    (s) => phases.find((p) => p.section === s)?.lines ?? [],
  );

  // Drop anything that breaks a rule. Unlike affirmations there is no repair pass: a
  // meditation line is one instruction among many, so losing a few is harmless, whereas
  // shipping "clear your mind" is not.
  const bad = new Set(
    validateMeditation(lines)
      .filter((i) => i.severity === 'error')
      .map((i) => i.lineId),
  );
  lines = lines.filter((l) => !bad.has(l.id));

  // A meditation that never says wandering is normal is the one people quit. If the writer
  // left it out, add it rather than regenerate the whole thing.
  if (!hasWanderingPermission(lines) && lines.length > 4) {
    const practiceIndex = lines.findIndex((l) => l.section === 'practice');
    const insertAt = practiceIndex >= 0 ? practiceIndex + 2 : Math.floor(lines.length / 2);
    const reassurance: Line = {
      id: `m_wander_${Math.random().toString(36).slice(2, 8)}`,
      text: 'If your mind has wandered, that is not a mistake. Noticing it is the practice.',
      pattern: 'sensory',
      section: 'practice',
      goalId: null,
    };
    lines = [...lines.slice(0, insertAt), reassurance, ...lines.slice(insertAt)];
  }

  if (lines.length === 0) throw new Error('The writer returned nothing usable.');
  return { lines, cycles: 1 };
}

export interface MeditationResult {
  blob: Blob;
  mime: string;
  measurement: Measurement;
  durationSec: number;
  cachedCount: number;
}

const CONCURRENCY = 3;

async function chunkKey(section: string, text: string, voice: string): Promise<string> {
  const data = new TextEncoder().encode(`${voice} ${section} ${text}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function generateMeditation(
  script: Script,
  settings: TrackSettings,
  onProgress: (p: MeditationProgress) => void,
): Promise<MeditationResult> {
  const guidance = (settings.guidance ?? 'normal') as Guidance;
  onProgress({ phase: 'speak', message: 'Planning...', fraction: 0 });

  const chunks = planMeditationChunks(script, guidance);
  chunks.forEach((c, i) => (c.hashKey = `${c.section}:${i}`));
  const { plays } = buildMeditationTimeline(chunks, settings.minutes, guidance);

  const audio = new Map<string, ChunkPcm>();
  let done = 0;
  let cached = 0;
  const queue = [...chunks];

  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
      for (;;) {
        const chunk = queue.shift();
        if (!chunk) return;
        const key = await chunkKey(chunk.section, chunk.text, settings.voice);
        let pcm = await getCachedChunk(key).catch(() => null);
        if (!pcm) {
          /* Same retry discipline as the affirmation path: transient errors
             back off (honouring the API's own retry hint), permanent ones
             surface. Without this, one 429 mid-generation killed the whole
             meditation — at bedtime. */
          pcm = await (async function attempt(n: number): Promise<Int16Array> {
            try {
              return await speakDirect(chunk.section, chunk.text, settings.voice, {});
            } catch (e) {
              const msg = (e as Error).message ?? '';
              const permanent =
                /API key|api_key|not set|PERMISSION|content_blocked|policy/i.test(msg) || n >= 3;
              if (permanent) throw e;
              const hinted = /retry in ([0-9.]+)s/i.exec(msg);
              const waitMs = hinted ? (Number(hinted[1]) + 1) * 1000 : 1500 * 2 ** n;
              await new Promise((r) => setTimeout(r, waitMs));
              return attempt(n + 1);
            }
          })(0);
          await putCachedChunk(key, pcm).catch(() => {});
        } else {
          cached++;
        }
        audio.set(chunk.hashKey, { hashKey: chunk.hashKey, pcm, lineCount: chunk.lines.length });
        done++;
        onProgress({
          phase: 'speak',
          message: `Speaking - ${done} of ${chunks.length} passages`,
          fraction: (done / chunks.length) * 0.75,
        });
      }
    }),
  );

  const assembled = await assembleInBrowser({
    plays,
    audio,
    settings,
    arc: MEDITATION_ARC,
    // A meditation is listened to awake and has to stay audible to the last word. The
    // exception is the sleep technique, whose whole point is that you do not hear the end.
    descend: settings.technique === 'sleep',
    onProgress: (message) => onProgress({ phase: 'assemble', message, fraction: 0.8 }),
  });

  const { blob, mime } = await encodeMp3(assembled.samples, assembled.sampleRate, (f) =>
    onProgress({ phase: 'encode', message: 'Encoding...', fraction: 0.85 + f * 0.15 }),
  );

  onProgress({ phase: 'done', message: 'Ready', fraction: 1 });
  return {
    blob,
    mime,
    measurement: assembled.measurement,
    durationSec: assembled.measurement.durationSec,
    cachedCount: cached,
  };
}
