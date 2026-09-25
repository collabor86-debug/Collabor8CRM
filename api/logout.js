import { handler } from '../server/functions/logout.js';
import { createVercelHandler } from '../server/vercel-adapter.js';

export default createVercelHandler(handler);
