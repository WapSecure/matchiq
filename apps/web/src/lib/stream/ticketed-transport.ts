import { STREAM_TICKET_PARAM } from '@/constants/api';
import { fetchSseTransport, type SseTransport } from './sse-transport';

/** Returns a fresh short-lived stream ticket for the fixture (ADR-0018). */
export type TicketSource = () => Promise<string>;

/**
 * Stream requests cannot carry the session's bearer token from the browser,
 * so each (re)connection first asks the BFF for a ticket and sends it as
 * `?ticket=`. A failed ticket request fails the attempt and the stream
 * client's normal reconnect policy takes over.
 */
export const ticketedSseTransport = (
  nextTicket: TicketSource,
  base: SseTransport = fetchSseTransport(),
): SseTransport =>
  async function* stream(request) {
    const url = new URL(request.url);
    url.searchParams.set(STREAM_TICKET_PARAM, await nextTicket());
    yield* base({ ...request, url: url.toString() });
  };
