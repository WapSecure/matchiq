import type { MetricValue } from '@matchiq/contracts';
import { NOT_AVAILABLE, UNAVAILABLE_REASONS } from '@/constants/match';
import { cn } from '@/lib/cn';
import { formatMetric } from '@/lib/format';

type MetricValueTextProps = {
  metric: MetricValue;
  className?: string;
};

/** Unavailable metrics show their reason and are never rendered as zero. */
export function MetricValueText({ metric, className }: MetricValueTextProps) {
  const formatted = formatMetric(metric);
  if (formatted !== null) {
    return <span className={cn('tabular', className)}>{formatted}</span>;
  }
  const reason =
    metric.status === 'unavailable' ? UNAVAILABLE_REASONS[metric.reason] : '';
  return (
    <span
      className={cn('inline-flex flex-col text-ink-subtle', className)}
      data-unavailable=""
    >
      <span className="text-xs font-medium">{NOT_AVAILABLE}</span>
      <span className="text-micro">{reason}</span>
    </span>
  );
}
