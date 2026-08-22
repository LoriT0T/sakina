import type { Metadata, Viewport } from 'next';
import { Nav } from '@/components/nav';
import { ReminderRunner } from '@/components/reminder-runner';
import './globals.css';

export const metadata: Metadata = {
  title: 'Sakina',
  description:
    'Prayer, meditation, affirmations and a journal — one quiet place, kept entirely on your own device.',
  manifest: process.env.NEXT_PUBLIC_BASE_PATH
    ? `${process.env.NEXT_PUBLIC_BASE_PATH}/manifest.webmanifest`
    : '/manifest.webmanifest',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#faf7f2' },
    { media: '(prefers-color-scheme: dark)', color: '#0d0c0b' },
  ],
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh antialiased">
        {children}
        <Nav />
        <ReminderRunner />
      </body>
    </html>
  );
}
