import app from './app.js';
import { port } from './config/env.js';
import sequelize from './config/db.js';
import redis from './config/redis.js';
import './models/index.js'; // 🔥 THIS IS THE KEY

async function startServer() {
  try {
    await sequelize.authenticate();
    console.log('✅ Postgres connected');

    await sequelize.sync({ alter: true });
    console.log('✅ Models synced with database');

    await redis.ping();
    console.log('✅ Redis connected');

    app.listen(port, () => {
      console.log(`🚀 Server running on port ${port}`);
    });
  } catch (err) {
    console.error('❌ Startup failed:', err);
    process.exit(1);
  }
}

startServer();
