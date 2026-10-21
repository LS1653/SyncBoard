import '@testing-library/jest-dom';
import { vi, afterEach } from 'vitest';

// Clean up after each test
afterEach(() => {
  vi.clearAllMocks();
});
