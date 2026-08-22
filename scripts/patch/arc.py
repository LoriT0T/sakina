p = 'src/lib/audio/webaudio.ts'
s = open(p).read()

s = s.replace(
"import { SECTION_SPEC, type Play } from '@/lib/script/plan';",
"import { SECTION_SPEC, type Play, type SectionSpec } from '@/lib/script/plan';")

s = s.replace(
"""export interface AssembleArgs {
  plays: Play[];
  audio: Map<string, ChunkPcm>;
  settings: TrackSettings;
  onProgress?: (message: string) => void;
}""",
"""export interface AssembleArgs {
  plays: Play[];
  audio: Map<string, ChunkPcm>;
  settings: TrackSettings;
  /**
   * Which arc the plays belong to. Affirmations and meditations have different phases and
   * different time budgets, and the re-timing pass below needs the right one to scale against.
   * Defaults to the affirmation arc.
   */
  arc?: SectionSpec[];
  onProgress?: (message: string) => void;
}""")

s = s.replace(
"""  const { plays, audio, settings } = args;
  const say = args.onProgress ?? (() => {});
  const fs = ASSEMBLY_SAMPLE_RATE;""",
"""  const { plays, audio, settings } = args;
  const say = args.onProgress ?? (() => {});
  const fs = ASSEMBLY_SAMPLE_RATE;
  const specs = args.arc ? new Map(args.arc.map((s) => [s.section, s])) : SECTION_SPEC;
  // Only the affirmation arc ends in a silent fade section; a meditation's Return phase is
  // spoken right to the end.
  const fadeShare = specs.get('fade')?.share ?? 0;""")

s = s.replace("  for (const spec of SECTION_SPEC.values()) {", "  for (const spec of specs.values()) {")

s = s.replace(
"""  // The fade section is silence under the bed.
  const fadeSamples = Math.round(SECTION_SPEC.get('fade')!.share * settings.minutes * 60 * fs);""",
"""  // The fade section is silence under the bed. Meditations have none.
  const fadeSamples = Math.round(fadeShare * settings.minutes * 60 * fs);""")

open(p, 'w').write(s)
print('assembler arc-aware')
