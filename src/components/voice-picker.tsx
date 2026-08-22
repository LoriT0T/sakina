'use client';

import { useEffect, useState } from 'react';
import { Muted, SectionHeading } from '@/components/ui';
import { AUDITION_VOICES } from '@/lib/voices';
import { asset } from '@/lib/paths';

/**
 * One audition element for the whole app, at module scope rather than in a ref.
 *
 * There is only ever one sample playing — that is the entire point of the play/pause
 * behaviour — so a single shared element is the honest model, and it means switching voices
 * cannot leave a second one talking underneath.
 */
let auditionEl: HTMLAudioElement | null = null;

/**
 * Pick a voice by ear rather than by descriptor: every female-presenting voice the API offers
 * reads the same passage.
 *
 * Each row's play button is a toggle. Pressing the same voice again stops it; pressing a
 * different voice switches straight to that one. A single shared audio element does the work,
 * so two samples can never talk over each other.
 */
export function VoicePicker({
  voice,
  onChange,
}: {
  voice: string;
  onChange: (voice: string) => void;
}) {
  const [available, setAvailable] = useState<string[] | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);

  useEffect(() => {
    fetch(asset('/auditions/index.json'))
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setAvailable(d ? d.voices.map((v: { voice: string }) => v.voice) : []))
      .catch(() => setAvailable([]));
  }, []);

  // Leaving the page should not leave a voice talking.
  useEffect(
    () => () => {
      auditionEl?.pause();
    },
    [],
  );

  function audition(name: string) {
    const el = (auditionEl ??= new Audio());
    el.pause();
    el.currentTime = 0;
    if (playing === name) {
      setPlaying(null);
      return;
    }
    el.src = asset(`/auditions/${name}.m4a`);
    el.onended = () => setPlaying(null);
    setPlaying(name);
    el.play().catch(() => setPlaying(null));
  }

  return (
    <div>
      <SectionHeading>Voice</SectionHeading>
      <Muted>
        Press play to hear one, press again to stop it, or press another to switch straight to
        that one.
      </Muted>
      <ul className="mt-4 space-y-1.5">
        {AUDITION_VOICES.map((v) => {
          const has = available === null || available.includes(v.name);
          const on = voice === v.name;
          return (
            <li
              key={v.name}
              className="flex items-center gap-3 rounded-xl border px-3 py-2.5"
              style={{
                background: on ? 'var(--accent-soft)' : 'var(--bg-raised)',
                borderColor: on ? 'var(--accent)' : 'var(--border)',
              }}
            >
              <button onClick={() => onChange(v.name)} className="flex-1 text-left">
                <span className="text-sm" style={{ color: 'var(--text)' }}>
                  {v.name}
                </span>
                <span className="ml-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                  {v.descriptor}
                </span>
                {v.note && (
                  <span
                    className="mt-0.5 block text-xs leading-relaxed"
                    style={{ color: 'var(--text-faint)' }}
                  >
                    {v.note}
                  </span>
                )}
              </button>
              <button
                onClick={() => audition(v.name)}
                disabled={!has}
                aria-label={playing === v.name ? `Stop ${v.name}` : `Play ${v.name}`}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border disabled:opacity-30"
                style={{ borderColor: 'var(--border-strong)' }}
              >
                {playing === v.name ? (
                  <span className="flex gap-1">
                    <span
                      className="block h-3.5 w-1 rounded-sm"
                      style={{ background: 'var(--text-muted)' }}
                    />
                    <span
                      className="block h-3.5 w-1 rounded-sm"
                      style={{ background: 'var(--text-muted)' }}
                    />
                  </span>
                ) : (
                  <span
                    className="ml-0.5 block h-0 w-0 border-y-[7px] border-l-[11px] border-y-transparent"
                    style={{ borderLeftColor: 'var(--text-muted)' }}
                  />
                )}
              </button>
            </li>
          );
        })}
      </ul>
      {available?.length === 0 && (
        <p className="mt-3 text-xs" style={{ color: '#a2604f' }}>
          No auditions have been generated yet.
        </p>
      )}
    </div>
  );
}

/** The noise bed under the voice. Synthesized on the fly; nothing streams. */
export function BedPicker({
  bed,
  onChange,
}: {
  bed: string;
  onChange: (bed: 'pink' | 'brown' | 'rain' | 'none') => void;
}) {
  return (
    <div>
      <SectionHeading>Under the voice</SectionHeading>
      <Muted>A very quiet bed, to mask the house rather than to do anything to your brain.</Muted>
      <div className="mt-3 flex flex-wrap gap-2">
        {(['pink', 'brown', 'rain', 'none'] as const).map((b) => (
          <button
            key={b}
            onClick={() => onChange(b)}
            style={{
              background: bed === b ? 'var(--accent-soft)' : 'var(--bg-raised)',
              borderColor: bed === b ? 'var(--accent)' : 'var(--border)',
              color: bed === b ? 'var(--text)' : 'var(--text-muted)',
            }}
            className="min-h-11 rounded-xl border px-3.5 text-sm"
          >
            {b === 'rain' ? 'rain (synthesized)' : b}
          </button>
        ))}
      </div>
    </div>
  );
}
