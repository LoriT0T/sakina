'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Card, Choice, Muted, Page, SectionHeading, TextArea } from '@/components/ui';
import { MoodDial } from '@/components/mood-dial';
import {
  addJournalEntry,
  deleteJournalEntry,
  deleteMood,
  listJournal,
  listMoods,
  newId,
  openDatabase,
} from '@/lib/db';
import type { JournalEntry, MoodEntry } from '@/lib/types';

/**
 * Journal and mood history.
 *
 * The prompts exist because a blank box at the end of a hard day usually stays blank. They are
 * all answerable in one sentence and none of them ask you to be positive about anything.
 */
const PROMPTS = [
  'What actually happened today?',
  'What is taking up the most room in your head right now?',
  'What went right that you have not given yourself credit for?',
  'What are you avoiding, and what is the smallest first move on it?',
  'What would you say to a friend in your exact situation?',
  'What is one thing you are carrying that is not yours to carry?',
  'What do you want tomorrow to be in service of?',
  'Where did you notice yourself being unfair to yourself?',
];

type Tab = 'write' | 'entries' | 'moods';

export default function JournalPage() {
  const [tab, setTab] = useState<Tab>('write');
  const [text, setText] = useState('');
  const [prompt, setPrompt] = useState<string | null>(null);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [moods, setMoods] = useState<MoodEntry[]>([]);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    const opened = await openDatabase();
    if (!opened.ok) return;
    setEntries(await listJournal());
    setMoods(await listMoods());
  }, []);

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  // One prompt a day rather than a new one on every render — a rotating prompt reads as a
  // machine looking for something to say.
  const todaysPrompt = useMemo(() => {
    const d = new Date();
    const seed = d.getFullYear() * 1000 + d.getMonth() * 40 + d.getDate();
    return PROMPTS[seed % PROMPTS.length];
  }, []);

  async function save() {
    if (!text.trim()) return;
    try {
      await addJournalEntry({
        id: newId(),
        at: Date.now(),
        prompt: prompt ?? undefined,
        text: text.trim(),
      });
    } catch (e) {
      /* The entry is still in the box — nothing typed is lost. Losing a
         journal line silently would be the worst failure this page has. */
      alert(`Could not save: ${(e as Error).message}. Your text is still here — try again.`);
      return;
    }
    setText('');
    setPrompt(null);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    await load();
  }

  return (
    <Page title="Journal" subtitle="Yours alone. Nothing here leaves this device.">
      <div className="mb-6">
        <Choice
          value={tab}
          onChange={setTab}
          options={[
            { id: 'write' as Tab, label: 'Write' },
            { id: 'entries' as Tab, label: `Entries${entries.length ? ` (${entries.length})` : ''}` },
            { id: 'moods' as Tab, label: 'Mood' },
          ]}
        />
      </div>

      {tab === 'write' && (
        <>
          <Card className="mb-4">
            <p className="text-xs uppercase tracking-[0.14em]" style={{ color: 'var(--text-faint)' }}>
              Today&rsquo;s prompt
            </p>
            <p className="mt-2 text-base leading-relaxed">{prompt ?? todaysPrompt}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                variant="quiet"
                onClick={() => setPrompt(PROMPTS[Math.floor(Math.random() * PROMPTS.length)])}
              >
                Another
              </Button>
              <Button variant="quiet" onClick={() => setPrompt('')}>
                Just write
              </Button>
            </div>
          </Card>

          <TextArea
            value={text}
            onChange={setText}
            rows={10}
            placeholder={prompt === '' ? 'Anything.' : (prompt ?? todaysPrompt)}
          />
          <div className="mt-3 flex items-center gap-3">
            <Button variant="primary" onClick={save} disabled={!text.trim()}>
              {saved ? 'Saved' : 'Save entry'}
            </Button>
            <span className="text-xs" style={{ color: 'var(--text-faint)' }}>
              {text.trim() ? `${text.trim().split(/\s+/).length} words` : ''}
            </span>
          </div>
        </>
      )}

      {tab === 'entries' && (
        <section>
          {entries.length === 0 && <Muted>Nothing written yet.</Muted>}
          <ul className="space-y-3">
            {entries.map((e) => (
              <li key={e.id}>
                <Card>
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
                      {new Date(e.at).toLocaleString(undefined, {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                    <button
                      onClick={async () => {
                        await deleteJournalEntry(e.id);
                        await load();
                      }}
                      className="text-xs"
                      style={{ color: 'var(--text-faint)' }}
                    >
                      delete
                    </button>
                  </div>
                  {e.prompt && (
                    <p className="mt-2 text-xs italic" style={{ color: 'var(--text-muted)' }}>
                      {e.prompt}
                    </p>
                  )}
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{e.text}</p>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      )}

      {tab === 'moods' && (
        <section>
          <div className="mb-5">
            <MoodDial onSaved={() => void load()} />
          </div>
          <SectionHeading>History</SectionHeading>
          {moods.length === 0 && <Muted>No check-ins yet.</Muted>}
          <ul className="space-y-2">
            {moods.map((m) => (
              <li key={m.id}>
                <Card>
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
                      {new Date(m.at).toLocaleString(undefined, {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                    <button
                      onClick={async () => {
                        await deleteMood(m.id);
                        await load();
                      }}
                      className="text-xs"
                      style={{ color: 'var(--text-faint)' }}
                    >
                      delete
                    </button>
                  </div>
                  <p className="mt-1.5 text-sm">
                    mood {m.valence > 0 ? `+${m.valence}` : m.valence} · energy{' '}
                    {m.energy > 0 ? `+${m.energy}` : m.energy}
                    {m.tags.length > 0 && (
                      <span style={{ color: 'var(--text-muted)' }}> · {m.tags.join(', ')}</span>
                    )}
                  </p>
                  {m.note && (
                    <p className="mt-1.5 text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                      {m.note}
                    </p>
                  )}
                </Card>
              </li>
            ))}
          </ul>
        </section>
      )}
    </Page>
  );
}
