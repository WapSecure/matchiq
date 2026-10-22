import type { Page } from '@playwright/test';
import type { StreamMessage } from '@matchiq/contracts';
import { handleRoute, type MockApiOptions, type Recorder } from './mock-routes';
import {
  initialStreamMessages,
  resetStreamSequence,
  toFrame,
} from './mock-stream';

export type { MockApiOptions } from './mock-routes';

/** Matches the build-time default of `NEXT_PUBLIC_API_BASE_URL`. */
export const API_BASE = 'http://localhost:3000/api/v1';

export type MockApi = Recorder & {
  /** Pushes one message onto every open mocked SSE connection. */
  push: (message: StreamMessage) => Promise<void>;
};

/** Runs in the page before app code: serves SSE from an open in-memory stream. */
const installStreamMock = ({ frames }: { frames: string[] }) => {
  const w = window as unknown as {
    __mqStreams: ReadableStreamDefaultController<Uint8Array>[];
    __mqPush: (f: string) => void;
  };
  const encoder = new TextEncoder();
  const original = window.fetch.bind(window);
  w.__mqStreams = [];
  w.__mqPush = (frame) =>
    w.__mqStreams.forEach((c) => c.enqueue(encoder.encode(frame)));
  window.fetch = (input, init) => {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    if (!url.includes('/stream')) return original(input, init);
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        w.__mqStreams.push(controller);
        frames.forEach((f) => controller.enqueue(encoder.encode(f)));
      },
    });
    return Promise.resolve(
      new Response(body, {
        headers: { 'content-type': 'text/event-stream' },
      }),
    );
  };
};

/**
 * REST is mocked with `page.route`. The stream is mocked in-page by wrapping
 * `fetch`, because a routed response must be complete and cannot stay open.
 */
export const mockApi = async (
  page: Page,
  options: MockApiOptions & { stream?: StreamMessage[] } = {},
): Promise<MockApi> => {
  resetStreamSequence();
  const recorder: Recorder = {
    replayCommands: [],
    sessionStarts: [],
    editorialCommands: [],
  };
  const stream = options.stream ?? initialStreamMessages();

  await page.addInitScript(installStreamMock, { frames: stream.map(toFrame) });
  await page.route(`${API_BASE}/**`, (route) =>
    handleRoute(route, options, recorder),
  );

  return {
    ...recorder,
    push: async (message) => {
      await page.evaluate(
        (frame) =>
          (window as unknown as { __mqPush: (f: string) => void }).__mqPush(
            frame,
          ),
        toFrame(message),
      );
    },
  };
};
