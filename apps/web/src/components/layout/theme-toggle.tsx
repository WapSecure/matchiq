'use client';

import type { ComponentType } from 'react';
import { ToggleButton, ToggleButtonGroup } from 'react-aria-components';
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
import { Tooltip } from '@/components/ui/tooltip';
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

/** Three-way choice; each icon names itself in a tooltip as well as to assistive tech. */
function ThemeSegments({ value }: { value: ThemePreference }) {
  return (
    <ToggleButtonGroup
      aria-label={THEME_COPY.legend}
      selectionMode="single"
      disallowEmptySelection
      selectedKeys={[value]}
      onSelectionChange={(keys) => {
        const next = THEME_PREFERENCES.find((p) => keys.has(p));
        if (next) setPreference(next);
      }}
      className="flex rounded-md border border-line bg-surface-sunken p-0.5"
    >
      {THEME_PREFERENCES.map((option) => {
        const Icon = ICONS[option];
        return (
          <Tooltip
            key={option}
            content={THEME_COPY.options[option]}
            ariaChild
            placement="bottom"
          >
            <ToggleButton
              id={option}
              aria-label={THEME_COPY.options[option]}
              className={cn(
                'press flex size-7 cursor-pointer items-center justify-center rounded-sm text-ink-subtle outline-none',
                'data-hovered:text-ink data-focus-visible:outline-2 data-focus-visible:outline-accent',
                'data-selected:bg-selected data-selected:text-ink data-selected:shadow-panel data-selected:ring-1 data-selected:ring-line-strong',
              )}
            >
              <Icon size={15} />
            </ToggleButton>
          </Tooltip>
        );
      })}
    </ToggleButtonGroup>
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
