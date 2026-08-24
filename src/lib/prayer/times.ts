'use client';

import { CalculationMethod, Coordinates, Madhab, PrayerTimes, SunnahTimes } from 'adhan';
import type { PrayerName } from '@/lib/types';

/**
 * Salah times.
 *
 * Computed on the device with `adhan` — no network call, and no location sent anywhere. That
 * matters more here than usual: a prayer-time lookup service receives a precise location and a
 * religious affiliation in the same request, and there is no reason to hand that to anyone.
 */

export interface PlaceSettings {
  latitude: number;
  longitude: number;
  /** Free text, only so the choice is visible. */
  label: string;
  method: keyof typeof CalculationMethod;
  madhab: 'shafi' | 'hanafi';
}

const STORAGE = 'sakina.place';

/* Kuwait, matching Diwan's default (2026-08-25) — an unset device must not
   show Derby times here while the hub shows Kuwait. A place saved on the
   device, or synced from the account, still wins. */
export const DEFAULT_PLACE: PlaceSettings = {
  latitude: 29.3759,
  longitude: 47.9774,
  label: 'Kuwait City',
  method: 'Kuwait',
  madhab: 'shafi',
};

export function getPlace(): PlaceSettings {
  if (typeof localStorage === 'undefined') return DEFAULT_PLACE;
  try {
    const raw = localStorage.getItem(STORAGE);
    return raw ? { ...DEFAULT_PLACE, ...(JSON.parse(raw) as Partial<PlaceSettings>) } : DEFAULT_PLACE;
  } catch {
    return DEFAULT_PLACE;
  }
}

export function setPlace(p: PlaceSettings): void {
  localStorage.setItem(STORAGE, JSON.stringify(p));
}

export const CALCULATION_METHODS: Array<{ id: keyof typeof CalculationMethod; label: string }> = [
  { id: 'MoonsightingCommittee', label: 'Moonsighting Committee — suits UK latitudes' },
  { id: 'MuslimWorldLeague', label: 'Muslim World League' },
  { id: 'UmmAlQura', label: 'Umm al-Qura, Makkah' },
  { id: 'Egyptian', label: 'Egyptian General Authority' },
  { id: 'Karachi', label: 'Islamic Sciences, Karachi' },
  { id: 'NorthAmerica', label: 'ISNA, North America' },
  { id: 'Dubai', label: 'Dubai' },
  { id: 'Qatar', label: 'Qatar' },
  { id: 'Kuwait', label: 'Kuwait' },
  { id: 'Turkey', label: 'Diyanet, Turkey' },
];

export interface DayTimes {
  times: Record<PrayerName, Date>;
  sunrise: Date;
  lastThird: Date;
  middleOfNight: Date;
}

export function timesFor(date: Date, place: PlaceSettings = getPlace()): DayTimes {
  const coords = new Coordinates(place.latitude, place.longitude);
  const params = CalculationMethod[place.method]();
  params.madhab = place.madhab === 'hanafi' ? Madhab.Hanafi : Madhab.Shafi;
  const pt = new PrayerTimes(coords, date, params);
  const sunnah = new SunnahTimes(pt);

  return {
    times: { fajr: pt.fajr, dhuhr: pt.dhuhr, asr: pt.asr, maghrib: pt.maghrib, isha: pt.isha },
    sunrise: pt.sunrise,
    lastThird: sunnah.lastThirdOfTheNight,
    middleOfNight: sunnah.middleOfTheNight,
  };
}

export interface NextPrayer {
  name: PrayerName;
  at: Date;
  msAway: number;
  /** The prayer whose window we are currently inside, if any. */
  current: PrayerName | null;
}

/** Which prayer is next, rolling into tomorrow's Fajr after Isha. */
export function nextPrayer(now = new Date(), place: PlaceSettings = getPlace()): NextPrayer {
  const today = timesFor(now, place);
  const order: PrayerName[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

  let current: PrayerName | null = null;
  for (const name of order) {
    if (today.times[name].getTime() <= now.getTime()) current = name;
  }

  for (const name of order) {
    const at = today.times[name];
    if (at.getTime() > now.getTime()) {
      return { name, at, msAway: at.getTime() - now.getTime(), current };
    }
  }

  const tomorrow = timesFor(new Date(now.getTime() + 24 * 3600 * 1000), place);
  return {
    name: 'fajr',
    at: tomorrow.times.fajr,
    msAway: tomorrow.times.fajr.getTime() - now.getTime(),
    current,
  };
}

export function formatTime(d: Date): string {
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
}

export function formatAway(ms: number): string {
  const mins = Math.max(0, Math.round(ms / 60000));
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export const PRAYER_LABEL: Record<PrayerName, string> = {
  fajr: 'Fajr',
  dhuhr: 'Dhuhr',
  asr: 'Asr',
  maghrib: 'Maghrib',
  isha: 'Isha',
};

export const PRAYER_ARABIC: Record<PrayerName, string> = {
  fajr: 'الفجر',
  dhuhr: 'الظهر',
  asr: 'العصر',
  maghrib: 'المغرب',
  isha: 'العشاء',
};

/** Local YYYY-MM-DD. Never derived from toISOString, which is UTC and shifts the day. */
export function isoDate(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
