import type { ModelProvider } from '@matchiq/contracts';
import { HintBadge } from '@/components/ui';
import { PROVIDER_LABELS } from '@/constants/observatory';

/** Provider shown with its plain meaning so a mock is never read as a model. */
export function ProviderBadge({ provider }: { provider: ModelProvider }) {
  const { label, hint } = PROVIDER_LABELS[provider];
  const real = provider === 'foundry' || provider === 'ollama';
  return (
    <HintBadge
      tone={real ? 'accent' : 'neutral'}
      data-provider={provider}
      hint={hint}
    >
      {label}
    </HintBadge>
  );
}
