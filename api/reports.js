import { handler } from '../server/functions/reports.js';
import { createVercelHandler } from '../server/vercel-adapter.js';

export default createVercelHandler(handler);
