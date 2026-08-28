import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusDonut } from './StatusDonut.js';
describe('StatusDonut', () => {
  it('mostra titulo', () => {
    render(<StatusDonut pending={1} approved={2} rejected={3} />);
    expect(screen.getByText(/Distribuição/i)).toBeInTheDocument();
  });
});
