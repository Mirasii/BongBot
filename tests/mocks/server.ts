
import { setupServer } from 'msw/node';
import { handlers } from './handlers.js';

const server = setupServer(...handlers);

export { server };
