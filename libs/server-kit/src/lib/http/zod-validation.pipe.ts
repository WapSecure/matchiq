import { Injectable, type PipeTransform } from '@nestjs/common';
import type { z } from 'zod';
import { RequestValidationError } from './request-validation.error';

const ROOT_PATH = '$';

@Injectable()
export class ZodValidationPipe<S extends z.ZodType> implements PipeTransform {
  constructor(private readonly schema: S) {}

  transform(value: unknown): z.infer<S> {
    const result = this.schema.safeParse(value);
    if (result.success) return result.data;
    throw new RequestValidationError(
      result.error.issues.map((issue) => ({
        path: [ROOT_PATH, ...issue.path.map(String)].join('.'),
        message: issue.message,
      })),
    );
  }
}
