import type { DestinationStream } from 'pino';
import { PRETTY } from './telemetry.constants';

const { colors: COLORS, reset: RESET } = PRETTY;

const OMITTED: ReadonlySet<string> = new Set(PRETTY.omit);

/** One JSON log line as `HH:MM:SS.mmm LEVEL [context] message {fields}`. */
export const prettyLine = (json: string): string => {
  const record = JSON.parse(json) as Record<string, unknown>;
  const level = String(record['level'] ?? 'info');
  const { context, ...rest } = Object.fromEntries(
    Object.entries(record).filter(([k]) => !OMITTED.has(k)),
  );
  const extra = Object.keys(rest).length > 0 ? ` ${JSON.stringify(rest)}` : '';
  const scope = typeof context === 'string' ? ` [${context}]` : '';
  const time = PRETTY.time(String(record['time'] ?? ''));
  const color = COLORS[level] ?? '';
  return `${time} ${color}${level.toUpperCase().padEnd(5)}${RESET}${scope} ${String(record['msg'] ?? '')}${extra}\n`;
};

/** Local-development destination; JSON stays the format everywhere else. */
export const prettyDestination = (
  out: NodeJS.WritableStream = process.stdout,
): DestinationStream => ({
  write: (chunk: string) => {
    out.write(prettyLine(chunk));
  },
});
