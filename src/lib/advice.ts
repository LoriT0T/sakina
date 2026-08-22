import type { MoodEntry, PrayerDay } from './types';

/**
 * What the app offers you during the day.
 *
 * Two deliberate limits. It is not advice in the clinical sense and never tells you what is
 * wrong with you — every item is either a small concrete action or a question you answer
 * yourself. And it is written here rather than generated, because a language model producing
 * unprompted mental-health commentary about a real person's logged mood is a bad idea: it
 * would be confidently wrong sometimes, and there is no way to tell which times.
 *
 * Selection is deterministic given the day, so it does not reshuffle every render and start
 * feeling like a slot machine.
 */

export type AdviceKind = 'practice' | 'question' | 'orientation';

export interface Advice {
  id: string;
  kind: AdviceKind;
  text: string;
  /** Shown smaller, underneath. Why this, or how to do it. */
  detail?: string;
}

const MORNING: Advice[] = [
  {
    id: 'm-first-hour',
    kind: 'question',
    text: 'What is the first hour of today actually for?',
    detail: 'Naming one thing beats a list. The rest of the day can be decided later.',
  },
  {
    id: 'm-one-thing',
    kind: 'practice',
    text: 'Pick the one task you would be relieved to have finished by tonight.',
    detail: 'Not the easiest and not the largest — the one that is quietly costing you something while it sits there.',
  },
  {
    id: 'm-body',
    kind: 'practice',
    text: 'Drink water and get daylight on your face before you open anything with a screen.',
    detail: 'Both are unglamorous and both change how the next four hours feel.',
  },
  {
    id: 'm-intention',
    kind: 'orientation',
    text: 'Say what you intend today to be in service of.',
    detail: 'A day with a stated purpose is easier to steer at 3pm when it starts drifting.',
  },
];

const MIDDAY: Advice[] = [
  {
    id: 'd-drift',
    kind: 'question',
    text: 'Are you working on what you chose, or on what arrived?',
    detail: 'No judgement in the answer. It is just worth knowing which one is happening.',
  },
  {
    id: 'd-pause',
    kind: 'practice',
    text: 'Stand up, and take one breath that is slower than the last one.',
    detail: 'That is the whole instruction. It takes eight seconds.',
  },
  {
    id: 'd-unfinished',
    kind: 'orientation',
    text: 'An unfinished thing is not evidence about you.',
    detail: 'It is evidence about the amount of time that has passed. Those are different facts.',
  },
  {
    id: 'd-hardest',
    kind: 'practice',
    text: 'If something has been avoided all morning, give it ten minutes — not more.',
    detail: 'Ten minutes is short enough to start and usually long enough to break the avoidance.',
  },
];

const EVENING: Advice[] = [
  {
    id: 'e-one-good',
    kind: 'question',
    text: 'What went right today that you have not given yourself credit for?',
    detail: 'Small counts. The bar is "true", not "impressive".',
  },
  {
    id: 'e-close',
    kind: 'practice',
    text: 'Write down the thing you are carrying into tomorrow, then stop working.',
    detail: 'Held in the head it circles. Written down it waits.',
  },
  {
    id: 'e-tomorrow',
    kind: 'orientation',
    text: 'Tomorrow does not need to be decided tonight.',
    detail: 'Late-evening planning is usually anxiety wearing a productivity costume.',
  },
];

const NIGHT: Advice[] = [
  {
    id: 'n-enough',
    kind: 'orientation',
    text: 'The day is finished, whatever is in it.',
    detail: 'Nothing further can be added to it now, which is the one genuinely restful fact available at this hour.',
  },
  {
    id: 'n-sleep',
    kind: 'practice',
    text: 'If the mind is still going, put a track on and let it talk instead.',
    detail: 'Anything you generate here is built to be listened to on the way down, not concentrated on.',
  },
];

function partOfDay(now: Date): 'morning' | 'midday' | 'evening' | 'night' {
  const h = now.getHours();
  if (h >= 4 && h < 11) return 'morning';
  if (h >= 11 && h < 17) return 'midday';
  if (h >= 17 && h < 22) return 'evening';
  return 'night';
}

/** Stable pseudo-random index from a string, so a given day picks the same item all day. */
function hashIndex(seed: string, length: number): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) % Math.max(1, length);
}

export interface DailyGuidance {
  advice: Advice;
  /** A gentle observation from the logs, or null when there is nothing honest to say. */
  observation: string | null;
}

/**
 * Observations are drawn only from what has actually been logged, and only when there is
 * enough of it to mean something. Silence is preferable to a confident remark about three data
 * points.
 */
function observe(moods: MoodEntry[], prayers: PrayerDay[]): string | null {
  const recentMoods = moods.filter((m) => Date.now() - m.at < 7 * 864e5);

  if (recentMoods.length >= 4) {
    const avgEnergy = recentMoods.reduce((a, m) => a + m.energy, 0) / recentMoods.length;
    const avgValence = recentMoods.reduce((a, m) => a + m.valence, 0) / recentMoods.length;
    if (avgEnergy <= -1.5 && avgValence > -1) {
      return 'Your last few check-ins have been low on energy but not low in mood. That pattern usually points at sleep or load rather than at anything being wrong with you.';
    }
    if (avgValence <= -1.5) {
      return 'This week has been logged as mostly unpleasant. That is worth noticing rather than pushing through — and worth telling someone real if it continues.';
    }
    if (avgValence >= 1.5 && avgEnergy >= 1) {
      return 'A good stretch, by your own logs. Worth knowing what is different about it.';
    }
  }

  const last7 = prayers.slice(-7);
  const logged = last7.filter((d) => Object.values(d.prayers).some((p) => p !== 'none'));
  if (logged.length >= 5) {
    const onTime = last7.reduce(
      (a, d) => a + Object.values(d.prayers).filter((p) => p === 'prayed' || p === 'jamaah').length,
      0,
    );
    if (onTime >= 30) return 'Nearly every prayer logged this week. That is the backbone holding the rest up.';
    if (onTime >= 20) return 'Most prayers logged this week.';
  }

  return null;
}

export function guidanceFor(
  now: Date,
  moods: MoodEntry[] = [],
  prayers: PrayerDay[] = [],
): DailyGuidance {
  const part = partOfDay(now);
  const pool = part === 'morning' ? MORNING : part === 'midday' ? MIDDAY : part === 'evening' ? EVENING : NIGHT;
  const seed = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${part}`;
  return { advice: pool[hashIndex(seed, pool.length)], observation: observe(moods, prayers) };
}

export function greeting(now = new Date()): string {
  const h = now.getHours();
  if (h >= 4 && h < 11) return 'Morning';
  if (h >= 11 && h < 17) return 'Afternoon';
  if (h >= 17 && h < 22) return 'Evening';
  return 'Late';
}
