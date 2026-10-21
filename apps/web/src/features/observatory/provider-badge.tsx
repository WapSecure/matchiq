import type { ModelProvider } from '@matchiq/contracts';
import { Badge } from '@/components/ui';
import { PROVIDER_LABELS } from '@/constants/observatory';

/** Provider shown with its plain meaning so a mock is never read as a model. */
export function ProviderBadge({ provider }: { provider: ModelProvider }) {
  const { label, hint } = PROVIDER_LABELS[provider];
  const real = provider === 'foundry' || provider === 'ollama';
  return (
    <Badge
      tone={real ? 'accent' : 'neutral'}
      data-provider={provider}
      title={hint}
    >
      {label}
      <span className="sr-only">: {hint}</span>
    </Badge>
  );
}
