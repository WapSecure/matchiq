'use client';

import { FileIcon } from '@/components/icons';
import { Panel } from '@/components/ui';
import { RECAP_COPY, STORY_KIND_LABELS } from '@/constants/recap';
import { SITE } from '@/constants/site';
import { ListenButton } from '@/features/listen/listen-button';
import { useStudioUi } from '@/features/studio/store';
import type { RecapDocument } from '@/lib/api/session-schemas';
import { withUniqueKeys } from '@/lib/unique-keys';
import { pickStory } from './pick-story';

const copy = RECAP_COPY.matchStory;

/** The full-time story in the chosen audience and language; absent on older recaps. */
export function RecapMatchStory({ recap }: { recap: RecapDocument }) {
  const persona = useStudioUi((s) => s.persona);
  const locale = useStudioUi((s) => s.locale);
  const picked = pickStory(recap.story, persona, locale);
  if (!picked) return null;
  return (
    <Panel
      id="recap-match-story"
      title={copy.title}
      description={copy.description}
      Icon={FileIcon}
    >
      <div className="flex max-w-3xl flex-col gap-4">
        <div>
          <ListenButton
            locale={picked.language}
            text={picked.story.paragraphs.map((p) => p.text).join(' ')}
            headline={copy.title}
          />
        </div>
        {picked.notice ? (
          <p lang={SITE.locale} className="text-xs text-warning">
            {picked.notice}
          </p>
        ) : null}
        {withUniqueKeys(picked.story.paragraphs, (p) => p.kind).map(
          ({ item, key }) => (
            <section key={key} className="flex flex-col gap-1">
              <h3 className="eyebrow">{STORY_KIND_LABELS[item.kind]}</h3>
              <p
                lang={picked.language}
                className="text-pretty text-sm leading-relaxed text-ink"
              >
                {item.text}
              </p>
            </section>
          ),
        )}
      </div>
    </Panel>
  );
}
