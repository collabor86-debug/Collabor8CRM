import { handler } from '../server/functions/audit.js';
import { createVercelHandler } from '../server/vercel-adapter.js';

export default createVercelHandler(handler);
