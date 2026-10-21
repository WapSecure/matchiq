/** One dispatched Server-Sent Event, per the WHATWG event-stream format. */
export type SseFrame = {
  id: string | null;
  event: string;
  data: string;
  retryMs: number | null;
};

const LINE_BREAK = /\r\n|\r|\n/;
const DEFAULT_EVENT = 'message';
const COMMENT_PREFIX = ':';
const FIELD_SEPARATOR = ':';
const DIGITS_ONLY = /^\d+$/;
const NULL_CHAR = '\0';

type Pending = { id: string | null; event: string; data: string[] };

const emptyPending = (): Pending => ({ id: null, event: '', data: [] });

/**
 * Incremental parser: feed arbitrary text chunks, receive complete frames.
 * Partial lines are buffered until their terminator arrives.
 */
export class SseParser {
  private buffer = '';
  private pending = emptyPending();
  private retryMs: number | null = null;

  push(chunk: string): SseFrame[] {
    this.buffer += chunk;
    const lines = this.buffer.split(LINE_BREAK);
    this.buffer = lines.pop() ?? '';
    const frames: SseFrame[] = [];
    for (const line of lines) {
      const frame = this.consumeLine(line);
      if (frame) frames.push(frame);
    }
    return frames;
  }

  private consumeLine(line: string): SseFrame | null {
    if (line === '') return this.dispatch();
    if (line.startsWith(COMMENT_PREFIX)) return null;
    const separator = line.indexOf(FIELD_SEPARATOR);
    const field = separator === -1 ? line : line.slice(0, separator);
    const rawValue = separator === -1 ? '' : line.slice(separator + 1);
    const value = rawValue.startsWith(' ') ? rawValue.slice(1) : rawValue;
    this.applyField(field, value);
    return null;
  }

  private applyField(field: string, value: string): void {
    if (field === 'data') this.pending.data.push(value);
    else if (field === 'event') this.pending.event = value;
    else if (field === 'id' && !value.includes(NULL_CHAR))
      this.pending.id = value;
    else if (field === 'retry' && DIGITS_ONLY.test(value))
      this.retryMs = Number(value);
  }

  private dispatch(): SseFrame | null {
    const { id, event, data } = this.pending;
    this.pending = emptyPending();
    if (data.length === 0) return null;
    return {
      id,
      event: event || DEFAULT_EVENT,
      data: data.join('\n'),
      retryMs: this.retryMs,
    };
  }
}
