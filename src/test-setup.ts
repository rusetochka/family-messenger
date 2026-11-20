import '@testing-library/jest-dom';

// IntersectionObserver is not available in JSDOM
globalThis.IntersectionObserver = class {
  observe()    {}
  unobserve()  {}
  disconnect() {}
} as unknown as typeof IntersectionObserver;
