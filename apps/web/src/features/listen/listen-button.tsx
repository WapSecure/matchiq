'use client';

import type { Locale } from '@matchiq/contracts';
import { useId, useMemo } from 'react';
import { SpeakerIcon, StopIcon } from '@/components/icons';
import { Button, Tooltip } from '@/components/ui';
import { LISTEN_COPY } from '@/constants/listen';
import { DEFAULT_COMMENTARY_LOCALE, languageName } from '@/constants/match';
import { SITE } from '@/constants/site';
import { useThrottledAnnouncement } from '@/features/studio/hooks/use-announcer';
import { type SpeechEvent, useSpeech } from './use-speech';

type ListenButtonProps = {
  /** Language of the text, as shown to the viewer. */
  locale: Locale;
  /** The transcript, exactly as displayed. */
  text: string;
  /** Names the button for assistive technology. */
  headline: string;
};

const EVENT_TEXT: Record<Exclude<SpeechEvent, null>, string> = {
  started: LISTEN_COPY.started,
  stopped: LISTEN_COPY.stopped,
  finished: LISTEN_COPY.finished,
};

/** Reads a published write-up aloud with the viewer's own device voice. */
export function ListenButton({ locale, text, headline }: ListenButtonProps) {
  const { status, event, speak, stop } = useSpeech(locale, text);
  const noteId = useId();
  const message = useMemo(
    () =>
      event
        ? { text: EVENT_TEXT[event], locale: DEFAULT_COMMENTARY_LOCALE }
        : null,
    [event],
  );
  const spoken = useThrottledAnnouncement(message);

  if (status === 'no-voice' && locale === 'pcm-NG') {
    return (
      <p lang={SITE.locale} className="text-micro text-ink-subtle">
        {LISTEN_COPY.unavailable(languageName(locale))}
      </p>
    );
  }
  if (status !== 'idle' && status !== 'speaking') return null;

  const speaking = status === 'speaking';
  return (
    <span lang={SITE.locale} className="inline-flex">
      <Tooltip content={LISTEN_COPY.deviceVoice}>
        <Button
          size="xs"
          variant="secondary"
          aria-label={
            speaking
              ? LISTEN_COPY.stopListening(headline)
              : LISTEN_COPY.listenTo(headline)
          }
          aria-describedby={noteId}
          leadingIcon={
            speaking ? <StopIcon size={14} /> : <SpeakerIcon size={14} />
          }
          onClick={speaking ? stop : speak}
        >
          {speaking ? LISTEN_COPY.stop : LISTEN_COPY.listen}
        </Button>
      </Tooltip>
      <span id={noteId} className="sr-only">
        {LISTEN_COPY.deviceVoice}
      </span>
      <span aria-live="polite" aria-atomic="true" className="sr-only">
        {spoken?.text}
      </span>
    </span>
  );
}
