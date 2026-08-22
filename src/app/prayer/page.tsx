'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button, Card, Choice, Field, Muted, Page, SectionHeading, TextInput } from '@/components/ui';
import { getPrayerDay, recentPrayerDays, setPrayerState } from '@/lib/db';
import { ADHKAR, slotForNow, type DhikrSlot } from '@/lib/prayer/adhkar';
import {
  CALCULATION_METHODS,
  formatTime,
  getPlace,
  isoDate,
  PRAYER_ARABIC,
  PRAYER_LABEL,
  setPlace,
  timesFor,
  type PlaceSettings,
} from '@/lib/prayer/times';
import { PRAYER_NAMES, type PrayerDay, type PrayerName, type PrayerState } from '@/lib/types';

/**
 * Prayer.
 *
 * Tracking without scoring. There is a record of what happened and nothing that ranks the week,
 * awards a streak, or reacts to a gap — a missed prayer is between a person and their Lord, and
 * an app that gamifies it would be adding a second, worse thing to feel bad about.
 */

const STATES: Array<{ id: PrayerState; label: string }> = [
  { id: 'none', label: 'Not yet' },
  { id: 'prayed', label: 'Prayed' },
  { id: 'jamaah', label: 'In jamāʿah' },
  { id: 'late', label: 'Late' },
  { id: 'missed', label: 'Missed' },
];

const SLOTS: Array<{ id: DhikrSlot; label: string }> = [
  { id: 'morning', label: 'Morning' },
  { id: 'evening', label: 'Evening' },
  { id: 'after-prayer', label: 'After prayer' },
  { id: 'distress', label: 'When it is heavy' },
  { id: 'sleep', label: 'Before sleep' },
];

export default function PrayerPage() {
  const [day, setDay] = useState<PrayerDay | null>(null);
  const [history, setHistory] = useState<PrayerDay[]>([]);
  const [place, setPlaceState] = useState<PlaceSettings>(() => getPlace());
  const [editingPlace, setEditingPlace] = useState(false);
  const [slot, setSlot] = useState<DhikrSlot>(() => {
    const s = slotForNow();
    return s === 'anytime' ? 'after-prayer' : s;
  });
  const now = new Date();

  const load = useCallback(async () => {
    setDay(await getPrayerDay(isoDate()));
    setHistory(await recentPrayerDays(28));
  }, []);

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  const times = timesFor(now, place);

  async function set(name: PrayerName, state: PrayerState) {
    setDay(await setPrayerState(isoDate(), name, state));
    setHistory(await recentPrayerDays(28));
  }

  return (
    <Page title="Prayer" subtitle="What happened, kept plainly. No streaks, no scores.">
      <section className="mb-8">
        <SectionHeading
          aside={
            <button
              onClick={() => setEditingPlace((e) => !e)}
              className="text-xs underline"
              style={{ color: 'var(--text-faint)' }}
            >
              {place.label}
            </button>
          }
        >
          Today
        </SectionHeading>

        {editingPlace && (
          <Card className="mb-3">
            <div className="space-y-3">
              <Field label="Place" hint="Times are computed on this device. Your location is never sent anywhere.">
                <TextInput value={place.label} onChange={(v) => setPlaceState({ ...place, label: v })} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Latitude">
                  <TextInput
                    value={String(place.latitude)}
                    onChange={(v) => setPlaceState({ ...place, latitude: Number(v) || 0 })}
                  />
                </Field>
                <Field label="Longitude">
                  <TextInput
                    value={String(place.longitude)}
                    onChange={(v) => setPlaceState({ ...place, longitude: Number(v) || 0 })}
                  />
                </Field>
              </div>
              <Field label="Calculation">
                <select
                  value={place.method}
                  onChange={(e) => setPlaceState({ ...place, method: e.target.value as PlaceSettings['method'] })}
                  className="w-full rounded-xl border px-3 py-2.5 text-sm"
                  style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text)' }}
                >
                  {CALCULATION_METHODS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Asr">
                <Choice
                  value={place.madhab}
                  onChange={(v) => setPlaceState({ ...place, madhab: v })}
                  options={[
                    { id: 'hanafi', label: 'Hanafi' },
                    { id: 'shafi', label: 'Shafiʿi / Maliki / Hanbali' },
                  ]}
                />
              </Field>
              <div className="flex gap-2">
                <Button
                  variant="primary"
                  onClick={() => {
                    setPlace(place);
                    setEditingPlace(false);
                  }}
                >
                  Save
                </Button>
                <Button
                  variant="quiet"
                  onClick={() => {
                    navigator.geolocation?.getCurrentPosition((pos) =>
                      setPlaceState({
                        ...place,
                        latitude: +pos.coords.latitude.toFixed(4),
                        longitude: +pos.coords.longitude.toFixed(4),
                        label: 'Here',
                      }),
                    );
                  }}
                >
                  Use my location
                </Button>
              </div>
            </div>
          </Card>
        )}

        <ul className="space-y-2">
          {PRAYER_NAMES.map((name) => {
            const state = day?.prayers[name] ?? 'none';
            const done = state === 'prayed' || state === 'jamaah';
            return (
              <li key={name}>
                <Card>
                  <div className="flex items-baseline justify-between">
                    <div className="flex items-baseline gap-3">
                      <span className="text-base">{PRAYER_LABEL[name]}</span>
                      <span className="arabic text-sm" style={{ color: 'var(--text-faint)' }}>
                        {PRAYER_ARABIC[name]}
                      </span>
                    </div>
                    <span
                      className="text-sm tabular-nums"
                      style={{ color: done ? 'var(--accent)' : 'var(--text-muted)' }}
                    >
                      {formatTime(times.times[name])}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {STATES.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => set(name, s.id)}
                        className="min-h-9 rounded-lg border px-2.5 text-xs"
                        style={{
                          background: state === s.id ? 'var(--accent-soft)' : 'transparent',
                          borderColor: state === s.id ? 'var(--accent)' : 'var(--border)',
                          color: state === s.id ? 'var(--text)' : 'var(--text-faint)',
                        }}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>

        <p className="mt-3 text-xs" style={{ color: 'var(--text-faint)' }}>
          Sunrise {formatTime(times.sunrise)} · last third of the night from {formatTime(times.lastThird)}
        </p>
      </section>

      <section className="mb-8">
        <SectionHeading>Last four weeks</SectionHeading>
        <Card>
          <div className="grid grid-cols-7 gap-1.5">
            {history.map((d) => {
              const done = Object.values(d.prayers).filter((p) => p === 'prayed' || p === 'jamaah').length;
              return (
                <div
                  key={d.date}
                  title={`${d.date} — ${done}/5`}
                  className="aspect-square rounded-md border"
                  style={{
                    background:
                      done === 0 ? 'transparent' : `color-mix(in srgb, var(--accent) ${done * 20}%, transparent)`,
                    borderColor: 'var(--border)',
                  }}
                />
              );
            })}
          </div>
          <Muted>A record, not a report card. Empty squares are just days.</Muted>
        </Card>
      </section>

      <section id="adhkar">
        <SectionHeading>Adhkār</SectionHeading>
        <div className="mb-3">
          <Choice options={SLOTS} value={slot} onChange={setSlot} />
        </div>
        <ul className="space-y-3">
          {ADHKAR.filter((d) => d.slot.includes(slot)).map((d) => (
            <li key={d.id}>
              <Card>
                <p className="arabic">{d.arabic}</p>
                <p className="mt-2 text-sm italic" style={{ color: 'var(--text-muted)' }}>
                  {d.translit}
                </p>
                <p className="mt-1 text-sm">{d.meaning}</p>
                {d.note && (
                  <p className="mt-2 text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                    {d.note}
                  </p>
                )}
                <p className="mt-2 text-[11px]" style={{ color: 'var(--text-faint)' }}>
                  {d.count ? `×${d.count} · ` : ''}
                  {d.source}
                </p>
              </Card>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs leading-relaxed" style={{ color: 'var(--text-faint)' }}>
          The English here is a plain sense of the meaning written for this app, not a formal
          translation. Sources are named so anything can be checked against a proper edition.
        </p>
      </section>
    </Page>
  );
}
