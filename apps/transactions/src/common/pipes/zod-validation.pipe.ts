import { PipeTransform, BadRequestException } from '@nestjs/common';
import { ZodSchema, ZodError } from 'zod';

export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodSchema) {}

  transform(value: unknown) {
    try {
      return this.schema.parse(value);
    } catch (e) {
      const err = e as ZodError;
      throw new BadRequestException({
        message: 'Validation failed',
        errors: err.flatten().fieldErrors,
      });
    }
  }
}
