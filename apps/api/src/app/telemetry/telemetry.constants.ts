/** The API's own Prometheus series; RED metrics come from server-kit. */
export const API_METRICS = {
  sseConnections: {
    name: 'matchiq_sse_connections',
    help: 'Open SSE stream connections in this API instance',
  },
} as const;
