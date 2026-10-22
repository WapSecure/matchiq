import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import { Gauge, METRICS_REGISTRY, type Registry } from '@matchiq/server-kit';
import { StreamService } from '../stream/stream.service';
import { API_METRICS } from './telemetry.constants';

/** Open SSE connections in this API instance, read at scrape time. */
@Injectable()
export class StreamGauges implements OnModuleInit {
  constructor(
    @Inject(METRICS_REGISTRY) private readonly registry: Registry,
    private readonly streams: StreamService,
  ) {}

  onModuleInit(): void {
    const streams = this.streams;
    new Gauge({
      name: API_METRICS.sseConnections.name,
      help: API_METRICS.sseConnections.help,
      registers: [this.registry],
      collect() {
        this.set(streams.openSessions);
      },
    });
  }
}
