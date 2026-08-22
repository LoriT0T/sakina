'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * Bottom navigation.
 *
 * Bottom rather than top because this is a phone app that happens to run in a browser, and the
 * things it is for — logging a prayer, catching a mood, starting a meditation — are one-handed,
 * often standing up. Five destinations is the ceiling before a bar becomes a menu.
 */
const TABS = [
  { href: '/', label: 'Today', icon: 'M12 3l8 7h-2v8h-5v-5H11v5H6v-8H4z' },
  { href: '/prayer', label: 'Prayer', icon: 'M12 2a5 5 0 015 5v3h1a2 2 0 012 2v8H4v-8a2 2 0 012-2h1V7a5 5 0 015-5zm0 2a3 3 0 00-3 3v3h6V7a3 3 0 00-3-3z' },
  { href: '/make', label: 'Make', icon: 'M12 4v16m8-8H4' },
  { href: '/journal', label: 'Journal', icon: 'M6 3h9l4 4v14H6zm8 1v4h4' },
  { href: '/library', label: 'Library', icon: 'M4 5h4v14H4zm6 0h4v14h-4zm6 2l4 12-4 1z' },
];

export function Nav() {
  const path = usePathname() ?? '/';

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t backdrop-blur"
      style={{
        background: 'color-mix(in srgb, var(--bg) 88%, transparent)',
        borderColor: 'var(--border)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <ul className="mx-auto flex max-w-2xl">
        {TABS.map((t) => {
          const active = t.href === '/' ? path === '/' : path.startsWith(t.href);
          return (
            <li key={t.href} className="flex-1">
              <Link
                href={t.href}
                className="flex min-h-[56px] flex-col items-center justify-center gap-1 text-[11px]"
                style={{ color: active ? 'var(--accent)' : 'var(--text-faint)' }}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d={t.icon} />
                </svg>
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
