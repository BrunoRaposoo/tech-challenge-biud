import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { ZodValidationPipe } from './zod-validation.pipe.js';

describe('ZodValidationPipe', () => {
  it('lança BadRequest com errors por campo', () => {
    const pipe = new ZodValidationPipe(z.object({ value: z.number().positive() }));
    expect(() => pipe.transform({ value: -1 })).toThrow(/Validation failed/);
  });

  it('retorna valor valido', () => {
    const pipe = new ZodValidationPipe(z.object({ value: z.number().positive() }));
    expect(pipe.transform({ value: 10 })).toEqual({ value: 10 });
  });

  it('expõe fieldErrors detalhados', () => {
    const pipe = new ZodValidationPipe(z.object({ value: z.number().positive() }));
    try {
      pipe.transform({ value: -1 });
    } catch (e: unknown) {
      const err = e as { getResponse: () => Record<string, unknown> };
      const resp = err.getResponse() as Record<string, unknown>;
      expect(resp.errors).toBeDefined();
      const errors = resp.errors as Record<string, unknown>;
      expect(errors.value).toBeDefined();
    }
  });
});
