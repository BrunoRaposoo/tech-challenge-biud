import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Page from './page.js';

describe('Page', () => {
  it('renders Dashboard', () => {
    render(<Page />);
    expect(screen.getByText('Dashboard')).toBeDefined();
  });
});
