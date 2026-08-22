import test from 'node:test';
import assert from 'node:assert/strict';
import { fadeSecondsFor, levelCurve } from '@/lib/audio/webaudio';

/**
 * Whether the last words of a track are audible is a property of this arithmetic. It is tested
 * here rather than by rendering audio, because a real five-minute meditation faded its entire
 * Return phase out — measured -25 dB against -9.5 dB at the start — and finding that took a
 * full generate-and-decode cycle each time.
 */

const db = (g: number) => 20 * Math.log10(g || 1e-12);
const at = (c: Float32Array, t: number, dur: number) =>
  c[Math.min(c.length - 1, Math.round((t / dur) * (c.length - 1)))];

test('an affirmation track descends and fades to silence', () => {
  const dur = 60 * 60;
  const c = levelCurve(dur, true, fadeSecondsFor(true));
  assert.ok(db(at(c, 60, dur)) > -0.1, 'flat through the first four minutes');
  assert.ok(db(at(c, 30 * 60, dur)) < -3, 'well down by halfway');
  assert.ok(c[c.length - 1] < 1e-6, 'ends in silence');
  // Never rises.
  for (let i = 1; i < c.length; i++) {
    assert.ok(c[i] <= c[i - 1] + 1e-9, `level rose at point ${i}`);
  }
});

test('a meditation stays flat and stays audible to the last word', () => {
  const dur = 5 * 60;
  const c = levelCurve(dur, false, fadeSecondsFor(false));
  // The Return phase is the last 15% — every second of it must be within a hair of full level.
  const returnStart = dur * 0.85;
  for (let t = returnStart; t < dur - 4; t += 1) {
    assert.ok(db(at(c, t, dur)) > -0.5, `Return faded at ${t.toFixed(0)}s: ${db(at(c, t, dur)).toFixed(1)} dB`);
  }
  // Only the final anti-click fade brings it down.
  assert.ok(c[c.length - 1] < 0.05, 'still ends cleanly rather than cutting off');
  assert.equal(fadeSecondsFor(false), 3);
});

test('a long meditation is flat too — the taper never starts', () => {
  const dur = 45 * 60;
  const c = levelCurve(dur, false, fadeSecondsFor(false));
  assert.ok(db(at(c, 40 * 60, dur)) > -0.5, 'still at level 40 minutes in');
});
