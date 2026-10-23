'use client';

import { useState } from 'react';
import { MoreIcon } from '@/components/icons';
import {
  Accordion,
  ActionButton,
  Button,
  Disclosure,
  HintBadge,
  InfoTip,
  Menu,
  type MenuAction,
  PopoverPanel,
  PopoverTrigger,
  Tooltip,
} from '@/components/ui';
import { GALLERY_COPY as C, GALLERY_OPTIONS } from '@/constants/design-system';
import { GallerySection, Specimen } from './gallery-section';

const MENU: readonly MenuAction[] = GALLERY_OPTIONS.menu;

export function OverlaysSection() {
  const [picked, setPicked] = useState<string | null>(null);
  return (
    <GallerySection title={C.sections.overlays}>
      <Specimen state={C.states.default}>
        <div className="flex flex-wrap items-center gap-3">
          <Tooltip content={C.tooltipText}>
            <Button>{C.tooltipTrigger}</Button>
          </Tooltip>
          <HintBadge tone="warning" hint={C.hintBadgeText}>
            {C.hintBadge}
          </HintBadge>
          <InfoTip content={C.tooltipText} />
        </div>
      </Specimen>
      <Specimen state={C.states.default}>
        <PopoverTrigger>
          <ActionButton>{C.popoverTrigger}</ActionButton>
          <PopoverPanel title={C.popoverTitle} placement="bottom start" arrow>
            {C.popoverBody}
          </PopoverPanel>
        </PopoverTrigger>
      </Specimen>
      <Specimen state={C.states.default}>
        <div className="flex items-center gap-3">
          <Menu
            label={C.menuTrigger}
            actions={MENU}
            onAction={setPicked}
            trigger={
              <ActionButton
                iconOnly
                aria-label={C.menuTrigger}
                leadingIcon={<MoreIcon size={16} />}
              />
            }
          />
          <span className="text-xs text-ink-muted" aria-live="polite">
            {picked ?? ''}
          </span>
        </div>
      </Specimen>
      <Specimen state={C.states.default}>
        <Disclosure title={C.disclosureTitle} meta={C.disclosureMeta}>
          <p className="text-xs text-ink-muted">{C.disclosureBody}</p>
        </Disclosure>
        <Disclosure title={C.disclosureTitle} isDisabled>
          <p className="text-xs text-ink-muted">{C.disclosureBody}</p>
        </Disclosure>
      </Specimen>
      <Specimen state={C.states.card} wide>
        <Accordion defaultExpandedKeys={[C.accordion[0]]}>
          {C.accordion.map((title) => (
            <Disclosure key={title} id={title} title={title} variant="card">
              <p className="text-[13px] text-ink-muted">{C.accordionBody}</p>
            </Disclosure>
          ))}
        </Accordion>
      </Specimen>
    </GallerySection>
  );
}
