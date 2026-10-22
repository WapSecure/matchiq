import type { MatchEventType } from '@matchiq/contracts';
import type { ComponentType } from 'react';
import {
  CardIcon,
  FinalThirdIcon,
  GoalIcon,
  type IconProps,
  InterceptIcon,
  PeriodIcon,
  RecoveryIcon,
  SaveIcon,
  ShotIcon,
  SubstitutionIcon,
  TackleIcon,
  UndoIcon,
  WhistleIcon,
} from '@/components/icons';
import { cn } from '@/lib/cn';

export type CardColour = 'YELLOW' | 'SECOND_YELLOW' | 'RED';

const ICONS: Partial<Record<MatchEventType, ComponentType<IconProps>>> = {
  MATCH_STARTED: PeriodIcon,
  PERIOD_STARTED: PeriodIcon,
  PERIOD_ENDED: PeriodIcon,
  MATCH_ENDED: PeriodIcon,
  SHOT: ShotIcon,
  GOAL: GoalIcon,
  SAVE: SaveIcon,
  FOUL: WhistleIcon,
  CARD: CardIcon,
  SUBSTITUTION: SubstitutionIcon,
  TACKLE: TackleIcon,
  RECOVERY: RecoveryIcon,
  FINAL_THIRD_ENTRY: FinalThirdIcon,
  PASS_INTERCEPTED: InterceptIcon,
  CORRECTION: UndoIcon,
};

const CARD_TONE: Record<CardColour, string> = {
  YELLOW: 'text-card-yellow',
  SECOND_YELLOW: 'text-card-yellow',
  RED: 'text-card-red',
};

type EventGlyphProps = {
  type: MatchEventType;
  card?: CardColour | null;
  className?: string;
};

/** Event-type icon; the text label beside it always names the event. */
export function EventGlyph({ type, card = null, className }: EventGlyphProps) {
  const Icon = ICONS[type] ?? PeriodIcon;
  const goal = type === 'GOAL';
  return (
    <span
      aria-hidden
      className={cn(
        'flex size-6 shrink-0 items-center justify-center rounded-md border',
        goal
          ? 'border-accent/40 bg-accent text-accent-ink'
          : 'border-line bg-surface-raised text-ink-muted',
        card && 'border-line-strong bg-surface',
        card && CARD_TONE[card],
        className,
      )}
    >
      <Icon size={14} strokeWidth={goal ? 2 : 1.75} />
    </span>
  );
}
