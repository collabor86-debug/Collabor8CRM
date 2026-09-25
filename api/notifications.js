import { handler } from '../server/functions/notifications.js';
import { createVercelHandler } from '../server/vercel-adapter.js';

export default createVercelHandler(handler);
