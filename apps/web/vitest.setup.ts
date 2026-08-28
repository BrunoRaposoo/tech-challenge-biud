import '@testing-library/jest-dom/vitest';

// Polyfill ResizeObserver for Tremor/Recharts (jsdom)
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}
