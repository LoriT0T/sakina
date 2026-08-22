import test from 'node:test';
import assert from 'node:assert/strict';
import { findSpeechRegions } from '@/lib/audio/webaudio';

/**
 * The splitter is what turns one spoken chunk back into its lines so the pause schedule can be
 * laid over it. When it miscounts, the assembler now keeps the boundaries it did find rather
 * than collapsing the chunk to a single blob — the collapse put four planned twenty-second
 * pauses on top of each other as one 78-second silence in a five-minute meditation.
 */

const FS = 24000;

/** Speech-ish: a burst of noise. Silence: zeros. */
function build(segments: Array<{ speechSec: number; gapSec: number }>): Float32Array {
  const total = segments.reduce((a, s) => a + s.speechSec + s.gapSec, 0);
  const out = new Float32Array(Math.round(total * FS));
  let i = 0;
  for (const s of segments) {
    for (let n = 0; n < Math.round(s.speechSec * FS); n++, i++) {
      out[i] = (Math.random() * 2 - 1) * 0.3;
    }
    i += Math.round(s.gapSec * FS);
  }
  return out;
}

test('finds one region per spoken passage', () => {
  const audio = build([
    { speechSec: 1.5, gapSec: 0.8 },
    { speechSec: 1.2, gapSec: 0.8 },
    { speechSec: 1.8, gapSec: 0.8 },
  ]);
  assert.equal(findSpeechRegions(audio, FS).length, 3);
});

test('two lines run together come back as fewer regions, not zero', () => {
  // The model reads two lines with no real gap between them: four passages, one seam missing.
  const audio = build([
    { speechSec: 1.4, gapSec: 0.8 },
    { speechSec: 2.6, gapSec: 0.05 },
    { speechSec: 1.1, gapSec: 0.8 },
    { speechSec: 1.3, gapSec: 0.8 },
  ]);
  const regions = findSpeechRegions(audio, FS);
  assert.ok(regions.length >= 2, `got ${regions.length}`);
  assert.ok(regions.length < 4, 'the missing seam should genuinely reduce the count');
  // The point of the fix: enough boundaries survive to spread the silence over.
  assert.ok(regions.length >= 2);
});

test('regions are ordered and never overlap', () => {
  const audio = build([
    { speechSec: 1, gapSec: 0.9 },
    { speechSec: 1, gapSec: 0.9 },
    { speechSec: 1, gapSec: 0.9 },
    { speechSec: 1, gapSec: 0.9 },
  ]);
  const regions = findSpeechRegions(audio, FS);
  for (let i = 1; i < regions.length; i++) {
    assert.ok(regions[i].start >= regions[i - 1].end, 'regions overlap');
  }
});

test('silence alone yields nothing to split on', () => {
  assert.equal(findSpeechRegions(new Float32Array(FS * 3), FS).length, 0);
});
