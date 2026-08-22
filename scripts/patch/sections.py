import re
p = 'src/lib/types.ts'
s = open(p).read()
old = "export type Section = 'arrival' | 'downshift' | 'core' | 'second' | 'dissolution' | 'fade';"
new = """export type Section =
  // Affirmation arc
  | 'arrival'
  | 'downshift'
  | 'core'
  | 'second'
  | 'dissolution'
  | 'fade'
  // Meditation arc. See docs/MEDITATION-DESIGN.md section 3.
  | 'practice'
  | 'return';"""
assert old in s
open(p, 'w').write(s.replace(old, new))
print('sections updated')
