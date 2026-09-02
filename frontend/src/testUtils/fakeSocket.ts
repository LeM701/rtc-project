export function createFakeSocket() {
  const listeners: Record<string, Array<(payload?: any) => void>> = {};

  const socket = {
    connected: true,
    on: jest.fn((event: string, cb: (payload?: any) => void) => {
      (listeners[event] ||= []).push(cb);
    }),
    off: jest.fn((event: string, cb: (payload?: any) => void) => {
      listeners[event] = (listeners[event] || []).filter((l) => l !== cb);
    }),
    once: jest.fn((event: string, cb: (payload?: any) => void) => {
      (listeners[event] ||= []).push(cb);
    }),
    emit: jest.fn(),
    __trigger(event: string, payload?: any) {
      (listeners[event] || []).forEach((cb) => cb(payload));
    },
  };

  return socket;
}
