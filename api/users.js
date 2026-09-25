import { handler } from '../server/functions/users.js';
import { createVercelHandler } from '../server/vercel-adapter.js';

export default createVercelHandler(handler);
