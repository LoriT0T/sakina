import re

# 1. Name the two arcs' section sets so exhaustive records target the right one.
p='src/lib/types.ts'; s=open(p).read()
s = s.replace("""  | 'practice'
  | 'return';""", """  | 'practice'
  | 'return';

/** The six phases of an affirmation track. */
export type AffirmationSection =
  | 'arrival' | 'downshift' | 'core' | 'second' | 'dissolution' | 'fade';

/** The three phases of a meditation. */
export type MeditationSection = 'arrival' | 'practice' | 'return';""")
open(p,'w').write(s)

# 2. Affirmation prompt tables cover only the affirmation arc.
p='src/lib/gemini/script.ts'; s=open(p).read()
s = s.replace("Record<Exclude<Section, 'fade'>, (n: number, uniqueCore: number) => string>",
              "Record<Exclude<AffirmationSection, 'fade'>, (n: number, uniqueCore: number) => string>")
s = s.replace("Record<Exclude<Section, 'fade'>, (n: number) => string>",
              "Record<Exclude<AffirmationSection, 'fade'>, (n: number) => string>")
s = s.replace("const key = section as Exclude<Section, 'fade'>;",
              "const key = section as Exclude<AffirmationSection, 'fade'>;")
s = s.replace("import type { Goal, Intake, Line, Pattern, Section, WritingStyle } from '@/lib/types';",
              "import type {\n  AffirmationSection,\n  Goal,\n  Intake,\n  Line,\n  Pattern,\n  Section,\n  WritingStyle,\n} from '@/lib/types';")
open(p,'w').write(s)

# 3. Section average word counts are an affirmation-arc table.
p='src/lib/script/plan.ts'; s=open(p).read()
s = s.replace("const SECTION_AVG_WORDS: Record<Section, number> = {",
              "const SECTION_AVG_WORDS: Record<AffirmationSection, number> = {")
s = s.replace("export function targetLineCounts(totalMinutes = 60): Record<Section, number> {\n  const out = {} as Record<Section, number>;",
              "export function targetLineCounts(totalMinutes = 60): Record<Section, number> {\n  const out = {} as Record<Section, number>;")
s = s.replace("import type { Goal, Line, Script, Section } from '@/lib/types';",
              "import type { AffirmationSection, Goal, Line, Script, Section } from '@/lib/types';")
s = s.replace("    const avgSpeech = (SECTION_AVG_WORDS[spec.section] / SPEECH_WPM) * 60;",
              "    const avgSpeech = ((SECTION_AVG_WORDS[spec.section as AffirmationSection] ?? 9) / SPEECH_WPM) * 60;")
open(p,'w').write(s)

# 4. The voice style preamble applies to every phase of both arcs.
p='src/lib/gemini/style.ts'; s=open(p).read()
s = s.replace("""  fade: 'Barely voiced, trailing off, the quietest reading of all.',""",
"""  fade: 'Barely voiced, trailing off, the quietest reading of all.',
  // Meditation phases. Guidance is spoken a little more openly than an affirmation, because
  // the listener is being asked to follow an instruction rather than absorb a statement.
  practice: 'Unhurried and even, leaving room after each instruction.',
  return: 'Gently warming, still quiet, without becoming brisk.',""")
open(p,'w').write(s)
print('narrowed')
