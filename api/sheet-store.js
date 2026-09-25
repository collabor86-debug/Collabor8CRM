import { handler } from '../server/functions/sheet-store.js';
import { createVercelHandler } from '../server/vercel-adapter.js';

export default createVercelHandler(handler);
