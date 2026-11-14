import { createApp } from '../server/app.js';

// Vercel invokes this Express application per request; do not call listen() here.
const app = createApp();
export default app;
