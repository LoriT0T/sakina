'use client';

import { useEffect } from 'react';
import { startReminders } from '@/lib/notify';

/**
 * Runs the reminder clock for as long as the app is open.
 *
 * Mounted once in the layout rather than per-page so that navigating between pages does not
 * restart the schedule — and so a tab left open on the player still fires the prayer reminder.
 */
export function ReminderRunner() {
  useEffect(() => startReminders(), []);
  return null;
}
