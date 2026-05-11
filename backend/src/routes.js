import express from 'express';
import sequelize from './config/db.js';
import redis from './config/redis.js';

import userRoutes from './modules/auth/user.routes.js';
import partnerRoutes from './modules/partners/partner.routes.js';
import driverRoutes from './modules/drivers/driver.routes.js';
import taskRoutes from './modules/tasks/task.routes.js';
import adminRoutes from './routes/admin.routes.js';

const router = express.Router();

router.use('/v1/users', userRoutes);
router.use('/v1/partners', partnerRoutes);
router.use('/v1/drivers', driverRoutes);
router.use('/v1/tasks', taskRoutes);
router.use('/v1/admin', adminRoutes);

router.get('/health', async (req, res) => {
  try {
    await sequelize.authenticate();
    await redis.ping();

    res.json({
      status: 'ok',
      db: 'up',
      redis: 'up',
      timestamp: new Date(),
    });
  } catch (err) {
    res.status(500).json({
      status: 'down',
      error: err.message,
    });
  }
});

export default router;
