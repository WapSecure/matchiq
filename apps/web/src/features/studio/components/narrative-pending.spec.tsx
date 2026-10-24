import type { Persona } from '@matchiq/contracts';
import { render, screen } from '@testing-library/react';
import { insight } from '@/test/factories';
import { NarrativePanel } from './narrative-panel';

const RAW_INDEX_RATIONALE =
  'The momentum index favours Glenhaven Harriers at 0.02 against -1.21, from -1.31 against -0.96 in the previous five minutes.';

const pending = (persona: Persona) =>
  render(
    <NarrativePanel
      persona={persona}
      locale="en-GB"
      view={null}
      insight={insight({
        kind: 'MOMENTUM_SHIFT',
        evidence: { ...insight().evidence, rationale: RAW_INDEX_RATIONALE },
      })}
    />,
  );

describe('the interim line while a write-up is on its way', () => {
  it.each<Persona>(['CASUAL', 'BROADCAST'])(
    'shows %s only the kind of moment, with no raw index values',
    (persona) => {
      const { container } = pending(persona);
      expect(screen.getByText('Momentum shift')).toBeVisible();
      expect(screen.getByText('Write-up on its way.')).toBeVisible();
      expect(container).not.toHaveTextContent(/-?\d+\.\d+/);
      expect(container).not.toHaveTextContent(/index/i);
    },
  );

  it('lets the Analyst keep the labelled facts', () => {
    pending('ANALYST');
    expect(screen.getByText(/momentum index favours/)).toBeVisible();
    expect(screen.getByText(/Here are the facts so far/)).toBeVisible();
  });
});
