'use client';

import { useState } from 'react';
import { AlertIcon, DeterministicIcon, RetractIcon } from '@/components/icons';
import { Button, Drawer, Modal, ToastCard } from '@/components/ui';
import { GALLERY_COPY as C } from '@/constants/design-system';
import { UI_COPY } from '@/constants/ui';
import { GallerySection, Specimen } from './gallery-section';

export function FeedbackSection() {
  const [modal, setModal] = useState(false);
  const [drawer, setDrawer] = useState(false);
  return (
    <GallerySection title={C.sections.feedback}>
      <Specimen state={C.states.default} wide>
        <ToastCard
          tone="positive"
          Icon={DeterministicIcon}
          onDismiss={() => undefined}
          dismissLabel={UI_COPY.dismiss}
        >
          <p>{C.toastSaved}</p>
        </ToastCard>
        <ToastCard Icon={DeterministicIcon}>
          <p>{C.toastNeutral}</p>
        </ToastCard>
        <ToastCard
          tone="critical"
          Icon={AlertIcon}
          action={<Button size="xs">{C.secondary}</Button>}
        >
          <p>{C.toastCritical}</p>
        </ToastCard>
      </Specimen>
      <Specimen state={C.states.default}>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setModal(true)}>{C.openModal}</Button>
          <Button onClick={() => setDrawer(true)}>{C.openDrawer}</Button>
        </div>
        <Modal
          open={modal}
          onClose={() => setModal(false)}
          title={C.modalTitle}
          description={C.modalBody}
          Icon={RetractIcon}
          tone="danger"
        >
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setModal(false)}>
              {C.ghost}
            </Button>
            <Button variant="danger" onClick={() => setModal(false)}>
              {C.confirm}
            </Button>
          </div>
        </Modal>
        <Drawer
          open={drawer}
          onClose={() => setDrawer(false)}
          title={C.drawerTitle}
          eyebrow={C.eyebrow}
          closeLabel={C.close}
        >
          <p className="text-[13px] text-ink-muted">{C.popoverBody}</p>
        </Drawer>
      </Specimen>
    </GallerySection>
  );
}
