p = 'src/lib/db.ts'
s = open(p).read()

s = s.replace(
"""import type { Intake, Script, TrackMeta, TrackSettings } from './types';""",
"""import type {
  Intake,
  JournalEntry,
  MoodEntry,
  PrayerDay,
  PrayerName,
  PrayerState,
  Script,
  TrackMeta,
  TrackSettings,
} from './types';""")

s = s.replace(
"""  /** Spoken chunks, keyed by a hash of everything that can change the audio. */
  chunks: { key: string; value: { hash: string; pcm: ArrayBuffer; at: number } };
}""",
"""  /** Spoken chunks, keyed by a hash of everything that can change the audio. */
  chunks: { key: string; value: { hash: string; pcm: ArrayBuffer; at: number } };
  /** One row per day, keyed by local ISO date. */
  prayers: { key: string; value: PrayerDay };
  moods: { key: string; value: MoodEntry; indexes: { at: number } };
  journal: { key: string; value: JournalEntry; indexes: { at: number } };
}""")

s = s.replace("const DB_VERSION = 2;", "const DB_VERSION = 3;")

s = s.replace(
"""        if (oldVersion < 2) {
          d.createObjectStore('chunks', { keyPath: 'hash' });
        }""",
"""        if (oldVersion < 2) {
          d.createObjectStore('chunks', { keyPath: 'hash' });
        }
        if (oldVersion < 3) {
          d.createObjectStore('prayers', { keyPath: 'date' });
          d.createObjectStore('moods', { keyPath: 'id' }).createIndex('at', 'at');
          d.createObjectStore('journal', { keyPath: 'id' }).createIndex('at', 'at');
        }""")

s = s.replace(
"""/** Rough storage footprint, so the library can show it without guessing. */""",
"""// ---------------------------------------------------------------------------
// Daily practice
// ---------------------------------------------------------------------------

const EMPTY_DAY: Record<PrayerName, PrayerState> = {
  fajr: 'none',
  dhuhr: 'none',
  asr: 'none',
  maghrib: 'none',
  isha: 'none',
};

export async function getPrayerDay(date: string): Promise<PrayerDay> {
  const row = await (await db()).get('prayers', date);
  return row ?? { date, prayers: { ...EMPTY_DAY }, updatedAt: 0 };
}

export async function setPrayerState(
  date: string,
  prayer: PrayerName,
  state: PrayerState,
): Promise<PrayerDay> {
  const day = await getPrayerDay(date);
  const next: PrayerDay = {
    ...day,
    prayers: { ...day.prayers, [prayer]: state },
    updatedAt: Date.now(),
  };
  await (await db()).put('prayers', next);
  return next;
}

/** The last `days` days, oldest first, with gaps filled in as empty. */
export async function recentPrayerDays(days = 30, today = new Date()): Promise<PrayerDay[]> {
  const d = await db();
  const out: PrayerDay[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const at = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
    const key = `${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, '0')}-${String(at.getDate()).padStart(2, '0')}`;
    out.push((await d.get('prayers', key)) ?? { date: key, prayers: { ...EMPTY_DAY }, updatedAt: 0 });
  }
  return out;
}

export async function addMood(entry: MoodEntry): Promise<void> {
  await (await db()).put('moods', entry);
}

export async function listMoods(limit = 200): Promise<MoodEntry[]> {
  const all = await (await db()).getAllFromIndex('moods', 'at');
  return all.reverse().slice(0, limit);
}

export async function deleteMood(id: string): Promise<void> {
  await (await db()).delete('moods', id);
}

export async function addJournalEntry(entry: JournalEntry): Promise<void> {
  await (await db()).put('journal', entry);
}

export async function listJournal(limit = 200): Promise<JournalEntry[]> {
  const all = await (await db()).getAllFromIndex('journal', 'at');
  return all.reverse().slice(0, limit);
}

export async function deleteJournalEntry(id: string): Promise<void> {
  await (await db()).delete('journal', id);
}

/**
 * Everything the app holds, as one JSON blob.
 *
 * This exists because the data is deliberately trapped on one device — no account, no server.
 * That is the right default for a prayer log and a journal, but it makes the browser a single
 * point of failure, so there has to be a way out.
 */
export async function exportEverything(): Promise<Record<string, unknown>> {
  const d = await db();
  return {
    exportedAt: new Date().toISOString(),
    version: DB_VERSION,
    tracks: await d.getAll('tracks'),
    drafts: await d.getAll('drafts'),
    prayers: await d.getAll('prayers'),
    moods: await d.getAll('moods'),
    journal: await d.getAll('journal'),
  };
}

/** Rough storage footprint, so the library can show it without guessing. */""")

open(p, 'w').write(s)
print('db extended')
