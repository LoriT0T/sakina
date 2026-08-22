'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

/**
 * The shared surface kit.
 *
 * Every colour here is a semantic token from globals.css rather than a ramp value, so light and
 * dark stay in step and the player's night surface can override the whole app by setting one
 * attribute.
 */

export function Page({
  children,
  title,
  subtitle,
  back,
  action,
}: {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  back?: { href: string; label: string };
  action?: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-2xl px-5 pb-28 pt-6 sm:pt-10">
      {(title || back) && (
        <header className="mb-8">
          {back && (
            <Link
              href={back.href}
              className="text-sm"
              style={{ color: 'var(--text-faint)' }}
            >
              ← {back.label}
            </Link>
          )}
          <div className="mt-2 flex items-start justify-between gap-4">
            <div>
              {title && (
                <h1 className="text-2xl font-normal tracking-tight" style={{ color: 'var(--text)' }}>
                  {title}
                </h1>
              )}
              {subtitle && (
                <p className="mt-1.5 text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  {subtitle}
                </p>
              )}
            </div>
            {action}
          </div>
        </header>
      )}
      {children}
    </div>
  );
}

export function Card({
  children,
  className = '',
  onClick,
  as = 'div',
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  as?: 'div' | 'button';
}) {
  const Tag = as;
  return (
    <Tag
      onClick={onClick}
      className={`w-full rounded-2xl border p-4 text-left ${className}`}
      style={{
        background: 'var(--bg-raised)',
        borderColor: 'var(--border)',
        boxShadow: 'var(--shadow)',
      }}
    >
      {children}
    </Tag>
  );
}

export function Button({
  children,
  onClick,
  variant = 'default',
  disabled,
  type = 'button',
  className = '',
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'default' | 'primary' | 'quiet' | 'danger';
  disabled?: boolean;
  type?: 'button' | 'submit';
  className?: string;
}) {
  const style: React.CSSProperties =
    variant === 'primary'
      ? { background: 'var(--accent)', color: '#fff', borderColor: 'transparent' }
      : variant === 'quiet'
        ? { background: 'transparent', color: 'var(--text-muted)', borderColor: 'transparent' }
        : variant === 'danger'
          ? { background: 'transparent', color: '#a2604f', borderColor: 'var(--border)' }
          : { background: 'var(--bg-raised)', color: 'var(--text)', borderColor: 'var(--border-strong)' };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={style}
      className={`min-h-11 rounded-xl border px-4 text-sm transition-opacity disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  );
}

export function Field({
  label,
  hint,
  children,
  optional,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  optional?: boolean;
}) {
  return (
    <label className="block">
      <span className="flex items-baseline gap-2">
        <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
          {label}
        </span>
        {optional && (
          <span className="text-xs" style={{ color: 'var(--text-faint)' }}>
            optional
          </span>
        )}
      </span>
      {hint && (
        <span className="mt-1 block text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          {hint}
        </span>
      )}
      <div className="mt-2">{children}</div>
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  background: 'var(--bg-sunken)',
  borderColor: 'var(--border)',
  color: 'var(--text)',
};

export function TextArea({
  value,
  onChange,
  rows = 3,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <textarea
      value={value}
      rows={rows}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      style={inputStyle}
      className="w-full resize-y rounded-xl border px-3 py-2.5 text-sm leading-relaxed outline-none placeholder:opacity-50 focus:border-[var(--accent)]"
    />
  );
}

export function TextInput({
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      style={inputStyle}
      className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none placeholder:opacity-50 focus:border-[var(--accent)]"
    />
  );
}

export function Slider({
  value,
  onChange,
  min = 1,
  max = 10,
  step = 1,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full"
    />
  );
}

export function Choice<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Array<{ id: T; label: string; hint?: string }>;
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = o.id === value;
        return (
          <button
            key={o.id}
            onClick={() => onChange(o.id)}
            title={o.hint}
            style={{
              background: on ? 'var(--accent-soft)' : 'var(--bg-raised)',
              borderColor: on ? 'var(--accent)' : 'var(--border)',
              color: on ? 'var(--text)' : 'var(--text-muted)',
            }}
            className="min-h-11 rounded-xl border px-3.5 text-sm"
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Note({ children, tone = 'quiet' }: { children: ReactNode; tone?: 'quiet' | 'warn' }) {
  return (
    <p
      className="rounded-xl border px-3.5 py-3 text-xs leading-relaxed"
      style={{
        background: tone === 'warn' ? 'transparent' : 'var(--bg-sunken)',
        borderColor: tone === 'warn' ? '#a2604f66' : 'var(--border)',
        color: tone === 'warn' ? '#a2604f' : 'var(--text-muted)',
      }}
    >
      {children}
    </p>
  );
}

export function SectionHeading({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h2
        className="text-xs font-medium uppercase tracking-[0.14em]"
        style={{ color: 'var(--text-faint)' }}
      >
        {children}
      </h2>
      {aside}
    </div>
  );
}

export function Muted({ children }: { children: ReactNode }) {
  return (
    <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
      {children}
    </p>
  );
}
