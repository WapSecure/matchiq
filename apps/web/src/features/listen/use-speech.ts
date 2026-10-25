'use client';

import type { Locale } from '@matchiq/contracts';
import { useCallback, useEffect, useRef, useState } from 'react';
import { chooseVoice, hasSpeech } from './voices';

export type SpeechStatus =
  'unsupported' | 'loading' | 'no-voice' | 'idle' | 'speaking';
export type SpeechEvent = 'started' | 'stopped' | 'finished' | null;

/** Resets whichever control is reading now, so only one reads at a time. */
let resetActive: (() => void) | null = null;

const useVoices = () => {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  useEffect(() => {
    if (!hasSpeech()) return undefined;
    const synth = window.speechSynthesis;
    const update = () => setVoices(synth.getVoices());
    update();
    synth.addEventListener?.('voiceschanged', update);
    return () => synth.removeEventListener?.('voiceschanged', update);
  }, []);
  return voices;
};

/**
 * Reads text aloud with the viewer's own device voice (Web Speech API). Starts
 * only on request, stops on a language or text change, a hidden tab and
 * unmount. Nothing leaves the device.
 */
export const useSpeech = (locale: Locale, text: string) => {
  const voices = useVoices();
  const [speaking, setSpeaking] = useState(false);
  const [event, setEvent] = useState<SpeechEvent>(null);
  const reset = useRef<() => void>(() => undefined);
  const voice = chooseVoice(voices, locale);

  let status: SpeechStatus = 'idle';
  if (!hasSpeech()) status = 'unsupported';
  else if (voices.length === 0) status = 'loading';
  else if (!voice) status = 'no-voice';
  else if (speaking) status = 'speaking';

  const stop = useCallback((next: SpeechEvent = 'stopped') => {
    if (resetActive !== reset.current) return;
    resetActive = null;
    if (hasSpeech()) window.speechSynthesis.cancel();
    setSpeaking(false);
    setEvent(next);
  }, []);

  const speak = useCallback(() => {
    if (!voice || !text) return;
    resetActive?.();
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = voice;
    utterance.lang = voice.lang;
    const mine = () => {
      setSpeaking(false);
      setEvent('stopped');
    };
    const done = () => {
      if (resetActive !== mine) return;
      resetActive = null;
      setSpeaking(false);
      setEvent('finished');
    };
    utterance.onend = done;
    utterance.onerror = done;
    reset.current = mine;
    resetActive = mine;
    setSpeaking(true);
    setEvent('started');
    window.speechSynthesis.speak(utterance);
  }, [voice, text]);

  useEffect(() => {
    stop();
  }, [locale, text, stop]);

  useEffect(() => {
    const onHide = () => {
      if (document.hidden) stop();
    };
    const onPageHide = () => stop();
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', onPageHide);
      stop();
    };
  }, [stop]);

  return { status, event, speak, stop: () => stop() };
};
