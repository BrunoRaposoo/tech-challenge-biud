import { describe, it, expect } from 'vitest';
import { Test } from '@nestjs/testing';
import { AppController } from './app.controller.js';

describe('AppController', () => {
  it('health retorna ok', async () => {
    const mod = await Test.createTestingModule({ controllers: [AppController] }).compile();
    const ctrl = mod.get(AppController);
    expect(ctrl.health()).toEqual({ status: 'ok' });
  });
});
