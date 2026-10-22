'use client';

import { type ComponentType, useId } from 'react';
import {
  type IconProps,
  MonitorIcon,
  MoonIcon,
  SunIcon,
} from '@/components/icons';
import {
  THEME_COPY,
  THEME_PREFERENCES,
  type ThemePreference,
} from '@/constants/theme';
import { cn } from '@/lib/cn';
import { setPreference, useThemePreference } from '@/lib/theme/theme-store';

const ICONS: Record<ThemePreference, ComponentType<IconProps>> = {
  light: SunIcon,
  dark: MoonIcon,
  system: MonitorIcon,
};

const nextOf = (p: ThemePreference): ThemePreference =>
  THEME_PREFERENCES[
    (THEME_PREFERENCES.indexOf(p) + 1) % THEME_PREFERENCES.length
  ] ?? 'system';

/** Three-way radio group: arrow keys and checked state are native. */
function ThemeSegments({ value }: { value: ThemePreference }) {
  const name = useId();
  return (
    <fieldset className="flex rounded-md border border-line bg-surface-sunken p-0.5">
      <legend className="sr-only">{THEME_COPY.legend}</legend>
      {THEME_PREFERENCES.map((option) => {
        const Icon = ICONS[option];
        const checked = option === value;
        return (
          <label
            key={option}
            title={THEME_COPY.options[option]}
            className={cn(
              'press flex size-7 cursor-pointer items-center justify-center rounded-sm',
              'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent',
              checked
                ? 'bg-selected text-ink shadow-panel ring-1 ring-line-strong'
                : 'text-ink-subtle hover:text-ink',
            )}
          >
            <input
              type="radio"
              name={name}
              value={option}
              checked={checked}
              onChange={() => setPreference(option)}
              className="sr-only"
              aria-label={THEME_COPY.options[option]}
            />
            <Icon size={15} />
          </label>
        );
      })}
    </fieldset>
  );
}

/** One button for tight headers; each press moves to the next preference. */
function ThemeCycle({ value }: { value: ThemePreference }) {
  const Icon = ICONS[value];
  const next = nextOf(value);
  return (
    <button
      type="button"
      onClick={() => setPreference(next)}
      aria-label={THEME_COPY.cycle(
        THEME_COPY.options[value],
        THEME_COPY.options[next],
      )}
      className="press flex size-8 items-center justify-center rounded-md border border-line bg-surface-sunken text-ink-muted hover:text-ink"
    >
      <Icon size={16} />
    </button>
  );
}

export function ThemeToggle({ className }: { className?: string }) {
  const value = useThemePreference();
  return (
    <div className={cn('shrink-0', className)} data-testid="theme-toggle">
      <div className="hidden sm:block">
        <ThemeSegments value={value} />
      </div>
      <div className="sm:hidden">
        <ThemeCycle value={value} />
      </div>
    </div>
  );
}
