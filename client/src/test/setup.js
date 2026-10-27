import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Unmount rendered components after every test so tests do not see each other's DOM.
afterEach(cleanup);
