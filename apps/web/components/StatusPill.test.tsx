import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusPill } from './StatusPill';
describe('StatusPill', () => {
  it('mapeia PENDING para pt-BR', () => {
    render(<StatusPill status="PENDING" />);
    expect(screen.getByText('Pendente')).toBeInTheDocument();
  });
  it('mapeia REJECTED', () => {
    render(<StatusPill status="REJECTED" />);
    expect(screen.getByText('Rejeitada')).toBeInTheDocument();
  });
});
