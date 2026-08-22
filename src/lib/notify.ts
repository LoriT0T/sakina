'use client';

import { getPlace, nextPrayer, timesFor } from '@/lib/prayer/times';

/**
 * Reminders, and an honest account of what they can be.
 *
 * This app is static files on a CDN. There is no server, so there is no push server, so there
 * is no way to wake your phone when the app is closed — Web Push requires something to send
 * the push. The Notification Triggers API would do it locally, but it exists only in Chromium
 * behind a flag.
 *
 * So what is offered is what is actually deliverable: reminders that fire while the app is
 * open in a tab, including a backgrounded one. That covers the real case of leaving it open on
 * a phone or a second monitor, and it is described that way in the UI rather than dressed up as
 * something it is not.
 *
 * The alternative would be routing your prayer times and mood schedule through a server we
 * would then have to be trusted with. Not worth it for a reminder.
 */

const KEY = 'sakina.reminders';

export interface ReminderSettings {
  prayers: boolean;
  /** A mood check, at most this often. */
  moodEveryHours: number;
  /** An evening nudge to write something down, at this local hour. */
  journalHour: number | null;
}

const DEFAULTS: ReminderSettings = { prayers: false, moodEveryHours: 0, journalHour: null };

export function readReminders(): ReminderSettings {
  if (typeof window === 'undefined') return DEFAULTS;
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') };
  } catch {
    return DEFAULTS;
  }
}

export function writeReminders(s: ReminderSettings): void {
  localStorage.setItem(KEY, JSON.stringify(s));
}

export function notificationState(): 'unsupported' | NotificationPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

export async function askPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.requestPermission();
}

function show(title: string, body: string, tag: string): void {
  if (notificationState() !== 'granted') return;
  try {
    new Notification(title, { body, tag, silent: false });
  } catch {
    // Some browsers only permit notifications from a service worker context. Nothing to do.
  }
}

/**
 * The scheduler.
 *
 * One interval rather than a timer per reminder, because a tab that has been backgrounded for
 * hours wakes with its timers throttled and coalesced; a single minute-resolution tick that
 * re-derives what is due from the clock survives that, where a chain of setTimeouts does not.
 *
 * Fired reminders are recorded in localStorage rather than in memory so that a reload does not
 * re-fire everything that already went out today.
 */
const FIRED = 'sakina.reminders.fired';

function alreadyFired(id: string): boolean {
  try {
    const seen = JSON.parse(localStorage.getItem(FIRED) ?? '{}') as Record<string, number>;
    return typeof seen[id] === 'number';
  } catch {
    return false;
  }
}

function markFired(id: string): void {
  try {
    const seen = JSON.parse(localStorage.getItem(FIRED) ?? '{}') as Record<string, number>;
    const cutoff = Date.now() - 36 * 60 * 60 * 1000;
    const kept = Object.fromEntries(Object.entries(seen).filter(([, at]) => at > cutoff));
    kept[id] = Date.now();
    localStorage.setItem(FIRED, JSON.stringify(kept));
  } catch {
    // Storage full or blocked. A duplicate reminder is a better failure than a crash.
  }
}

function stamp(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function tick(): void {
  const s = readReminders();
  if (notificationState() !== 'granted') return;
  const now = new Date();

  if (s.prayers) {
    const { times } = timesFor(now, getPlace());
    for (const [name, at] of Object.entries(times)) {
      const due = at as Date;
      const id = `prayer:${name}:${stamp(now)}`;
      // Fire within the two minutes after the time passes, never before it and never hours late.
      const age = now.getTime() - due.getTime();
      if (age >= 0 && age < 2 * 60 * 1000 && !alreadyFired(id)) {
        markFired(id);
        show(name[0].toUpperCase() + name.slice(1), 'It is time.', id);
      }
    }
  }

  if (s.moodEveryHours > 0) {
    const slot = Math.floor(now.getHours() / s.moodEveryHours);
    const id = `mood:${stamp(now)}:${slot}`;
    // Only during waking hours. A mood check at 4am is not a kindness.
    if (now.getHours() >= 8 && now.getHours() <= 22 && !alreadyFired(id)) {
      markFired(id);
      show('How is it going?', 'A moment to name it, if you want to.', id);
    }
  }

  if (s.journalHour !== null && now.getHours() === s.journalHour) {
    const id = `journal:${stamp(now)}`;
    if (!alreadyFired(id)) {
      markFired(id);
      show('Anything worth writing down?', 'A line is enough.', id);
    }
  }
}

let timer: ReturnType<typeof setInterval> | null = null;

export function startReminders(): () => void {
  if (typeof window === 'undefined') return () => {};
  if (timer !== null) return () => {};
  tick();
  timer = setInterval(tick, 60_000);
  // A tab that comes back to the foreground may have missed ticks entirely.
  const onVisible = () => {
    if (document.visibilityState === 'visible') tick();
  };
  document.addEventListener('visibilitychange', onVisible);
  return () => {
    if (timer !== null) clearInterval(timer);
    timer = null;
    document.removeEventListener('visibilitychange', onVisible);
  };
}

/** The next thing due, for showing in the UI. Null when nothing is scheduled. */
export function nextReminderLabel(): string | null {
  const s = readReminders();
  if (!s.prayers) return null;
  const next = nextPrayer();
  return `${next.name} at ${next.at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}
