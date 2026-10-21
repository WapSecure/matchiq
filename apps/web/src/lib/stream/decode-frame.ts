import { StreamMessage } from '@matchiq/contracts';
import type { SseFrame } from './sse-parser';

export type DecodeResult =
  { ok: true; message: StreamMessage } | { ok: false; reason: string };

const parseJson = (data: string): unknown => {
  try {
    return JSON.parse(data) as unknown;
  } catch {
    return undefined;
  }
};

/** Validates one SSE frame against `StreamMessage` and the SSE envelope. */
export const decodeFrame = (
  frame: SseFrame,
  fixtureId: string,
): DecodeResult => {
  const json = parseJson(frame.data);
  if (json === undefined) return { ok: false, reason: 'data is not JSON' };
  const parsed = StreamMessage.safeParse(json);
  if (!parsed.success) {
    return { ok: false, reason: parsed.error.issues[0]?.message ?? 'invalid' };
  }
  const message = parsed.data;
  if (message.fixtureId !== fixtureId) {
    return { ok: false, reason: 'message belongs to another fixture' };
  }
  if (frame.event !== 'message' && frame.event !== message.type) {
    return { ok: false, reason: 'SSE event name does not match payload type' };
  }
  if (frame.id !== null && frame.id !== String(message.streamSequence)) {
    return { ok: false, reason: 'SSE id does not match streamSequence' };
  }
  return { ok: true, message };
};
