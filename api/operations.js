import { handler } from '../server/functions/operations.js';
import { createVercelHandler } from '../server/vercel-adapter.js';

export default createVercelHandler(handler);
