'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Button,
  Card,
  Choice,
  Field,
  Muted,
  Note,
  Page,
  SectionHeading,
  Slider,
  TextArea,
} from '@/components/ui';
import { ApiKeyField } from '@/components/api-key';
import { BedPicker, VoicePicker } from '@/components/voice-picker';
import { newId, saveDraft } from '@/lib/db';
import { DEFAULT_VOICE } from '@/lib/voices';
import type { Goal, Intake, MeditationTechnique, Pacing, TrackSettings } from '@/lib/types';

/**
 * Meditation intake, and it deliberately asks for less than the affirmation one.
 *
 * An affirmation script is about you and needs your material. A meditation is a practice with a
 * shape of its own; what it needs from you is which practice and how long, and then to get out
 * of the way. The one free-text box is context, not content — it tips word choice, it does not
 * become the script. See docs/MEDITATION-DESIGN.md §3.
 */

const TECHNIQUES: Array<{ id: MeditationTechnique; label: string; blurb: string }> = [
  {
    id: 'breath',
    label: 'Breath',
    blurb: 'Attention rests on the breath, comes back when it leaves. The plain one, and the one to start with.',
  },
  {
    id: 'body-scan',
    label: 'Body scan',
    blurb: 'Attention moves through the body a region at a time. The best-evidenced practice of the set.',
  },
  {
    id: 'loving-kindness',
    label: 'Loving-kindness',
    blurb: 'Well-wishing, starting somewhere easy and widening outward. Good when you are being hard on yourself.',
  },
  {
    id: 'letting-go',
    label: 'Letting go',
    blurb: 'Noticing what you are holding — thought, tension, plan — and setting it down without arguing with it.',
  },
  {
    id: 'gratitude',
    label: 'Gratitude',
    blurb: 'Turning toward what is already here. Specific and small rather than grand.',
  },
  {
    id: 'sleep',
    label: 'For sleep',
    blurb: 'Wind-down. No returning at the end — it just gets quieter and stops.',
  },
];

const STEPS = ['The practice', 'How it sounds', 'Ready'] as const;

export default function MakeMeditationPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [context, setContext] = useState('');
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<TrackSettings>({
    kind: 'meditation',
    voice: DEFAULT_VOICE,
    technique: 'breath',
    guidance: 'normal',
    bed: 'none',
    bedLevelDb: -38,
    minutes: 10,
  });

  const technique = TECHNIQUES.find((t) => t.id === settings.technique)!;

  async function start() {
    setSaving(true);
    // A meditation has no goals. The shared draft shape wants an intake, so the context line
    // rides in as a single unweighted goal the meditation writer reads as context and the
    // affirmation writer never sees.
    const goals: Goal[] = context.trim()
      ? [
          {
            id: newId(),
            text: context.trim(),
            why: '',
            obstacle: '',
            evidence: '',
            believability: 5,
            weight: 1,
            sensitive: false,
          },
        ]
      : [];
    const intake: Intake = { goals, note: undefined };
    const id = newId();
    await saveDraft({
      id,
      name: `${technique.label} · ${settings.minutes} min`,
      updatedAt: Date.now(),
      intake,
      settings,
    });
    router.push(`/review?d=${id}`);
  }

  return (
    <Page title={STEPS[step]} back={{ href: '/make', label: 'Make' }}>
      {step === 0 && (
        <div className="space-y-6">
          <div>
            <SectionHeading>Practice</SectionHeading>
            <ul className="space-y-1.5">
              {TECHNIQUES.map((t) => {
                const on = settings.technique === t.id;
                return (
                  <li key={t.id}>
                    <button
                      onClick={() => setSettings({ ...settings, technique: t.id })}
                      className="w-full rounded-xl border px-3.5 py-3 text-left"
                      style={{
                        background: on ? 'var(--accent-soft)' : 'var(--bg-raised)',
                        borderColor: on ? 'var(--accent)' : 'var(--border)',
                      }}
                    >
                      <span className="text-sm" style={{ color: 'var(--text)' }}>
                        {t.label}
                      </span>
                      <span
                        className="mt-1 block text-xs leading-relaxed"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        {t.blurb}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          <Card>
            <Field
              label="Anything on your mind right now?"
              optional
              hint="Context, not content. It tips the wording — it does not become the script."
            >
              <TextArea
                value={context}
                onChange={setContext}
                rows={2}
                placeholder="Wound up after a long day of deadlines"
              />
            </Field>
          </Card>

          <Note>
            Most of a meditation is silence. A ten-minute one is roughly ninety spoken seconds and
            eight and a half minutes of room to actually practise — that is the design, not a
            shortfall.
          </Note>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-8">
          <VoicePicker voice={settings.voice} onChange={(voice) => setSettings({ ...settings, voice })} />

          <div>
            <SectionHeading>How much guidance</SectionHeading>
            <Choice<Pacing>
              value={settings.guidance ?? 'normal'}
              onChange={(guidance) => setSettings({ ...settings, guidance })}
              options={[
                { id: 'spacious', label: 'Barely any' },
                { id: 'normal', label: 'Some' },
                { id: 'close', label: 'A lot' },
              ]}
            />
            <Muted>
              {settings.guidance === 'spacious'
                ? 'Long silences, a voice that returns only occasionally. For when you already know the practice.'
                : settings.guidance === 'close'
                  ? 'A voice never far away. Easier when your mind is loud or the practice is new.'
                  : 'Guidance, then silence, then guidance again.'}
            </Muted>
          </div>

          <BedPicker bed={settings.bed} onChange={(bed) => setSettings({ ...settings, bed })} />

          <div>
            <SectionHeading aside={<span className="text-sm tabular-nums">{settings.minutes} min</span>}>
              Length
            </SectionHeading>
            <Slider
              value={settings.minutes}
              onChange={(minutes) => setSettings({ ...settings, minutes })}
              min={5}
              max={45}
              step={5}
            />
            <Muted>Arrival, practice, return — the same three phases at every length.</Muted>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6">
          <ApiKeyField />
          <Card>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              {technique.label}, {settings.minutes} minutes, {settings.voice}.
            </p>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-faint)' }}>
              You read the whole thing before a word of it is spoken.
            </p>
          </Card>
          <Button variant="primary" onClick={start} disabled={saving}>
            {saving ? 'Starting…' : 'Write the meditation'}
          </Button>
        </div>
      )}

      <div
        className="mt-10 flex items-center justify-between border-t pt-6"
        style={{ borderColor: 'var(--border)' }}
      >
        <Button variant="quiet" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
          Back
        </Button>
        <span className="text-xs" style={{ color: 'var(--text-faint)' }}>
          {step + 1} / {STEPS.length}
        </span>
        <Button
          onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
          disabled={step === STEPS.length - 1}
        >
          Next
        </Button>
      </div>
    </Page>
  );
}
