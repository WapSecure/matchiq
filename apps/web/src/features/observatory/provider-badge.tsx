import type { ModelProvider } from '@matchiq/contracts';
import { Badge, HintBadge } from '@/components/ui';
import { PROVIDER_LABELS } from '@/constants/observatory';

/**
 * Provider shown with its plain meaning so a mock is never read as a model.
 * `inline` drops the tooltip where the badge sits in a collapsed region.
 */
export function ProviderBadge({
  provider,
  inline = false,
}: {
  provider: ModelProvider;
  inline?: boolean;
}) {
  const { label, hint } = PROVIDER_LABELS[provider];
  const tone =
    provider === 'foundry' || provider === 'ollama' ? 'accent' : 'neutral';
  if (inline)
    return (
      <Badge tone={tone} data-provider={provider}>
        {label}
        <span className="sr-only">: {hint}</span>
      </Badge>
    );
  return (
    <HintBadge tone={tone} hint={hint} data-provider={provider}>
      {label}
    </HintBadge>
  );
}
