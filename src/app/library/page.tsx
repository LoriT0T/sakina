'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button, Card, Muted, Note, Page, SectionHeading } from '@/components/ui';
import {
  deleteDraft,
  pruneChunks,
  deleteTrack,
  getAudio,
  listDrafts,
  listTracks,
  openDatabase,
  storageEstimate,
  type Draft,
} from '@/lib/db';
import { EXAMPLES } from '@/lib/examples';
import { formatDuration } from '@/lib/script/plan';
import type { TrackMeta } from '@/lib/types';

/**
 * Everything you have made, plus the finished examples that ship with the app.
 *
 * Storage is per-browser, which is a real limitation rather than a preference: a track made on
 * a laptop is not on the phone. Save writes the audio out as a file, and that is the bridge.
 */
export default function LibraryPage() {
  const [tracks, setTracks] = useState<TrackMeta[] | null>(null);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState<{ usage: number; quota: number } | null>(null);

  async function refresh() {
    const opened = await openDatabase();
    if (!opened.ok) {
      setError(opened.message);
      setTracks([]);
      return;
    }
    setTracks(await listTracks());
    /* Every draft shows, whatever its state. The old filter hid any draft that
       had a script — so a written-but-not-yet-generated track looked deleted,
       at bedtime, which is the one moment this app must never lie. A finished
       generation now deletes its own draft, so nothing lingers either. */
    setDrafts(await listDrafts());
    setUsage(await storageEstimate());
    /* Old spoken chunks are a cache, not a record — and a cache that only
       grows eventually eats the quota the next track needs to save into.
       Fire-and-forget: the listing never waits on housekeeping. */
    void pruneChunks().catch(() => {});
  }

  useEffect(() => {
    // Deferred rather than called in the effect body: every read here is asynchronous storage
    // access, and starting it in a microtask keeps the first paint free of cascading renders.
    queueMicrotask(() => void refresh());
  }, []);

  async function save(t: TrackMeta) {
    const blob = await getAudio(t.id);
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${t.name.replace(/[^\w\s-]/g, '').slice(0, 50) || 'track'}.mp3`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }

  return (
    <Page
      title="Library"
      subtitle="On this device only."
      action={
        <Link href="/make">
          <Button>New</Button>
        </Link>
      }
    >
      {error && <Note tone="warn">{error}</Note>}

      {tracks && tracks.length > 0 && (
        <section className="mb-10">
          <SectionHeading>Yours</SectionHeading>
          <ul className="space-y-2">
            {tracks.map((t) => (
              <li key={t.id}>
                <Card>
                  <div className="flex items-start justify-between gap-3">
                    <Link href={`/play?t=${t.id}`} className="min-w-0 flex-1">
                      <p className="truncate text-sm" style={{ color: 'var(--text)' }}>
                        {t.name}
                      </p>
                      <p className="mt-1 text-xs" style={{ color: 'var(--text-faint)' }}>
                        {(t.settings.kind ?? 'affirmation') === 'meditation'
                          ? `${t.settings.technique ?? 'meditation'} · `
                          : ''}
                        {formatDuration(t.durationSec)} · {t.settings.voice} ·{' '}
                        {new Date(t.createdAt).toLocaleDateString()}
                        {t.measured && ` · ${t.measured.integratedLufs.toFixed(1)} LUFS`}
                      </p>
                    </Link>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button onClick={() => save(t)}>Save a copy</Button>
                    <Button
                      variant="danger"
                      onClick={async () => {
                        await deleteTrack(t.id);
                        void refresh();
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      )}

      {drafts.length > 0 && (
        <section className="mb-10">
          <SectionHeading>Unfinished</SectionHeading>
          <ul className="space-y-2">
            {drafts.map((d) => (
              <li key={d.id}>
                <Card>
                  <div className="flex items-center justify-between gap-3">
                    <Link href={`/review?d=${d.id}`} className="min-w-0 flex-1">
                      <p className="truncate text-sm" style={{ color: 'var(--text)' }}>
                        {d.name}
                      </p>
                      <p className="mt-1 text-xs" style={{ color: 'var(--text-faint)' }}>
                        {d.settings.minutes} min ·{' '}
                        {d.script ? (
                          <span style={{ color: 'var(--accent)' }}>
                            script written — ready to generate
                          </span>
                        ) : (
                          'goals saved — script not written yet'
                        )}
                      </p>
                    </Link>
                    <Button
                      variant="quiet"
                      onClick={async () => {
                        await deleteDraft(d.id);
                        void refresh();
                      }}
                    >
                      Discard
                    </Button>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mb-10">
        <SectionHeading>Finished examples</SectionHeading>
        <Muted>Real output — real intake, real voice, real pipeline. No key needed to play them.</Muted>
        <ul className="mt-3 space-y-2">
          {EXAMPLES.map((e) => (
            <li key={e.id}>
              <Link href={`/play?ex=${e.id}`}>
                <Card>
                  <p className="text-sm" style={{ color: 'var(--text)' }}>
                    {e.name}
                  </p>
                  <p className="mt-1 text-xs" style={{ color: 'var(--text-faint)' }}>
                    {formatDuration(e.durationSec)} · {e.voice} · {e.lufs} LUFS · {e.truePeakDb} dBTP
                  </p>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {tracks?.length === 0 && drafts.length === 0 && (
        <Note>
          Nothing of your own yet. <Link href="/make" className="underline underline-offset-2">Make something</Link>.
        </Note>
      )}

      {usage && usage.quota > 0 && (
        <p className="mt-8 text-xs" style={{ color: 'var(--text-faint)' }}>
          Using {(usage.usage / 1e6).toFixed(0)} MB of about {(usage.quota / 1e6).toFixed(0)} MB this
          browser will give.
        </p>
      )}
    </Page>
  );
}
