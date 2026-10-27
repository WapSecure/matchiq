'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertIcon, RefreshIcon } from '@/components/icons';
import { Button } from '@/components/ui';
import { useInterfaceMessages } from '@/features/interface-language/interface-language-store';
import type { InterfaceMessages } from '@/features/interface-language/interface-messages';
import { cn } from '@/lib/cn';

type RegionBoundaryProps = {
  /** The region's name as users know it, e.g. "Key moments". */
  region: string;
  children: ReactNode;
  className?: string;
};

type RegionBoundaryState = { failed: boolean };
type BoundaryCopy = InterfaceMessages['feedback']['boundary'];

const LOG_PREFIX = '[matchiq] region failed:';

/** Contains a render failure to one region, so the rest of the page keeps working. */
class RegionBoundaryCore extends Component<
  RegionBoundaryProps & { copy: BoundaryCopy },
  RegionBoundaryState
> {
  override state: RegionBoundaryState = { failed: false };

  static getDerivedStateFromError(): RegionBoundaryState {
    return { failed: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(LOG_PREFIX, this.props.region, error, info.componentStack);
  }

  private readonly reset = () => this.setState({ failed: false });

  override render(): ReactNode {
    if (!this.state.failed) return this.props.children;
    return (
      <section
        role="alert"
        data-testid="region-error"
        className={cn(
          'flex flex-col items-start gap-3 rounded-lg border border-line bg-surface p-4 sm:flex-row sm:items-center',
          this.props.className,
        )}
      >
        <AlertIcon size={18} className="shrink-0 text-warning" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-ink">
            {this.props.copy.title(this.props.region)}
          </p>
          <p className="mt-0.5 text-xs text-ink-muted">
            {this.props.copy.message}
          </p>
        </div>
        <Button onClick={this.reset} leadingIcon={<RefreshIcon size={14} />}>
          {this.props.copy.retry}
        </Button>
      </section>
    );
  }
}

export function RegionBoundary(props: RegionBoundaryProps) {
  const copy = useInterfaceMessages().feedback.boundary;
  return <RegionBoundaryCore {...props} copy={copy} />;
}
