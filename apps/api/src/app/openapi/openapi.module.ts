import { type DynamicModule, Module } from '@nestjs/common';
import { type ApiEnv, apiDocsEnabled } from '@matchiq/config';
import { DOCS_BUNDLE, loadDocsBundle } from './docs-bundle';
import { OpenApiController } from './openapi.controller';

/** `GET /openapi.json` and `/docs`, off in prod unless `API_DOCS_ENABLED=true`. */
@Module({})
export class OpenApiModule {
  static forRoot(env: ApiEnv): DynamicModule {
    if (!apiDocsEnabled(env)) return { module: OpenApiModule };
    return {
      module: OpenApiModule,
      controllers: [OpenApiController],
      providers: [
        { provide: DOCS_BUNDLE, useFactory: () => loadDocsBundle(env) },
      ],
    };
  }
}
