'use client';

import { useState } from 'react';
import { Field } from '@/components/ui';
import { getApiKey, setApiKey, testApiKey } from '@/lib/gemini/browser';

/**
 * Your own API key, kept on your own device.
 *
 * The app is static files with no server, so there is nowhere for a shared key to live and
 * nothing to proxy through. The browser calls Google directly with this key. It is written to
 * this browser's localStorage and sent to exactly one place: Google's API. It is not in the
 * page source, not in the repository, and not on any server of ours, because there is no server.
 */
export function ApiKeyField() {
  const [key, setKey] = useState(() => (typeof window === 'undefined' ? '' : getApiKey()));
  const [state, setState] = useState<'idle' | 'checking' | 'ok' | 'bad'>('idle');
  const [message, setMessage] = useState('');

  async function check() {
    if (!key.trim()) return;
    setApiKey(key);
    setState('checking');
    const res = await testApiKey(key);
    if (res.ok) {
      setState('ok');
      setMessage('');
    } else {
      setState('bad');
      setMessage(res.message);
    }
  }

  return (
    <div>
      <Field
        label="Your Gemini API key"
        hint="Stored in this browser only. It goes straight to Google and nowhere else — this app has no server to send it to."
      >
        <input
          type="password"
          value={key}
          autoComplete="off"
          spellCheck={false}
          placeholder="AI..."
          onChange={(e) => {
            setKey(e.target.value);
            setState('idle');
          }}
          onBlur={check}
          className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none placeholder:opacity-40"
          style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text)' }}
        />
      </Field>
      <div className="mt-2 text-xs">
        {state === 'checking' && <span style={{ color: 'var(--text-faint)' }}>Checking...</span>}
        {state === 'ok' && <span style={{ color: 'var(--accent)' }}>Key works. Saved on this device.</span>}
        {state === 'bad' && <span style={{ color: '#a2604f' }}>{message}</span>}
        {state === 'idle' && (
          <span style={{ color: 'var(--text-faint)' }}>
            Free from{' '}
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              aistudio.google.com/apikey
            </a>
            .
          </span>
        )}
      </div>
    </div>
  );
}
