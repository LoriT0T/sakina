'use client';

import Link from 'next/link';
import { Card, Muted, Page } from '@/components/ui';

/**
 * The one fork in the app: are you trying to fall asleep with something true in your ear, or
 * trying to sit with your attention for a while?
 *
 * They are genuinely different objects and the app treats them that way — different writers,
 * different validators, different shapes, different rules about what may be said. Asking here
 * costs one tap and saves the pretence that one generator does both.
 */
export default function MakePage() {
  return (
    <Page title="Make something" subtitle="Written for you, spoken here, kept on this device.">
      <div className="space-y-3">
        <Choice
          href="/make/affirmations"
          title="Affirmations"
          blurb="Lines about you, in your own voice, said two or three times over so they land. Descends from the first minute so it can carry you to sleep."
          detail="10–90 min · first person · nothing about your body"
        />
        <Choice
          href="/make/meditation"
          title="Guided meditation"
          blurb="A practice, guided and then left alone. Breath, body, kindness, noting, open awareness, or a body scan for sleep. Mostly silence, on purpose."
          detail="5–45 min · second person · silence is the practice"
        />
      </div>

      <div className="mt-8">
        <Muted>
          Both need your own Gemini key, which stays in this browser. Everything you make is
          saved here and nowhere else.
        </Muted>
      </div>
    </Page>
  );
}

function Choice({
  href,
  title,
  blurb,
  detail,
}: {
  href: string;
  title: string;
  blurb: string;
  detail: string;
}) {
  return (
    <Link href={href} className="block">
      <Card>
        <h2 className="text-lg" style={{ color: 'var(--text)' }}>
          {title}
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          {blurb}
        </p>
        <p className="mt-3 text-xs" style={{ color: 'var(--text-faint)' }}>
          {detail}
        </p>
      </Card>
    </Link>
  );
}
