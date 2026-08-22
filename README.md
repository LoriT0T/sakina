# Sakina

**سكينة** — the stillness that settles on a heart.

Five things in one place, because they are the same day: the five prayers and the adhkar around
them, guided meditation you generate rather than scroll for, affirmations written from your own
words, a note of how you are, and somewhere to write it down.

It runs entirely in your browser. No account, no server, no database — the data is in this
device's storage and there is nowhere else for it to be.

**Live: <https://lorit0t.github.io/sakina/>**

This grew out of [Nightscript](https://lorit0t.github.io/nightscript/), which did the
affirmation half and nothing else. The audio pipeline, the writing rules and the player came
across intact; everything above them is new.

---

## The five parts

### Today

Where you are in the day. The next prayer with one-tap marking, one piece of guidance drawn
from what you have actually logged rather than generated fresh each time, a mood dial, and the
dhikr that belongs to this part of the day.

### Prayer

Times are computed **on this device** with [`adhan`](https://github.com/batoulapps/adhan-js)
from coordinates you set — no lookup, no network, works on a plane. Calculation method and
madhab are yours to choose.

Each prayer has five states rather than a checkbox: not yet, prayed, on time, in congregation,
missed. A binary flattens on-time and late into the same mark and turns the difference into
guilt. The 28-day grid shows what happened. It does not grade it.

Ten well-known adhkar, sorted by the part of day they belong to. The Arabic is as transmitted;
the English is a plain rendering written for this app, not a reproduction of a published
translation.

### Meditation

Researched before it was built — see **[docs/MEDITATION-DESIGN.md](docs/MEDITATION-DESIGN.md)**.
The finding that shaped everything: a meditation is *structurally inverted* from an affirmation.

| | affirmations | meditation |
|---|---|---|
| person | first — "I am…" | second — "notice where…" |
| body sensation | **banned** | **required** |
| silence | spacing between lines | **the practice itself** |
| tense | present, already true | present, happening now |
| what it claims | something about you | nothing |

So it does not share a writer, a validator or an arc with the affirmation path. Six techniques
(breath, body scan, loving-kindness, letting go, gratitude, sleep), three phases (arrival 15%,
practice 70%, return 15%), and silence budgeted **first** with the words fitted into what is
left — a ten-minute sit is about ninety seconds of speech.

The rules it will not break: never "clear your mind" (nobody can, and the instruction manufactures
a failure), never a promised outcome, never a medical claim, never telling someone in distress to
stay with it — interoceptive focus increases distress for some people. It says early that a
wandering mind is not a failure, because that belief is what makes people quit.

### Affirmations

Two styles, and they genuinely conflict:

- **`scripting`** (default) — the measured reference style. First person, present tense, spoken
  as already true, each line said **two or three times over** before moving on. No body
  sensation, no scene-setting, no manifestation vocabulary.
- **`process`** — the research-led one. "I am learning to…", implementation intentions, permitted
  ambivalence, gated on how believable you say the goal is.

Rate a goal below 4 out of 10 for how true it already feels and flat claims are dropped
entirely: unbelieved self-statements measurably leave people feeling worse. Mark a goal as
touching addiction or mental health and shame language, "never again" absolutes and
failure framing go with them, replaced by urge-surfing and specific plans.

**[docs/AFFIRMATION-DESIGN.md](docs/AFFIRMATION-DESIGN.md)** carries the evidence and names the
three places it contradicts the obvious design. **[docs/AFFIRMATION-STYLE.md](docs/AFFIRMATION-STYLE.md)**
carries the measured style, and §4 says plainly where the two disagree.

### Journal and mood

Mood on two axes — pleasant/unpleasant and high/low energy — because one axis cannot tell apart
anxious and content-but-tired, and those want opposite responses. Tags, an optional note, and a
free-write with a prompt that changes daily. Everything is listed back, and everything exports.

---

## Your key

Generating audio needs a Gemini API key. You paste it once; it is stored in that browser's
localStorage and sent to exactly one place — Google's API.

Static hosting cannot keep a shared key secret, so bring-your-own is the only honest arrangement
here. Two things had to be verified against the live API before it could work at all:

- **CORS is allowed** from a `github.io` origin — preflight returns 200 with the origin echoed.
- **Only `content-type` and `x-goog-api-key` may be sent.** A preflight that also asked for
  `api-revision` returned **403**. Since the docs call `Api-Revision` required for streaming,
  this looked fatal. It is not — both endpoints work without it.

**[docs/GEMINI-TTS.md](docs/GEMINI-TTS.md)** documents the interface as actually verified,
including where the published docs are wrong.

---

## Reminders, honestly

Reminders fire **only while Sakina is open in a tab** — backgrounded is fine, closed is not.

Web Push needs a server to push from, and there isn't one. The Notification Triggers API would
do it locally but exists only in Chromium behind a flag. The alternative would be sending your
prayer times and your schedule to a server you would then have to trust. Not worth it for a
reminder. Add it to your home screen and it behaves like an app.

---

## Running it

```bash
npm install
```

```bash
npm run dev
```

```bash
npm test
```

Voice auditions (once; cached, so a re-run is free):

```bash
npx tsx scripts/audition.ts
```

---

## How the audio works

```
intake  ─▶  writer  ─▶  validator  ─▶  you read and edit it
                                              │
                                              ▼
                        chunks, split on line boundaries, cached by SHA-256
                                              │
                                              ▼
                        Gemini TTS, streamed, one call per chunk
                                              │
                                              ▼
                        split back into lines at the model's own gaps, re-laid
                        against the exact pause schedule, filtered, tapered,
                        mixed with the bed, normalised — all in the browser
                                              │
                                              ▼
                                    MP3  ─▶  your IndexedDB
```

**Why the browser does the audio.** The first version assembled with ffmpeg in a server process.
That cannot be hosted: serverless platforms have no ffmpeg binary and no function budget that
survives a multi-minute render. Moving assembly into the browser removed both problems and made
the local-first claim literally true.

**Why streaming is not optional.** One 152-word chunk, measured: non-streamed took 46.9 s to
first byte; streamed took 0.7 s to first byte and 13.6 s total.

**Pauses are not the model's.** It cannot hold a seven-second gap reliably. Each chunk is split
back into its lines at the model's own inter-sentence gaps and re-laid against the schedule. If
the split does not match the expected line count, it falls back to spacing at chunk level —
degraded, never broken, and the count of fallbacks is reported.

---

## What this does not have

No streaks, no badges, no scores, no notification that turns a missed day into a failure. A
tracker that punishes you for the gap is the reason the gap becomes a month.

It is also not therapy, not medical advice, and not a crisis service.

---

## Known limits

- **Storage is per-browser.** A track made on a laptop is not on the phone; clearing browser
  data clears everything. Settings → Export writes it all out as one JSON file, and any track
  can be saved as an audio file from the library.
- **There is a hard daily TTS cap even with billing on: 100 requests per model per day.** A
  60-minute affirmation track costs ~20. Chunks are cached by content hash, so editing one line
  re-spends only the chunks that line is in. See docs/GEMINI-TTS.md §6.
- **MP3 must not be encoded at 32 kbps.** Below 44.1 kHz the encoder emits correctly-sized frames
  that decode to silence. 48 kbps is used, and `encodeMp3` proves the settings are audible on a
  known sine before it will render anything. See `src/lib/audio/mp3.ts`.
- **The de-esser is a fixed high shelf**, not a dynamic de-esser — Web Audio has no de-esser node.
- **The bed is synthesized, not recorded.** "Rain" is band-limited noise shaped to sit where rain
  sits, and is labelled as synthesized in the UI.
- **Chunk size is a cache key.** Changing `CHUNK_TARGET_WORDS` invalidates every previously
  generated chunk.
