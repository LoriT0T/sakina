'use client';

import { asset } from '@/lib/paths';

/**
 * Finished tracks that ship with the app.
 *
 * These are real output, not demos: written from a real intake, spoken by the real voice,
 * assembled by the real pipeline, with the measured numbers each one actually hit. They
 * exist so the app is worth opening before you have generated anything, and so you can hear
 * what an hour of it is like without spending an API call.
 *
 * They stream from their URL rather than being copied into IndexedDB. Copying megabytes of
 * audio into every visitor's storage to show them a sample would be rude, and the browser
 * caches the file anyway once it has been played.
 *
 * Only one ships. The earlier ten- and fifteen-minute tracks were written in the process
 * style, with the body-scan and scene-setting lines this app no longer produces, so keeping
 * them would have been advertising output the app will not make. There is no meditation
 * example for a duller reason: the assembler runs in the browser, and there is no honest way
 * to commit a file it produced without duplicating it in the command-line renderer — which is
 * exactly the divergence that caused the descent definition to drift once already.
 */

export interface ExampleTrack {
  id: string;
  name: string;
  file: string;
  mime: string;
  durationSec: number;
  bytes: number;
  /** What the track is about, in the listener's own words. */
  goals: string[];
  /** Measured on the finished file. */
  lufs: number;
  truePeakDb: number;
  voice: string;
  madeAt: string;
}

export const EXAMPLES: ExampleTrack[] = [
  {
    id: 'dream-5min',
    name: 'Four times a week — affirmations only, each said two or three times',
    file: 'dream-5min.m4a',
    mime: 'audio/mp4',
    durationSec: 300.0,
    bytes: 1221509,
    goals: [
      'Four times a week, already normal',
      'Strength I can feel, and numbers that move',
      'The bike, the freedom, money I earned',
    ],
    lufs: -25.1,
    truePeakDb: -3.5,
    voice: 'Sulafat',
    madeAt: '2026-08-12',
  },
];

export function exampleUrl(track: ExampleTrack): string {
  return asset(`/examples/${track.file}`);
}

export function findExample(id: string): ExampleTrack | undefined {
  return EXAMPLES.find((e) => e.id === id);
}
