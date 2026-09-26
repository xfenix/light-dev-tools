import "@testing-library/jest-dom/vitest";

// jsdom has no layout, so there is nothing to observe, the emoji picker only
// needs the api to exist
class IdleIntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}
globalThis.IntersectionObserver ??=
  IdleIntersectionObserver as unknown as typeof IntersectionObserver;
