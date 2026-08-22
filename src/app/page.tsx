'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Button, Card, Muted, Page, SectionHeading } from '@/components/ui';
import { MoodDial } from '@/components/mood-dial';
import { guidanceFor, greeting, type DailyGuidance } from '@/lib/advice';
import { getPrayerDay, listMoods, openDatabase, recentPrayerDays, setPrayerState } from '@/lib/db';
import { adhkarFor, slotForNow } from '@/lib/prayer/adhkar';
import { formatAway, formatTime, isoDate, nextPrayer, PRAYER_LABEL, timesFor } from '@/lib/prayer/times';
import { PRAYER_NAMES, type PrayerDay, type PrayerName } from '@/lib/types';

/**
 * Today.
 *
 * The one screen that has to be worth opening at any hour. It answers, in order: what time is
 * the next prayer, have I prayed the ones that have passed, what might I do with this part of
 * the day, and how am I.
 */
export default function Today() {
  /**
   * Null until mounted, on purpose.
   *
   * This page is prerendered at build time, and every visible thing on it is a function of the
   * current clock and this device's coordinates. Seeding `now` with `new Date()` meant the
   * build's date and prayer times were baked into the HTML and then replaced on hydration —
   * React reported the mismatch, and for a moment the page showed a stale day. Rendering
   * nothing time-dependent until the client has mounted is the honest fix: there genuinely is
   * no answer to "what time is it" at build time.
   */
  const [now, setNow] = useState<Date | null>(null);
  const [day, setDay] = useState<PrayerDay | null>(null);
  const [guidance, setGuidance] = useState<DailyGuidance | null>(null);
  const [storageError, setStorageError] = useState<string | null>(null);

  // A minute is fine: the countdown is informational, not a timer anyone acts on to the second.
  useEffect(() => {
    // Deferred so the effect body itself sets nothing: the first read of the clock happens in
    // a microtask, then once a minute after that.
    queueMicrotask(() => setNow(new Date()));
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const load = useCallback(async () => {
    const opened = await openDatabase();
    if (!opened.ok) {
      setStorageError(opened.message);
      return;
    }
    const [d, moods, prayers] = await Promise.all([
      getPrayerDay(isoDate()),
      listMoods(60),
      recentPrayerDays(14),
    ]);
    setDay(d);
    setGuidance(guidanceFor(new Date(), moods, prayers));
  }, []);

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  // Everything below needs a clock. The skeleton below holds the layout until there is one.
  const clock = now;
  const next = clock ? nextPrayer(clock) : null;
  const times = clock ? timesFor(clock) : null;
  const slot = clock ? slotForNow(clock) : null;
  const dhikr = slot ? adhkarFor(slot)[0] : null;

  async function mark(name: PrayerName) {
    const current = day?.prayers[name] ?? 'none';
    const nextState = current === 'none' ? 'prayed' : current === 'prayed' ? 'jamaah' : 'none';
    setDay(await setPrayerState(isoDate(), name, nextState));
  }

  if (!clock || !next || !times || !slot) {
    // One frame, at most: the placeholders hold the layout so nothing jumps when the clock lands.
    return (
      <Page>
        <div className="animate-pulse space-y-6">
          <div className="h-10 w-48 rounded-lg" style={{ background: 'var(--bg-raised)' }} />
          <div className="h-44 rounded-2xl" style={{ background: 'var(--bg-raised)' }} />
          <div className="h-24 rounded-2xl" style={{ background: 'var(--bg-raised)' }} />
        </div>
      </Page>
    );
  }

  return (
    <Page>
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm" style={{ color: 'var(--text-faint)' }}>
            {clock.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          <h1 className="mt-1 text-3xl font-normal tracking-tight">{greeting(clock)}</h1>
        </div>
        <Link
          href="/settings"
          aria-label="Settings"
          className="mt-1 shrink-0 p-2"
          style={{ color: 'var(--text-faint)' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v3m0 14v3M2 12h3m14 0h3M4.9 4.9l2.1 2.1m10 10l2.1 2.1M19.1 4.9L17 7m-10 10l-2.1 2.1" />
          </svg>
        </Link>
      </header>

      {storageError && (
        <Card className="mb-6">
          <p className="text-sm leading-relaxed" style={{ color: '#a2604f' }}>
            {storageError}
          </p>
          <Button className="mt-3" onClick={() => window.location.reload()}>
            Reload
          </Button>
        </Card>
      )}

      {/* Next prayer + one-tap marking for the day so far. */}
      <Card className="mb-6">
        <div className="flex items-baseline justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.14em]" style={{ color: 'var(--text-faint)' }}>
              Next
            </p>
            <p className="mt-1 text-xl">
              {PRAYER_LABEL[next.name]}{' '}
              <span style={{ color: 'var(--text-muted)' }}>{formatTime(next.at)}</span>
            </p>
          </div>
          <p className="text-sm" style={{ color: 'var(--accent)' }}>
            in {formatAway(next.msAway)}
          </p>
        </div>

        <ul className="mt-4 flex gap-2">
          {PRAYER_NAMES.map((name) => {
            const state = day?.prayers[name] ?? 'none';
            const past = times.times[name].getTime() <= clock.getTime();
            const done = state === 'prayed' || state === 'jamaah';
            return (
              <li key={name} className="flex-1">
                <button
                  onClick={() => mark(name)}
                  className="flex w-full flex-col items-center gap-1 rounded-xl border py-2.5 text-[11px]"
                  style={{
                    background: done ? 'var(--accent-soft)' : 'transparent',
                    borderColor: done ? 'var(--accent)' : 'var(--border)',
                    color: done ? 'var(--text)' : past ? 'var(--text-muted)' : 'var(--text-faint)',
                  }}
                  aria-label={`${PRAYER_LABEL[name]}: ${state}`}
                >
                  <span>{PRAYER_LABEL[name]}</span>
                  <span style={{ color: 'var(--text-faint)' }}>
                    {state === 'jamaah' ? '••' : done ? '•' : formatTime(times.times[name])}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <p className="mt-2 text-[11px]" style={{ color: 'var(--text-faint)' }}>
          Tap once for prayed, twice for in jamāʿah. <Link href="/prayer" className="underline">All of it →</Link>
        </p>
      </Card>

      {/* Something to do with this part of the day. */}
      {guidance && (
        <section className="mb-6">
          <SectionHeading>For now</SectionHeading>
          <Card>
            <p className="text-base leading-relaxed">{guidance.advice.text}</p>
            {guidance.advice.detail && (
              <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                {guidance.advice.detail}
              </p>
            )}
            {guidance.observation && (
              <p
                className="mt-3 border-t pt-3 text-sm leading-relaxed"
                style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
              >
                {guidance.observation}
              </p>
            )}
          </Card>
        </section>
      )}

      <section className="mb-6">
        <SectionHeading>How are you</SectionHeading>
        <MoodDial onSaved={() => void load()} />
      </section>

      {dhikr && (
        <section className="mb-6">
          <SectionHeading aside={<Link href="/prayer#adhkar" className="text-xs underline" style={{ color: 'var(--text-faint)' }}>more</Link>}>
            {slot === 'sleep' ? 'Before sleep' : slot === 'morning' ? 'Morning' : slot === 'evening' ? 'Evening' : 'Remembrance'}
          </SectionHeading>
          <Card>
            <p className="arabic">{dhikr.arabic}</p>
            <p className="mt-2 text-sm italic" style={{ color: 'var(--text-muted)' }}>
              {dhikr.translit}
            </p>
            <p className="mt-1 text-sm">{dhikr.meaning}</p>
          </Card>
        </section>
      )}

      <section>
        <SectionHeading>Make something to listen to</SectionHeading>
        <div className="grid grid-cols-2 gap-3">
          <Link href="/make/meditation">
            <Card as="div" className="h-full">
              <p className="text-base">Meditation</p>
              <Muted>Guided, with real silence in it.</Muted>
            </Card>
          </Link>
          <Link href="/make/affirmations">
            <Card as="div" className="h-full">
              <p className="text-base">Affirmations</p>
              <Muted>In your own words, for sleep.</Muted>
            </Card>
          </Link>
        </div>
      </section>
    </Page>
  );
}
