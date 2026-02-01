import express from 'express';
import sequelize from './config/db.js';
import redis from './config/redis.js';

import userRoutes from './modules/auth/user.routes.js';
import partnerRoutes from './modules/partners/partner.routes.js';

const router = express.Router();

router.use('/users', userRoutes);
router.use('/partners', partnerRoutes);

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
