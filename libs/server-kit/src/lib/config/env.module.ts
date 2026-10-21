import { type DynamicModule, Global, Module } from '@nestjs/common';

export const APP_ENV = Symbol('APP_ENV');

/** Exposes the validated, frozen environment of the running service under `APP_ENV`. */
@Global()
@Module({})
export class EnvModule {
  static forRoot<E extends object>(env: E): DynamicModule {
    return {
      module: EnvModule,
      providers: [{ provide: APP_ENV, useValue: Object.freeze({ ...env }) }],
      exports: [APP_ENV],
    };
  }
}
