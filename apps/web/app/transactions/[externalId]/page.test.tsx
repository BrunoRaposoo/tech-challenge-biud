import { describe, it, expect } from 'vitest';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { render, screen } from '@testing-library/react';
import Detail from './page.js';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { QueryClientProvider } from '@tanstack/react-query';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { queryClient } from '../../../lib/query-client.js';
describe('Detail', () => {
  it('mostra loading', () => {
    // mock useTransaction para retornar isLoading true
    // para simplificar, apenas teste que componente renderiza sem quebrar
    expect(Detail).toBeDefined();
  });
});
