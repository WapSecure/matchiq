import type { StreamMessage } from '@matchiq/contracts';
import type { SseFrame, SseRequest, SseTransport } from '@/lib/stream';

type Connection = {
  request: SseRequest;
  /** Signals that the server accepted the stream (headers received). */
  open: () => void;
  push: (frame: SseFrame) => void;
  /** Ends the stream cleanly, as a server close would. */
  end: () => void;
  fail: (error: Error) => void;
};

export const frameOf = (message: StreamMessage): SseFrame => ({
  id: String(message.streamSequence),
  event: message.type,
  data: JSON.stringify(message),
  retryMs: null,
});

/**
 * In-memory SSE transport; each connect() call is recorded and controllable.
 * With `autoOpen` the connection is accepted on the next microtask.
 */
export const createFakeTransport = ({ autoOpen = false } = {}) => {
  const connections: Connection[] = [];

  const transport: SseTransport = (request) => {
    const queue: SseFrame[] = [];
    let wake: (() => void) | null = null;
    let done = false;
    let error: Error | null = null;
    const notify = () => {
      wake?.();
      wake = null;
    };
    let opened = false;
    const open = () => {
      if (opened) return;
      opened = true;
      request.onOpen?.();
    };
    if (autoOpen) queueMicrotask(open);
    connections.push({
      request,
      open,
      push: (frame) => {
        queue.push(frame);
        notify();
      },
      end: () => {
        done = true;
        notify();
      },
      fail: (e) => {
        error = e;
        notify();
      },
    });
    request.signal.addEventListener('abort', () => {
      error = new Error('aborted');
      notify();
    });
    return {
      async *[Symbol.asyncIterator]() {
        for (;;) {
          const next = queue.shift();
          if (next) {
            yield next;
            continue;
          }
          if (error) throw error;
          if (done) return;
          await new Promise<void>((resolve) => {
            wake = resolve;
          });
        }
      },
    };
  };

  return { transport, connections };
};
