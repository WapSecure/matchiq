'use client';

import { GALLERY_COPY as C } from '@/constants/design-system';
import { MAIN_CONTENT_ID } from '@/constants/site';
import { ActionsSection } from './actions-section';
import { ChoicesSection } from './choices-section';
import { DatesSection } from './dates-section';
import { FeedbackSection } from './feedback-section';
import { OverlaysSection } from './overlays-section';
import { PaginationSection } from './pagination-section';
import { SelectSection } from './select-section';
import { ThemePane } from './theme-pane';
import { UploadSection } from './upload-section';

function Sections() {
  return (
    <>
      <ActionsSection />
      <SelectSection />
      <DatesSection />
      <ChoicesSection />
      <OverlaysSection />
      <FeedbackSection />
      <PaginationSection />
      <UploadSection />
    </>
  );
}

/** Each theme gets its own pane so both are reviewed in one pass. */
export function DesignSystemGallery() {
  return (
    <main
      id={MAIN_CONTENT_ID}
      className="mx-auto flex max-w-[1600px] flex-col gap-6 px-4 py-8 lg:px-6"
    >
      <header className="max-w-3xl">
        <p className="eyebrow text-accent">{C.eyebrow}</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
          {C.title}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          {C.description}
        </p>
      </header>
      <ThemePane scheme="light" title={C.themes.light}>
        <Sections />
      </ThemePane>
      <ThemePane scheme="dark" title={C.themes.dark}>
        <Sections />
      </ThemePane>
    </main>
  );
}
