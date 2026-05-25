import { createApp } from './app.js';

const { app, config } = await createApp();

await app.listen({ host: config.host, port: config.port });
