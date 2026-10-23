'use client';

import { useEffect, useState } from 'react';
import { FileUpload, type UploadItem } from '@/components/ui';
import {
  GALLERY_COPY as C,
  GALLERY_UPLOAD_LIMIT_BYTES,
  GALLERY_UPLOAD_SAMPLES,
  GALLERY_UPLOAD_TYPES,
} from '@/constants/design-system';
import { GallerySection, Specimen } from './gallery-section';

const TICK_MS = 400;
const STEP = 12;
const FULL = 100;
const MAX_FILES = 4;

/** Uploads nothing: progress is simulated so every state can be reviewed. */
export function UploadSection() {
  const [items, setItems] = useState<UploadItem[]>([]);
  useEffect(() => {
    if (!items.some((i) => i.status === 'uploading')) return undefined;
    const timer = setTimeout(
      () =>
        setItems((list) =>
          list.map((i) => {
            if (i.status !== 'uploading') return i;
            const progress = Math.min((i.progress ?? 0) + STEP, FULL);
            return {
              ...i,
              progress,
              status: progress === FULL ? 'done' : 'uploading',
            };
          }),
        ),
      TICK_MS,
    );
    return () => clearTimeout(timer);
  }, [items]);
  const rules = {
    accept: GALLERY_UPLOAD_TYPES,
    acceptLabel: C.uploadAcceptLabel,
    maxBytes: GALLERY_UPLOAD_LIMIT_BYTES,
  };
  return (
    <GallerySection title={C.sections.upload}>
      <Specimen state={C.states.default}>
        <FileUpload
          label={C.uploadLabel}
          multiple
          maxFiles={MAX_FILES}
          {...rules}
          items={items}
          onRemove={(id) => setItems((list) => list.filter((i) => i.id !== id))}
          onFiles={(files) =>
            setItems((list) => [
              ...list,
              ...files.map((f) => ({
                id: `${f.name}-${f.lastModified}`,
                name: f.name,
                size: f.size,
                progress: 0,
                status: 'uploading' as const,
              })),
            ])
          }
        />
      </Specimen>
      <Specimen state={`${C.states.loading} · ${C.states.invalid}`}>
        <FileUpload
          label={C.uploadLabel}
          {...rules}
          items={GALLERY_UPLOAD_SAMPLES}
          onFiles={() => undefined}
        />
      </Specimen>
      <Specimen state={C.states.disabled}>
        <FileUpload
          label={C.uploadLabel}
          {...rules}
          isDisabled
          onFiles={() => undefined}
        />
      </Specimen>
    </GallerySection>
  );
}
