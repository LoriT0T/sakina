'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
import type { Goal, Intake, Pacing, TrackSettings, WritingStyle } from '@/lib/types';

/**
 * Guided intake. Never a blank textarea: each question exists because a specific framing needs
 * its answer — the "why" feeds values lines, the obstacle feeds implementation intentions, the
 * past moment feeds evidence lines, and the rating decides which framings are allowed at all
 * (docs/AFFIRMATION-DESIGN.md §2).
 *
 * Only the goal itself is required. The follow-ups sharpen the writing when answered and are
 * skipped when they are not — the prompt is built from whatever is present.
 *
 * The questions are phrased interrogatively on purpose. That form is motivating when someone is
 * awake and deliberating, which is exactly what intake is, and it is the one place it belongs:
 * questions are banned from the track itself (§9a).
 */

const emptyGoal = (): Goal => ({
  id: newId(),
  text: '',
  why: '',
  obstacle: '',
  evidence: '',
  believability: 5,
  weight: 2,
  sensitive: false,
});

const STEPS = ['What to work on', 'How it sounds', 'Ready'] as const;

export default function MakeAffirmationsPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [goals, setGoals] = useState<Goal[]>([emptyGoal()]);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<TrackSettings>({
    kind: 'affirmation',
    voice: DEFAULT_VOICE,
    style: 'scripting',
    pacing: 'normal',
    bed: 'pink',
    bedLevelDb: -34,
    minutes: 30,
  });

  const update = (id: string, patch: Partial<Goal>) =>
    setGoals((gs) => gs.map((g) => (g.id === id ? { ...g, ...patch } : g)));

  const complete = goals.filter((g) => g.text.trim());
  const canContinue = complete.length > 0;

  async function start() {
    setSaving(true);
    const intake: Intake = { goals: complete, note: note.trim() || undefined };
    const id = newId();
    await saveDraft({
      id,
      name: complete[0].text.slice(0, 40) || 'Untitled',
      updatedAt: Date.now(),
      intake,
      settings,
    });
    router.push(`/review?d=${id}`);
  }

  return (
    <Page
      title={STEPS[step]}
      back={{ href: '/make', label: 'Make' }}
      subtitle={step === 0 ? 'Your words, not tidy ones.' : undefined}
    >
      {step === 0 && (
        <div className="space-y-6">
          {goals.map((g, i) => (
            <GoalForm
              key={g.id}
              goal={g}
              index={i}
              onChange={(p) => update(g.id, p)}
              onRemove={
                goals.length > 1 ? () => setGoals((gs) => gs.filter((x) => x.id !== g.id)) : undefined
              }
            />
          ))}

          <div className="flex items-center gap-3">
            <Button onClick={() => setGoals((gs) => [...gs, emptyGoal()])}>Add another goal</Button>
            {goals.length > 1 && <Muted>Time is split by the weight sliders.</Muted>}
          </div>

          <Card>
            <Field
              label="Anything else the writer should know?"
              optional
              hint="Tone, things to avoid, what you cannot stand hearing."
            >
              <TextArea value={note} onChange={setNote} rows={3} />
            </Field>
          </Card>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-8">
          <div>
            <SectionHeading>Writing style</SectionHeading>
            <Choice<WritingStyle>
              value={settings.style ?? 'scripting'}
              onChange={(style) => setSettings({ ...settings, style })}
              options={[
                { id: 'scripting', label: 'Scripting', hint: 'Present tense, spoken as already true' },
                { id: 'process', label: 'Process', hint: 'Learning-to, plans, self-compassion' },
              ]}
            />
            <p className="mt-2 text-xs leading-relaxed" style={{ color: 'var(--text-faint)' }}>
              {settings.style === 'process'
                ? 'The research-led one: "I am learning to…", specific plans, room to not feel it yet. Kinder when a goal feels far away.'
                : 'The measured reference style: "I’m so grateful that…", each line said two or three times over. Nothing about your body, no scene-setting.'}
            </p>
          </div>

          <VoicePicker voice={settings.voice} onChange={(voice) => setSettings({ ...settings, voice })} />

          <div>
            <SectionHeading>Spacing</SectionHeading>
            <Choice<Pacing>
              value={settings.pacing ?? 'normal'}
              onChange={(pacing) => setSettings({ ...settings, pacing })}
              options={[
                { id: 'close', label: 'Close' },
                { id: 'normal', label: 'Normal' },
                { id: 'spacious', label: 'Spacious' },
              ]}
            />
            <Muted>How much silence sits between the lines.</Muted>
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
              max={90}
              step={5}
            />
            <Muted>
              The shape holds at any length — arrival, downshift, core, second pass, dissolution,
              fade. It just compresses.
            </Muted>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6">
          <ApiKeyField />
          <Card>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              {complete.length} goal{complete.length === 1 ? '' : 's'}, {settings.minutes} minutes,{' '}
              {settings.voice}, {settings.bed === 'none' ? 'no bed' : `${settings.bed} bed`}.
            </p>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-faint)' }}>
              Next you get the whole script in writing. Nothing is spoken until you have read it
              and said yes.
            </p>
          </Card>
          <Note>
            Writing takes about a minute; the audio takes a few more. The voice is generated a
            passage at a time, then assembled and encoded here in your browser. Keep the tab open.
          </Note>
          <Button variant="primary" onClick={start} disabled={saving}>
            {saving ? 'Starting…' : 'Write the script'}
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
          disabled={step === STEPS.length - 1 || !canContinue}
        >
          Next
        </Button>
      </div>
    </Page>
  );
}

function GoalForm({
  goal,
  index,
  onChange,
  onRemove,
}: {
  goal: Goal;
  index: number;
  onChange: (patch: Partial<Goal>) => void;
  onRemove?: () => void;
}) {
  const [open, setOpen] = useState(index === 0);

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <SectionHeading>Goal {index + 1}</SectionHeading>
        {onRemove && (
          <Button variant="quiet" onClick={onRemove}>
            Remove
          </Button>
        )}
      </div>

      <Field label="What do I want to work on?" hint="The only one that is required.">
        <TextArea
          value={goal.text}
          onChange={(v) => onChange({ text: v })}
          rows={2}
          placeholder="Get to bed before one and up at six without four alarms"
        />
      </Field>

      <button
        onClick={() => setOpen((o) => !o)}
        className="mt-4 text-xs underline underline-offset-4"
        style={{ color: 'var(--text-faint)' }}
      >
        {open ? 'Hide the optional questions' : 'Answer a few optional questions (sharper writing)'}
      </button>

      {open && (
        <div className="mt-5 space-y-5">
          <Field
            label="Why does this matter to me?"
            optional
            hint="What it is in service of — it becomes the lines about what you value."
          >
            <TextArea
              value={goal.why}
              onChange={(v) => onChange({ why: v })}
              rows={2}
              placeholder="Everything else I care about runs on whether I slept"
            />
          </Field>

          <Field
            label="What specifically gets in the way?"
            optional
            hint="A time, a place, a feeling. It becomes the lines about the moment it gets hard."
          >
            <TextArea
              value={goal.obstacle}
              onChange={(v) => onChange({ obstacle: v })}
              rows={2}
              placeholder="At midnight I get a second wind and start something new"
            />
          </Field>

          <Field
            label="When did I handle this well before?"
            optional
            hint="Worth answering — your own evidence is what stops a line sounding like a lie."
          >
            <TextArea
              value={goal.evidence}
              onChange={(v) => onChange({ evidence: v })}
              rows={2}
              placeholder="During exam week in May I was up at six every day for nine days"
            />
          </Field>
        </div>
      )}

      <div className="mt-6">
        <div className="flex items-baseline justify-between">
          <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
            How true does this already feel?
          </span>
          <span className="text-sm tabular-nums" style={{ color: 'var(--text)' }}>
            {goal.believability} / 10
          </span>
        </div>
        <div className="mt-3">
          <Slider value={goal.believability} onChange={(v) => onChange({ believability: v })} />
        </div>
        {goal.believability < 4 && (
          <p className="mt-2 text-xs leading-relaxed" style={{ color: '#a2604f' }}>
            Below 4, so this one gets written as something underway, as self-compassion, as what
            you value, or as a plan. No flat claims — those measurably make things worse when you
            do not believe them yet.
          </p>
        )}
      </div>

      <div className="mt-6">
        <div className="flex items-baseline justify-between">
          <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Share of the track
          </span>
          <span className="text-sm tabular-nums" style={{ color: 'var(--text)' }}>
            {goal.weight}
          </span>
        </div>
        <div className="mt-3">
          <Slider value={goal.weight} onChange={(v) => onChange({ weight: v })} min={1} max={5} />
        </div>
      </div>

      <label className="mt-6 flex items-start gap-3 text-sm" style={{ color: 'var(--text-muted)' }}>
        <input
          type="checkbox"
          checked={goal.sensitive}
          onChange={(e) => onChange({ sensitive: e.target.checked })}
          className="mt-1 h-4 w-4"
        />
        <span>
          This one touches addiction or mental health.
          <span className="mt-0.5 block text-xs leading-relaxed" style={{ color: 'var(--text-faint)' }}>
            Switches to urge-surfing and specific-plan framing, and blocks shame language, “never
            again” absolutes, and anything that treats a bad night as failure.{' '}
            <Link href="/about" className="underline underline-offset-2">
              Why
            </Link>
            .
          </span>
        </span>
      </label>
    </Card>
  );
}
