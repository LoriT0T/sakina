'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button, Note, Page } from '@/components/ui';
import { getDraft, openDatabase, saveDraft, saveTrack, newId, type Draft } from '@/lib/db';
import { generateTrack, writeScript as writeScriptApi, type GenerateProgress } from '@/lib/generate';
import { generateMeditation, writeMeditation } from '@/lib/generate-meditation';
import { validateScript } from '@/lib/affirmations/validator';
import { validateMeditation } from '@/lib/meditation/validator';
import { MEDITATION_ARC } from '@/lib/meditation/plan';
import { generateText } from '@/lib/gemini/browser';
import { acceptRepair, buildRepairPrompt } from '@/lib/gemini/script';
import { ARC, estimateRuntimeSec, formatDuration } from '@/lib/script/plan';
import { PATTERN_LABEL, type Line, type TrackMeta } from '@/lib/types';

/**
 * Read it before it is spoken.
 *
 * The same page serves both kinds, because the promise is the same one — nothing is generated
 * from a script you have not seen — but almost everything under it forks: which writer runs,
 * which rules apply, which arc the sections are drawn from, and whether a line may be rewritten
 * in place (a meditation line is one instruction in a sequence, so rewriting it alone tends to
 * produce a sequence that no longer follows).
 */
export default function ReviewPage() {
  return (
    <Suspense fallback={<Page title="Loading…">{null}</Page>}>
      <Review />
    </Suspense>
  );
}

function Review() {
  const params = useSearchParams();
  const router = useRouter();
  const draftId = params.get('d');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [writing, setWriting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState<string>('');
  const [fraction, setFraction] = useState(0);

  const kind = draft?.settings.kind ?? 'affirmation';
  const isMeditation = kind === 'meditation';

  useEffect(() => {
    if (!draftId) return;
    let alive = true;
    void (async () => {
      const opened = await openDatabase();
      if (!alive) return;
      if (!opened.ok) {
        setError(opened.message);
        return;
      }
      const d = await getDraft(draftId);
      if (alive) setDraft(d ?? null);
    })();
    return () => {
      alive = false;
    };
  }, [draftId]);

  const writeScript = useCallback(async (d: Draft) => {
    setWriting(true);
    setError(null);
    try {
      const script =
        (d.settings.kind ?? 'affirmation') === 'meditation'
          ? await writeMeditation(
              d.intake,
              d.settings.minutes,
              d.settings.technique ?? 'breath',
              d.settings.guidance ?? 'normal',
              setProgress,
            )
          : await writeScriptApi(
              d.intake,
              d.settings.minutes,
              setProgress,
              undefined,
              d.settings.style ?? 'scripting',
            );
      const next = { ...d, script };
      setDraft(next);
      await saveDraft(next);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setWriting(false);
    }
  }, []);

  // Write once, automatically, when arriving with a fresh draft. Kicked off in a microtask so
  // the first render commits before any state lands.
  useEffect(() => {
    if (!draft || draft.script || writing) return;
    const d = draft;
    queueMicrotask(() => void writeScript(d));
  }, [draft, writing, writeScript]);

  const issues = useMemo(() => {
    if (!draft?.script) return [];
    return isMeditation
      ? validateMeditation(draft.script.lines)
      : validateScript(draft.script.lines, draft.intake.goals, draft.settings.style ?? 'scripting');
  }, [draft, isMeditation]);

  const errors = issues.filter((i) => i.severity === 'error');

  // A meditation's runtime is its target by construction: silence is budgeted first and the
  // words are fitted into what is left, so there is nothing to estimate.
  const runtime =
    draft?.script && !isMeditation
      ? estimateRuntimeSec(draft.script.lines, draft.settings.minutes, draft.settings.pacing ?? 'normal')
      : (draft?.settings.minutes ?? 0) * 60;

  async function mutate(lines: Line[]) {
    if (!draft) return;
    const next = { ...draft, script: { ...draft.script!, lines } };
    setDraft(next);
    await saveDraft(next);
  }

  async function generate() {
    if (!draft?.script) return;
    setGenerating(true);
    setError(null);
    setProgress('Starting…');
    const onProgress = (p: { message: string; fraction: number }) => {
      setProgress(p.message);
      setFraction(p.fraction);
    };
    try {
      const result = isMeditation
        ? await generateMeditation(draft.script, draft.settings, onProgress)
        : await generateTrack(draft.script, draft.intake, draft.settings, (p: GenerateProgress) =>
            onProgress(p),
          );

      const id = newId();
      const meta: TrackMeta = {
        id,
        name: draft.name,
        createdAt: Date.now(),
        intake: draft.intake,
        settings: draft.settings,
        script: draft.script,
        measured: result.measurement,
        mime: result.mime,
        bytes: result.blob.size,
        durationSec: result.measurement.durationSec,
      };
      await saveTrack(meta, result.blob);
      router.push(`/play?t=${id}`);
    } catch (e) {
      setError((e as Error).message);
      setGenerating(false);
    }
  }

  if (!draftId) return <Page title="No draft">{null}</Page>;

  if (!draft) {
    return (
      <Page
        title={error ? 'Cannot open storage' : 'Loading…'}
        back={{ href: '/library', label: 'Library' }}
      >
        {error && (
          <div className="space-y-4">
            <p className="text-sm leading-relaxed" style={{ color: '#a2604f' }}>
              {error}
            </p>
            <Button onClick={() => window.location.reload()}>Reload</Button>
          </div>
        )}
      </Page>
    );
  }

  if (generating) {
    return (
      <Page title="Generating">
        <div className="space-y-6">
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            {progress}
          </p>
          <div className="h-px w-full" style={{ background: 'var(--border)' }}>
            <div
              className="h-px transition-all duration-500"
              style={{ width: `${Math.round(fraction * 100)}%`, background: 'var(--accent)' }}
            />
          </div>
          <Note>
            Keep this tab open and awake. Everything happens on this device — the words go
            straight from your browser to Google and back, and the audio is assembled here.
            Nothing is stored on any server.
          </Note>
          {error && (
            <p className="text-sm" style={{ color: '#a2604f' }}>
              {error}
            </p>
          )}
        </div>
      </Page>
    );
  }

  const arc = isMeditation ? MEDITATION_ARC : ARC;

  return (
    <Page
      title={isMeditation ? 'The meditation' : 'The script'}
      back={{ href: '/library', label: 'Library' }}
      action={
        <div className="text-right">
          <div className="text-sm tabular-nums" style={{ color: 'var(--text)' }}>
            {formatDuration(runtime)}
          </div>
          <div className="text-xs" style={{ color: 'var(--text-faint)' }}>
            of {draft.settings.minutes}:00
          </div>
        </div>
      }
    >
      {writing && (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          {progress || 'Writing…'}
        </p>
      )}
      {error && (
        <p className="mb-4 text-sm" style={{ color: '#a2604f' }}>
          {error}
        </p>
      )}

      {draft.script && (
        <>
          <div className="mb-6 space-y-3">
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-faint)' }}>
              {draft.script.lines.length} lines. Edit anything, delete anything.{' '}
              {isMeditation
                ? 'Most of the runtime is the silence between them.'
                : 'The core lines are heard more than once — the runtime above already accounts for that.'}
            </p>
            {errors.length > 0 && (
              <Note tone="warn">
                {errors.length} line{errors.length === 1 ? '' : 's'} break the writing rules and
                will block generation. They are marked below.
              </Note>
            )}
          </div>

          {arc
            .filter((s) => s.section !== 'fade')
            .map((spec) => {
              const lines = draft.script!.lines.filter((l) => l.section === spec.section);
              if (lines.length === 0) return null;
              return (
                <section key={spec.section} className="mb-10">
                  <div className="mb-3 border-b pb-2" style={{ borderColor: 'var(--border)' }}>
                    <h2 className="text-sm" style={{ color: 'var(--text)' }}>
                      {spec.label}
                    </h2>
                    <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
                      {spec.purpose}
                    </p>
                  </div>
                  <ul className="space-y-1">
                    {lines.map((line) => (
                      <LineRow
                        key={line.id}
                        line={line}
                        issues={issues.filter((i) => i.lineId === line.id)}
                        goal={draft.intake.goals.find((g) => g.id === line.goalId)}
                        rewritable={!isMeditation}
                        onChange={(text) =>
                          mutate(
                            draft.script!.lines.map((l) => (l.id === line.id ? { ...l, text } : l)),
                          )
                        }
                        onDelete={() => mutate(draft.script!.lines.filter((l) => l.id !== line.id))}
                        onToggleLock={() =>
                          mutate(
                            draft.script!.lines.map((l) =>
                              l.id === line.id ? { ...l, locked: !l.locked } : l,
                            ),
                          )
                        }
                        onRegenerate={async () => {
                          const raw = await generateText(
                            buildRepairPrompt(
                              draft.intake,
                              line,
                              ['give a different wording'],
                              draft.settings.style ?? 'scripting',
                            ),
                          );
                          const fixed = acceptRepair(
                            draft.intake,
                            line,
                            raw,
                            draft.settings.style ?? 'scripting',
                          );
                          if (fixed) {
                            await mutate(
                              draft.script!.lines.map((l) =>
                                l.id === line.id ? { ...l, text: fixed.text } : l,
                              ),
                            );
                          }
                        }}
                      />
                    ))}
                  </ul>
                </section>
              );
            })}

          <div
            className="sticky bottom-16 -mx-5 border-t px-5 py-4 backdrop-blur"
            style={{ borderColor: 'var(--border)', background: 'color-mix(in srgb, var(--bg) 92%, transparent)' }}
          >
            <div className="flex items-center justify-between gap-4">
              <Button variant="quiet" onClick={() => writeScript(draft)} disabled={writing}>
                Rewrite
              </Button>
              <Button variant="primary" onClick={generate} disabled={errors.length > 0}>
                {errors.length > 0 ? `${errors.length} to fix` : 'Generate the audio'}
              </Button>
            </div>
          </div>
        </>
      )}
    </Page>
  );
}

function LineRow({
  line,
  issues,
  goal,
  rewritable,
  onChange,
  onDelete,
  onToggleLock,
  onRegenerate,
}: {
  line: Line;
  issues: Array<{ severity: string; rule: string; message: string; match?: string }>;
  goal?: { text: string };
  rewritable: boolean;
  onChange: (text: string) => void;
  onDelete: () => void;
  onToggleLock: () => void;
  onRegenerate: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(line.text);
  const [busy, setBusy] = useState(false);
  const err = issues.find((i) => i.severity === 'error');

  // The draft value is seeded when editing starts rather than synced from props, so a rewrite
  // landing mid-edit cannot silently overwrite what is being typed.
  const startEditing = () => {
    setValue(line.text);
    setEditing(true);
  };

  return (
    <li
      className="group rounded-xl border px-3 py-2"
      style={{
        borderColor: err ? '#a2604f66' : 'transparent',
        background: err ? 'var(--bg-sunken)' : 'transparent',
      }}
    >
      {editing ? (
        <textarea
          autoFocus
          value={value}
          rows={2}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => {
            setEditing(false);
            if (value.trim() && value !== line.text) onChange(value.trim());
          }}
          className="w-full resize-none rounded-lg border px-2 py-1 text-sm focus:outline-none"
          style={{
            borderColor: 'var(--border-strong)',
            background: 'var(--bg-sunken)',
            color: 'var(--text)',
          }}
        />
      ) : (
        <p
          onClick={startEditing}
          className="cursor-text text-sm leading-relaxed"
          style={{ color: 'var(--text)' }}
        >
          {line.text}
        </p>
      )}

      <div
        className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100"
        style={{ color: 'var(--text-faint)' }}
      >
        <span>{PATTERN_LABEL[line.pattern]}</span>
        {goal && <span className="truncate">· {goal.text.slice(0, 30)}</span>}
        <button onClick={onToggleLock}>{line.locked ? 'locked' : 'lock'}</button>
        {rewritable && (
          <button
            onClick={async () => {
              setBusy(true);
              await onRegenerate();
              setBusy(false);
            }}
            disabled={busy || line.locked}
            className="disabled:opacity-40"
          >
            {busy ? 'rewriting…' : 'rewrite'}
          </button>
        )}
        <button onClick={onDelete}>delete</button>
      </div>

      {err && (
        <p className="mt-1 text-xs leading-relaxed" style={{ color: '#a2604f' }}>
          <span>{err.rule}</span>
          {err.match ? ` — “${err.match}”. ` : ' — '}
          {err.message}
        </p>
      )}
    </li>
  );
}
