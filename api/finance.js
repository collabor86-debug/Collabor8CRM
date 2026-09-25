import { handler } from '../server/functions/finance.js';
import { createVercelHandler } from '../server/vercel-adapter.js';

export default createVercelHandler(handler);
