import app from './app.js';
import { port } from './config/env.js';
import sequelize from './config/db.js';
import redis from './config/redis.js';

(async () => {
  try {
    // Postgres
    await sequelize.authenticate();
    console.log('✅ Postgres connected');

    // Redis
    await redis.ping();
    console.log('✅ Redis connected');

    // Start Express server
    app.listen(port, () => {
      console.log(`🚀 Server running on port ${port}`);
    });
  } catch (err) {
    console.error('❌ Startup failed:', err);
    process.exit(1);
  }
})();
