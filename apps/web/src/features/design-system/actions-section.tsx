'use client';

import { useState } from 'react';
import { PlayIcon, PowerIcon, RestartIcon } from '@/components/icons';
import { ActionButton, Button } from '@/components/ui';
import { TextArea, TextField } from '@/components/ui/text-field';
import { GALLERY_COPY as C } from '@/constants/design-system';
import { GallerySection, Specimen } from './gallery-section';

export function ActionsSection() {
  const [text, setText] = useState<string>(C.textValue);
  const [reason, setReason] = useState('');
  return (
    <GallerySection title={C.sections.actions}>
      <Specimen state={C.states.default}>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="primary" leadingIcon={<PlayIcon size={14} />}>
            {C.primary}
          </Button>
          <Button leadingIcon={<RestartIcon size={14} />}>{C.secondary}</Button>
          <Button variant="ghost">{C.ghost}</Button>
          <Button variant="danger" leadingIcon={<PowerIcon size={14} />}>
            {C.danger}
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="xs">{C.secondary}</Button>
          <Button size="sm">{C.secondary}</Button>
          <Button size="md">{C.secondary}</Button>
        </div>
      </Specimen>
      <Specimen state={`${C.states.disabled} · ${C.states.pending}`}>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="primary" disabled>
            {C.primary}
          </Button>
          <Button disabled>{C.secondary}</Button>
          <ActionButton variant="primary" isPending>
            {C.primary}
          </ActionButton>
        </div>
      </Specimen>
      <Specimen state={`${C.states.default} · ${C.states.invalid}`}>
        <TextField label={C.textLabel} value={text} onChange={setText} />
        <TextField
          label={C.textLabel}
          value="NB"
          onChange={() => undefined}
          errorMessage={C.textInvalid}
        />
        <TextField
          label={C.textLabel}
          value={C.textValue}
          onChange={() => undefined}
          isDisabled
          size="md"
        />
      </Specimen>
      <Specimen state={`${C.states.empty} · ${C.states.described}`}>
        <TextField
          label={C.textLabel}
          value=""
          onChange={() => undefined}
          placeholder={C.textPlaceholder}
          description={C.textDescription}
        />
        <TextArea
          label={C.textareaLabel}
          value={reason}
          onChange={setReason}
          placeholder={C.textareaPlaceholder}
        />
      </Specimen>
    </GallerySection>
  );
}
