/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../lib/query-client';
import Page from './page';

describe('Page', () => {
  it('renders Dashboard', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => ({
        data: [],
        meta: { page: 1, limit: 10, total: 0, totalPages: 0, hasNext: false, hasPrev: false },
      }),
    } as any);
    render(
      <QueryClientProvider client={queryClient}>
        <Page />
      </QueryClientProvider>,
    );
    expect(await screen.findByText(/Todos status/i)).toBeInTheDocument();
  });
});
