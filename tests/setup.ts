import '@testing-library/jest-dom/vitest';

// In jsdom, canvas getContext is unimplemented; returning null cleanly lets
// BallparkCanvas activate its graceful fallback without noisy jsdom stderr logs.
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  configurable: true,
  value: () => null,
});
