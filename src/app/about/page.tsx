'use client';

import Link from 'next/link';
import { Page, SectionHeading } from '@/components/ui';

/**
 * What this is, and — more usefully — what it refuses to be.
 */
export default function AboutPage() {
  return (
    <Page
      title="About"
      subtitle="سكينة — the stillness that settles on a heart."
      back={{ href: '/', label: 'Today' }}
    >
      <div className="space-y-10 text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
        <section>
          <p>
            Five things in one place: your prayers, a meditation you can generate rather than
            scroll for, affirmations written from your own words, a note of how you are, and
            somewhere to write. They are here together because they are the same day.
          </p>
        </section>

        <section>
          <SectionHeading>Where your data is</SectionHeading>
          <p>
            In this browser. There is no account, no server, no database. Prayer marks, moods,
            journal entries, scripts and finished audio all live in this device&rsquo;s storage
            and go nowhere else. That is not a privacy promise made on trust — there is nothing
            here to store it on.
          </p>
          <p className="mt-3">
            The cost is real: clear your browser data and it is gone, and nothing syncs between
            your laptop and your phone.{' '}
            <Link href="/settings" className="underline underline-offset-2">
              Export everything
            </Link>{' '}
            writes it all out as one file, and any track can be saved from the library.
          </p>
        </section>

        <section>
          <SectionHeading>The key</SectionHeading>
          <p>
            Generating audio needs a Gemini API key, which you paste once and which is stored in
            this browser and sent to exactly one place: Google. Static hosting cannot keep a
            shared key secret, so bring-your-own is the only honest arrangement. It has an upside
            — nothing you generate passes through anyone else&rsquo;s machine.
          </p>
        </section>

        <section>
          <SectionHeading>Affirmations</SectionHeading>
          <p>
            First person, present tense, in your words, each line said two or three times over
            before moving on. Nothing about your body, no scene-setting, no manifestation
            vocabulary. When you rate a goal below four out of ten for how true it already feels,
            it stops making flat claims and switches to process, plans and self-compassion —
            because unbelieved self-statements measurably make people feel worse.
          </p>
          <p className="mt-3">
            Goals marked as touching addiction or mental health drop shame language,
            &ldquo;never again&rdquo; absolutes, and any framing that treats a bad night as
            failure. What replaces them is urge-surfing and specific plans.
          </p>
        </section>

        <section>
          <SectionHeading>Meditation</SectionHeading>
          <p>
            Structurally the opposite of an affirmation, and the app treats it that way. Second
            person, body sensation allowed and needed, invitation instead of instruction, and
            silence as the actual practice rather than as spacing — a ten-minute session is about
            ninety seconds of speech. It says early that a wandering mind is not a failure,
            because that is the belief that makes people quit.
          </p>
          <p className="mt-3">
            It will not tell you to clear your mind, promise you an outcome, or claim to treat
            anything.
          </p>
        </section>

        <section>
          <SectionHeading>Prayer</SectionHeading>
          <p>
            Times are computed on this device from coordinates you set, using the calculation
            method and madhab you choose. Nothing is looked up over the network. The five are
            marked with five states rather than a checkbox, because on time, late and in
            congregation are different things and a binary flattens them into guilt.
          </p>
          <p className="mt-3">
            The adhkar are the well-known ones with the Arabic as transmitted; the English is a
            plain rendering rather than a reproduction of any published translation.
          </p>
        </section>

        <section>
          <SectionHeading>What this does not do</SectionHeading>
          <p>
            No streaks, no badges, no scores, no notification that makes a missed day into a
            failure. A tracker that punishes you for the gap is the reason the gap becomes a
            month. The history grid shows what happened; it does not grade it.
          </p>
          <p className="mt-3">
            It is also not therapy, not medical advice, and not a crisis service. If things are
            bad, talk to a person.
          </p>
        </section>
      </div>
    </Page>
  );
}
