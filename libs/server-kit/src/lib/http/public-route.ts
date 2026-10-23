import { SetMetadata } from '@nestjs/common';

export const PUBLIC_ROUTE_METADATA = 'matchiq:public-route';

/** Opts a controller or handler out of authentication and permission checks (ADR-0018). */
export const PublicRoute = () => SetMetadata(PUBLIC_ROUTE_METADATA, true);
