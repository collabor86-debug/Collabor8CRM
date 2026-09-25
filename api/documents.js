import { handler } from '../server/functions/documents.js';
import { createVercelHandler } from '../server/vercel-adapter.js';

export default createVercelHandler(handler);
