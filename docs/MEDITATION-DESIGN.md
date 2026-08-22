# Guided meditation — design and evidence

**Compiled 2026-08-15.** The meditation generator is built against this document. It exists
because guided meditation is **not** affirmations with different words — structurally the two
are near opposites, and building the second on the first's rules would produce something that
is neither.

---

## 1. Why meditation needed its own ruleset

| | Affirmations (`docs/AFFIRMATION-STYLE.md`) | Guided meditation |
|---|---|---|
| person | **first** — "I am someone who…" | **second** — "notice your breath" |
| body sensation | **banned outright** | **the core practice** |
| silence | pauses between claims | the pauses *are* the practice |
| repetition | each line said 2–3× | each cue given once, then space |
| tense | present, already true | present, observational |
| claims | asserts something is so | asserts nothing at all |

Every rule the affirmation validator enforces would forbid a competent body scan, and every
rule a body scan needs would wreck an affirmation track. So `MEDITATION_RULES` is a separate
ruleset and the validator is told which one applies.

## 2. What the evidence supports

- **Body scan meditation**: systematic review and meta-analysis, Gibson (2022).
  <https://pubmed.ncbi.nlm.nih.gov/35538557/>
- **Anxiety**: mindfulness-based therapy vs waitlist, Hedges' g ≈ 0.89; vs *active* control the
  effect drops to ≈ 0.38 — a reminder that much of the raw effect is expectancy and attention.
  For people with a diagnosed anxiety disorder, g ≈ 0.97 with effects maintained at follow-up.
- **Interoception**: meta-analysis finds mindfulness training improves some objective measures
  of body awareness, which is the mechanism a body scan is actually training.
  <https://www.nature.com/articles/s41598-025-22661-4>
- **Coronary patients**, anxiety/depression/stress: systematic review of RCTs.
  <https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2024.1435243/full>

Stated honestly: the vs-active-control number (0.38) is the one to believe. This app is not a
clinical intervention and does not claim to be one.

## 3. Structure — three acts

Standard across the practitioner literature, and what the generator produces:

| phase | share | purpose |
|---|---|---|
| **Arrival** | ~15% | Posture, settling, the first breaths. Permission to be here. |
| **Practice** | ~70% | The technique itself — body scan, breath, or the chosen object. |
| **Return** | ~15% | Widening attention, re-entering the room, agency restored. |

The **Return** is not decoration. Ending a meditation abruptly leaves people disoriented; the
convention is a gradual widening plus explicitly handing control back ("when you are ready, in
your own time"). The generator always writes it and always uses that language.

## 4. Pacing and silence

This is where meditation differs most from every other kind of script. The silence is the
practice; the words exist to point at it.

- **After an ordinary cue**: 3–5 seconds.
- **After an instruction that asks the listener to *do* something** (move attention, notice a
  sensation): 10–15 seconds. They cannot comply while being talked at.
- **Deep in the practice phase**: up to a minute of continuous silence is normal and correct.
- **Guidance density**: a cue every 30–60 seconds suits a beginner; more experienced listeners
  want longer gaps. Exposed as the `guidance` setting — `close`, `normal`, `spacious`.
- **Speaking pace**: slower than conversation. The same 86 wpm measured for the affirmation
  voice applies.

The most common failure named in the practitioner literature is **talking too much** — filling
the space the listener is supposed to be using. The generator is told this explicitly and the
line budget is derived from the pause schedule rather than the other way round.

## 5. Techniques offered

Each has its own prompt and its own progression:

- **Body scan** — attention moves through the body in order, one region at a time. The
  best-evidenced of the set, and the default.
- **Breath awareness** — attention rests at one place where breath is felt; the instruction is
  to notice, and to return without judgement when attention wanders.
- **Letting go / relaxation** — releasing tension region by region, paired with the out-breath.
- **Loving-kindness** — directed goodwill, in the traditional widening order: self, someone
  loved, someone neutral, someone difficult, everyone.
- **Gratitude** — attention to specific things already present, concretely, not abstractly.
- **Sleep** — a body scan that deliberately never returns; no rousing close, fading instead.

## 6. Language rules

**Required**
- Second person, present tense: "notice…", "let…", "see if you can…".
- **Invitational, never commanding.** "See if you can" / "you might" / "allow" rather than
  "clear your mind" or "you must". Permission language keeps a wandering mind from becoming a
  failure. This is the single most consistent instruction in the practitioner sources.
- Explicit permission for the mind to wander, and instructions for what to do when it does —
  because it will, and a listener who thinks that is failure will stop.
- Short sentences. One instruction per sentence.

**Banned**
- "Clear your mind", "empty your mind", "stop thinking" — not achievable, and sets up failure.
- Judgemental framing: "properly", "correctly", "you should be feeling".
- Promises of outcome: "this will cure your anxiety", "you will fall asleep".
- Medical or therapeutic claims of any kind.
- Anything mystical or metaphysical, matching the rest of the app.
- First person — that is the affirmation voice, and mixing them is disorienting.

## 7. Safety

Body-focused attention is not neutral for everyone: for some people with trauma histories,
interoceptive focus can increase distress rather than reduce it. The generator therefore:

- Always offers an anchor out — eyes open, feet on the floor, attention to sound instead of
  body — early in the track rather than as an afterthought.
- Never instructs anyone to stay with a sensation that is distressing.
- Carries the same not-treatment note as the rest of the app.
