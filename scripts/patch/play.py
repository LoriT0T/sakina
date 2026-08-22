p = 'src/lib/meditation/plan.ts'
s = open(p).read()
s = s.replace(
"""export interface MeditationPlay {
  chunk: MeditationChunk;
  pauses: number[];
}""",
"""export interface MeditationPlay {
  chunk: MeditationChunk;
  pauses: number[];
  /**
   * Always 0. Meditations never repeat — a looped practice would be a different one. The field
   * exists only so a play is structurally the same shape the shared assembler expects.
   */
  cycle: number;
}""")
s = s.replace(
"      plays.push({ chunk, pauses: chunk.pauses.map((p) => p * scale) });",
"      plays.push({ chunk, pauses: chunk.pauses.map((p) => p * scale), cycle: 0 });")
open(p, 'w').write(s)
print('meditation play shape aligned')
