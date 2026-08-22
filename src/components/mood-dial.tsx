'use client';

import { useState } from 'react';
import { Button, Card } from '@/components/ui';
import { addMood, newId } from '@/lib/db';

/**
 * Mood capture on two axes.
 *
 * Valence and energy rather than one "how are you, 1–10", because the two genuinely come apart:
 * tired-but-content and wired-but-miserable are different days and a single axis cannot tell
 * them apart. It is also what makes the weekly observation on the Today screen possible — low
 * energy with intact mood points somewhere quite different from low mood.
 *
 * Everything is optional except the two dials, and it saves in one tap. A check-in that takes
 * effort does not get done on the days it would matter most.
 */
const TAGS = ['tired', 'wired', 'calm', 'anxious', 'low', 'content', 'angry', 'lonely', 'hopeful', 'flat'];

export function MoodDial({ onSaved }: { onSaved?: () => void }) {
  const [valence, setValence] = useState(0);
  const [energy, setEnergy] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    await addMood({ id: newId(), at: Date.now(), valence, energy, tags, note: note.trim() || undefined });
    setSaved(true);
    setOpen(false);
    setNote('');
    setTags([]);
    onSaved?.();
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <Card>
      <Axis label="Mood" low="unpleasant" high="pleasant" value={valence} onChange={setValence} />
      <div className="mt-4">
        <Axis label="Energy" low="depleted" high="energised" value={energy} onChange={setEnergy} />
      </div>

      {open && (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            {TAGS.map((t) => {
              const on = tags.includes(t);
              return (
                <button
                  key={t}
                  onClick={() => setTags((cur) => (on ? cur.filter((x) => x !== t) : [...cur, t]))}
                  className="min-h-9 rounded-full border px-3 text-xs"
                  style={{
                    background: on ? 'var(--accent-soft)' : 'transparent',
                    borderColor: on ? 'var(--accent)' : 'var(--border)',
                    color: on ? 'var(--text)' : 'var(--text-muted)',
                  }}
                >
                  {t}
                </button>
              );
            })}
          </div>
          <textarea
            value={note}
            rows={2}
            placeholder="Anything worth remembering about right now"
            onChange={(e) => setNote(e.target.value)}
            className="w-full resize-y rounded-xl border px-3 py-2 text-sm outline-none placeholder:opacity-50"
            style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text)' }}
          />
        </div>
      )}

      <div className="mt-4 flex items-center gap-2">
        <Button variant="primary" onClick={save}>
          {saved ? 'Saved' : 'Save'}
        </Button>
        <Button variant="quiet" onClick={() => setOpen((o) => !o)}>
          {open ? 'Less' : 'Add words'}
        </Button>
      </div>
    </Card>
  );
}

function Axis({
  label,
  low,
  high,
  value,
  onChange,
}: {
  label: string;
  low: string;
  high: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-sm">{label}</span>
        <span className="text-xs tabular-nums" style={{ color: 'var(--text-faint)' }}>
          {value > 0 ? `+${value}` : value}
        </span>
      </div>
      <div className="mt-2 flex gap-1.5">
        {[-3, -2, -1, 0, 1, 2, 3].map((v) => {
          const on = v === value;
          return (
            <button
              key={v}
              onClick={() => onChange(v)}
              aria-label={`${label} ${v}`}
              className="h-11 flex-1 rounded-lg border"
              style={{
                background: on ? 'var(--accent)' : 'var(--bg-sunken)',
                borderColor: on ? 'var(--accent)' : 'var(--border)',
                opacity: on ? 1 : 0.55 + Math.abs(v) * 0.04,
              }}
            />
          );
        })}
      </div>
      <div className="mt-1 flex justify-between text-[11px]" style={{ color: 'var(--text-faint)' }}>
        <span>{low}</span>
        <span>{high}</span>
      </div>
    </div>
  );
}
