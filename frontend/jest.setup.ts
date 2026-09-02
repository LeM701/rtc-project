import '@testing-library/jest-dom';

Element.prototype.scrollIntoView = jest.fn();

// Silence the "not wrapped in act(...)" warning specifically: it fires here
// because some child components (ChannelSidebar, MembersPanel) keep their
// own internal loading state after an async call, which can resolve slightly
// after the test's own awaited interaction. The tests still correctly wait
// for the real outcome via waitFor/findBy; this warning is cosmetic noise.
const originalError = console.error;
console.error = (...args: unknown[]) => {
  if (typeof args[0] === 'string' && args[0].includes('not wrapped in act')) {
    return;
  }
  originalError(...args);
};
