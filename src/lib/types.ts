/** Shared domain types. Kept free of browser/node specifics so both sides can import. */

/** The seven sanctioned framings. See docs/AFFIRMATION-DESIGN.md §3–§8. */
export type Pattern =
  | 'process'
  | 'evidence'
  | 'compassion'
  | 'values'
  | 'intention'
  | 'ambivalence'
  | 'sensory'
  // Scripting-style forms. See docs/AFFIRMATION-STYLE.md §2.
  | 'gratitude'
  | 'having'
  | 'identity'
  | 'capability'
  | 'feeling'
  | 'reciprocity'
  | 'trust';

export const PATTERNS: Pattern[] = [
  'process',
  'evidence',
  'compassion',
  'values',
  'intention',
  'ambivalence',
  'sensory',
  'gratitude',
  'having',
  'identity',
  'capability',
  'feeling',
  'reciprocity',
  'trust',
];

export const PATTERN_LABEL: Record<Pattern, string> = {
  process: 'Process',
  evidence: 'Evidence-anchored',
  compassion: 'Self-compassion',
  values: 'Values',
  intention: 'Implementation intention',
  ambivalence: 'Permitted ambivalence',
  sensory: 'Sensory',
  gratitude: 'Gratitude',
  having: 'Already having',
  identity: 'Identity',
  capability: 'Capability',
  feeling: 'Feeling',
  reciprocity: 'Reciprocity',
  trust: 'Trust',
};

/** Sections of the descending arc. See docs/AFFIRMATION-DESIGN.md §8 and the brief §3. */
export type Section =
  // Affirmation arc
  | 'arrival'
  | 'downshift'
  | 'core'
  | 'second'
  | 'dissolution'
  | 'fade'
  // Meditation arc. See docs/MEDITATION-DESIGN.md section 3.
  | 'practice'
  | 'return';

/** The six phases of an affirmation track. */
export type AffirmationSection =
  | 'arrival' | 'downshift' | 'core' | 'second' | 'dissolution' | 'fade';

/** The three phases of a meditation. */
export type MeditationSection = 'arrival' | 'practice' | 'return';

export interface Goal {
  id: string;
  /** The goal in the listener's own words. */
  text: string;
  /** Why it matters — the values anchor. */
  why: string;
  /** What specifically gets in the way — feeds implementation intentions. */
  obstacle: string;
  /** A past moment they handled it well — the evidence anchor. */
  evidence: string;
  /** 1–10. Below 4 restricts phrasing to process/compassion/values/intention. */
  believability: number;
  /** Relative share of track time. */
  weight: number;
  /** Marks the goal as addiction / mental-health, triggering the stricter rules (§7). */
  sensitive: boolean;
}

export interface Line {
  id: string;
  text: string;
  pattern: Pattern;
  section: Section;
  /**
   * Lines sharing a cluster are restatements of ONE affirmation and are always spoken
   * consecutively, with a shorter gap between them than between clusters. See
   * docs/AFFIRMATION-STYLE.md §2a.
   */
  clusterId?: string;
  /** Goal this line serves; null for arrival/downshift/fade material. */
  goalId: string | null;
  /** User locked this line — regeneration must leave it alone. */
  locked?: boolean;
}

export interface Script {
  lines: Line[];
  /** Core affirmations get cycled; this records the repeat plan actually used. */
  cycles: number;
}

export interface Intake {
  goals: Goal[];
  /** Optional free note passed to the writer for tone/context. */
  note?: string;
}

/**
 * Which writing voice to use.
 *
 * `scripting` is the style measured from the listener's reference tracks — first person,
 * present tense, gratitude-led, spoken as already true. See docs/AFFIRMATION-STYLE.md.
 * `process` is the research-led style — "I am learning to…", implementation intentions,
 * permitted ambivalence. See docs/AFFIRMATION-DESIGN.md.
 */
export type WritingStyle = 'scripting' | 'process';

/** How much silence sits between lines. See PACING_MULTIPLIER. */
export type Pacing = 'close' | 'normal' | 'spacious';

/** What a generated track is. Decides which writer and which ruleset applies. */
export type TrackKind = 'affirmation' | 'meditation';

/** Meditation techniques. See docs/MEDITATION-DESIGN.md §5. */
export type MeditationTechnique =
  | 'body-scan'
  | 'breath'
  | 'letting-go'
  | 'loving-kindness'
  | 'gratitude'
  | 'sleep';

export interface TrackSettings {
  voice: string;
  /** Defaults to 'affirmation'. */
  kind?: TrackKind;
  /** Affirmations only. Defaults to 'scripting'. */
  style?: WritingStyle;
  /** Meditations only. */
  technique?: MeditationTechnique;
  /** How closely the guidance is spaced. Meditations default to 'normal'. */
  guidance?: Pacing;
  /** Silence between lines. Defaults to 'normal'. */
  pacing?: Pacing;
  bed: 'none' | 'pink' | 'brown' | 'rain';
  bedLevelDb: number;
  /** Total target minutes. 60 by default; shorter is allowed for testing. */
  minutes: number;
}

export interface TrackMeta {
  id: string;
  name: string;
  createdAt: number;
  intake: Intake;
  settings: TrackSettings;
  script: Script;
  /** Measured after assembly. */
  measured?: Measurement;
  /** Which container actually got stored. */
  mime: string;
  bytes: number;
  durationSec: number;
}

export interface Measurement {
  durationSec: number;
  integratedLufs: number;
  truePeakDb: number;
  lra: number;
  /** RMS dBFS per generated chunk, in order — used to spot voice drift across seams. */
  chunkRmsDb: number[];
  chunkRmsStdDb: number;
  /** Estimated speaking rate per chunk, words per minute of speech. */
  chunkWpm: number[];
  /** Per-minute RMS dBFS of the finished track. Reported, but see minutePeakDb. */
  minuteRmsDb: number[];
  /**
   * Per-minute peak dBFS. This is the series the "nothing gets louder after minute four"
   * constraint is judged on — the loudest moment in a minute is what could wake someone,
   * whereas per-minute RMS mostly tracks how much of that minute was silence.
   */
  minutePeakDb: number[];
  monotonicAfterMin4: boolean;
}

// ---------------------------------------------------------------------------
// Daily practice — prayer, mood, journal
// ---------------------------------------------------------------------------

export type PrayerName = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';

export const PRAYER_NAMES: PrayerName[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

export type PrayerState = 'none' | 'prayed' | 'jamaah' | 'late' | 'missed';

/** One day's salah record. Keyed by ISO date so a day is a single row. */
export interface PrayerDay {
  /** YYYY-MM-DD, local. */
  date: string;
  prayers: Record<PrayerName, PrayerState>;
  updatedAt: number;
}

/**
 * A mood entry. Valence and energy rather than a single "how are you 1-10", because the two
 * come apart — tired-but-content and wired-but-miserable are different days, and a single
 * axis cannot tell them apart.
 */
export interface MoodEntry {
  id: string;
  at: number;
  /** -3 unpleasant … +3 pleasant. */
  valence: number;
  /** -3 depleted … +3 energised. */
  energy: number;
  /** Free-choice labels; never required. */
  tags: string[];
  note?: string;
}

export interface JournalEntry {
  id: string;
  at: number;
  /** The prompt shown, if the entry came from one. */
  prompt?: string;
  text: string;
  /** Optional mood captured alongside the entry. */
  moodId?: string;
}

export interface ValidationIssue {
  lineId: string;
  rule: string;
  severity: 'error' | 'warn';
  message: string;
  /** The exact matched text, when there is one. */
  match?: string;
}
