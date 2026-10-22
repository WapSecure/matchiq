import { type DynamicModule, Global, Module } from '@nestjs/common';
import type { AuthEnv } from '@matchiq/config';
import { authFromEnv } from '../from-env';
import { AUTHENTICATOR, STREAM_TICKETS } from './tokens';

/**
 * Provides the authenticator and stream tickets. The app registers
 * `AuthenticationGuard`, its throttler (so it can key on the principal) and
 * `PermissionGuard` as `APP_GUARD`s with `useClass`, in that order, so the
 * permission guard sees the app's `ACCESS_DENIED_LISTENER`.
 */
@Global()
@Module({})
export class AuthModule {
  static forRoot(env: AuthEnv): DynamicModule {
    const { authenticator, tickets } = authFromEnv(env);
    const providers = [
      { provide: AUTHENTICATOR, useValue: authenticator },
      { provide: STREAM_TICKETS, useValue: tickets },
    ];
    return { module: AuthModule, providers, exports: providers };
  }
}
