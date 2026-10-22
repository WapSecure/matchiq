import { Controller, Get, Inject, Param, Res } from '@nestjs/common';
import { PublicRoute, ZodValidationPipe } from '@matchiq/server-kit';
import type { Response } from 'express';
import { CACHE_CONTROL, HEADER_NAMES } from '../constants';
import { DOCS_BUNDLE, DOCS_MEDIA, type DocsBundle } from './docs-bundle';
import {
  CSP_HEADER,
  DOCS_CACHE,
  DOCS_CSP,
  DOCS_ROUTES,
  type DocsAssetName,
} from './openapi.constants';
import { DocsAssetPath } from './routes/platform.routes';

const assetPipe = new ZodValidationPipe(DocsAssetPath.shape.asset);

/** Registered only when `apiDocsEnabled(env)`; see `OpenApiModule`. */
@PublicRoute()
@Controller()
export class OpenApiController {
  constructor(@Inject(DOCS_BUNDLE) private readonly bundle: DocsBundle) {}

  @Get(DOCS_ROUTES.document)
  document(@Res() res: Response): void {
    res
      .type(DOCS_MEDIA.document)
      .setHeader(HEADER_NAMES.cacheControl, CACHE_CONTROL.noStore)
      .send(this.bundle.document);
  }

  @Get(DOCS_ROUTES.ui)
  page(@Res() res: Response): void {
    res
      .type(DOCS_MEDIA.page)
      .setHeader(CSP_HEADER, DOCS_CSP)
      .setHeader(HEADER_NAMES.cacheControl, CACHE_CONTROL.noStore)
      .send(this.bundle.page);
  }

  @Get(DOCS_ROUTES.asset)
  asset(
    @Param('asset', assetPipe) name: DocsAssetName,
    @Res() res: Response,
  ): void {
    const asset = this.bundle.assets[name];
    res
      .type(asset.type)
      .setHeader(HEADER_NAMES.cacheControl, DOCS_CACHE)
      .send(asset.body);
  }
}
