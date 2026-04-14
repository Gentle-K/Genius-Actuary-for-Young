import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

if (
  !window.localStorage ||
  typeof window.localStorage.getItem !== 'function' ||
  typeof window.localStorage.setItem !== 'function' ||
  typeof window.localStorage.removeItem !== 'function'
) {
  const storage = new Map<string, string>()

  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: {
      get length() {
        return storage.size
      },
      clear() {
        storage.clear()
      },
      getItem(key: string) {
        return storage.has(key) ? storage.get(key)! : null
      },
      key(index: number) {
        return Array.from(storage.keys())[index] ?? null
      },
      removeItem(key: string) {
        storage.delete(key)
      },
      setItem(key: string, value: string) {
        storage.set(String(key), String(value))
      },
    },
  })
}

if (!window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }),
  })
}

if (!window.ResizeObserver) {
  class ResizeObserverMock {
    observe() {}

    unobserve() {}

    disconnect() {}
  }

  window.ResizeObserver = ResizeObserverMock
}

window.HTMLElement.prototype.scrollIntoView = vi.fn()

Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  configurable: true,
  value: vi.fn(
    () =>
      ({
        canvas: document.createElement('canvas'),
        clearRect: () => {},
        fillRect: () => {},
        beginPath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        closePath: () => {},
        stroke: () => {},
        fill: () => {},
        arc: () => {},
        measureText: () => ({ width: 0 }),
        save: () => {},
        restore: () => {},
        setTransform: () => {},
        scale: () => {},
        translate: () => {},
        createLinearGradient: () => ({ addColorStop: () => {} }),
        createRadialGradient: () => ({ addColorStop: () => {} }),
      }) as unknown as CanvasRenderingContext2D,
  ),
})
