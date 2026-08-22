'use client';

import { useEffect, useState } from 'react';
import { Button, Card, Choice, Muted, Note, Page, SectionHeading } from '@/components/ui';
import { ApiKeyField } from '@/components/api-key';
import { exportEverything, storageEstimate } from '@/lib/db';
import {
  askPermission,
  notificationState,
  readReminders,
  writeReminders,
  type ReminderSettings,
} from '@/lib/notify';

export default function SettingsPage() {
  const [reminders, setReminders] = useState<ReminderSettings | null>(null);
  const [permission, setPermission] = useState<string>('default');
  const [usage, setUsage] = useState<{ usage: number; quota: number } | null>(null);

  useEffect(() => {
    // localStorage and Notification.permission only exist on the client, so these are read
    // after mount rather than during render — deferred so the effect body itself sets nothing.
    queueMicrotask(() => {
      setReminders(readReminders());
      setPermission(notificationState());
      void storageEstimate().then(setUsage);
    });
  }, []);

  function update(patch: Partial<ReminderSettings>) {
    setReminders((r) => {
      if (!r) return r;
      const next = { ...r, ...patch };
      writeReminders(next);
      return next;
    });
  }

  async function exportData() {
    const data = await exportEverything();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sakina-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }

  return (
    <Page title="Settings" back={{ href: '/', label: 'Today' }}>
      <section className="mb-10">
        <SectionHeading>Reminders</SectionHeading>
        <Note>
          These fire only while Sakina is open in a tab — backgrounded is fine, closed is not.
          There is no server here to push from, and adding one would mean handing over your
          prayer times and your schedule. Add it to your home screen and it behaves like an app.
        </Note>

        {permission !== 'granted' && permission !== 'unsupported' && (
          <div className="mt-4">
            <Button
              onClick={async () => {
                setPermission((await askPermission()) as string);
              }}
            >
              Allow notifications
            </Button>
          </div>
        )}
        {permission === 'unsupported' && (
          <p className="mt-4 text-xs" style={{ color: '#a2604f' }}>
            This browser has no notification support.
          </p>
        )}
        {permission === 'denied' && (
          <p className="mt-4 text-xs" style={{ color: '#a2604f' }}>
            Notifications are blocked for this site in your browser settings.
          </p>
        )}

        {reminders && permission === 'granted' && (
          <div className="mt-5 space-y-6">
            <label className="flex items-start gap-3 text-sm" style={{ color: 'var(--text-muted)' }}>
              <input
                type="checkbox"
                checked={reminders.prayers}
                onChange={(e) => update({ prayers: e.target.checked })}
                className="mt-1 h-4 w-4"
              />
              <span>
                At each prayer time
                <span className="mt-0.5 block text-xs" style={{ color: 'var(--text-faint)' }}>
                  Calculated on this device from the place set on the prayer page.
                </span>
              </span>
            </label>

            <div>
              <p className="mb-2 text-sm" style={{ color: 'var(--text-muted)' }}>
                Mood check
              </p>
              <Choice<string>
                value={String(reminders.moodEveryHours)}
                onChange={(v) => update({ moodEveryHours: Number(v) })}
                options={[
                  { id: '0', label: 'Never' },
                  { id: '4', label: 'Every 4h' },
                  { id: '6', label: 'Every 6h' },
                ]}
              />
              <Muted>Between 8am and 10pm only.</Muted>
            </div>

            <div>
              <p className="mb-2 text-sm" style={{ color: 'var(--text-muted)' }}>
                Evening journal nudge
              </p>
              <Choice<string>
                value={reminders.journalHour === null ? 'off' : String(reminders.journalHour)}
                onChange={(v) => update({ journalHour: v === 'off' ? null : Number(v) })}
                options={[
                  { id: 'off', label: 'Off' },
                  { id: '20', label: '8pm' },
                  { id: '21', label: '9pm' },
                  { id: '22', label: '10pm' },
                ]}
              />
            </div>
          </div>
        )}
      </section>

      <section className="mb-10">
        <SectionHeading>Your key</SectionHeading>
        <Card>
          <ApiKeyField />
        </Card>
      </section>

      <section className="mb-10">
        <SectionHeading>Your data</SectionHeading>
        <Muted>
          Everything — prayers, moods, journal, scripts, settings — lives in this browser. Export
          writes it all out as one JSON file. Audio is not included; save those from the library.
        </Muted>
        <div className="mt-3">
          <Button onClick={exportData}>Export everything</Button>
        </div>
        {usage && usage.quota > 0 && (
          <p className="mt-3 text-xs" style={{ color: 'var(--text-faint)' }}>
            {(usage.usage / 1e6).toFixed(0)} MB used of roughly {(usage.quota / 1e6).toFixed(0)} MB
            available.
          </p>
        )}
      </section>
    </Page>
  );
}
