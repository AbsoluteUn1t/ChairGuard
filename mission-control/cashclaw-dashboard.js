// Wraps Cashclaw dashboard server — calls createDashboardServer() directly,
// bypassing the broken open-browser-on-start behavior from the CLI.
import { createDashboardServer } from '/home/curtis/.npm/_npx/ba18a76e3efa5815/node_modules/cashclaw/src/dashboard/server.js';

const PORT = process.env.PORT || 3847;
const HOST = process.env.HOST || 'localhost';

const app = createDashboardServer();
const server = app.listen(PORT, HOST, () => {
  console.log(`Cashclaw dashboard → http://${HOST}:${PORT}`);
  console.log(`API: http://${HOST}:${PORT}/api/status`);
});

// Keep alive
process.on('SIGINT', () => { server.close(() => process.exit(0)); });
process.on('SIGTERM', () => { server.close(() => process.exit(0)); });