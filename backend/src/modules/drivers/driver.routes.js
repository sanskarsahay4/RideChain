import express from 'express';
import Driver from './driver.model.js';
import User from '../auth/user.model.js';
import { verifyToken } from '../../middlewares/auth.middleware.js';

const router = express.Router();

/**
 * GET /api/v1/drivers
 * Retrieve all drivers
 */
router.get('/', async (req, res) => {
  try {
    const drivers = await Driver.findAll({
      include: {
        model: User,
        attributes: ['id', 'phone', 'firebase_uid'],
      },
    });

    res.json({
      success: true,
      data: drivers,
    });
  } catch (error) {
    console.error('Error fetching drivers:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching drivers',
      error: error.message,
    });
  }
});

/**
 * GET /api/v1/drivers/:id
 * Retrieve a specific driver
 */
router.get('/:id', async (req, res) => {
  try {
    const driver = await Driver.findByPk(req.params.id, {
      include: {
        model: User,
        attributes: ['id', 'phone', 'firebase_uid'],
      },
    });

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found',
      });
    }

    res.json({
      success: true,
      data: driver,
    });
  } catch (error) {
    console.error('Error fetching driver:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching driver',
      error: error.message,
    });
  }
});

/**
 * PATCH /api/v1/drivers/location
 * Update driver's current location and last_active timestamp (Pulse API)
 * This is the "heartbeat" that keeps the driver alive in the system
 */
router.patch('/location', verifyToken, async (req, res) => {
  try {
    const { latitude, longitude } = req.body;

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Missing latitude or longitude',
      });
    }

    // Find driver by firebase_uid
    const user = await User.findOne({
      where: { firebase_uid: req.user.uid },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const driver = await Driver.findOne({
      where: { user_id: user.id },
    });

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver profile not found',
      });
    }

    // Update location and last_active timestamp
    await driver.update({
      current_lat: latitude,
      current_lng: longitude,
      last_active: new Date(),
    });

    res.json({
      success: true,
      message: 'Location updated successfully',
      data: {
        id: driver.id,
        current_lat: driver.current_lat,
        current_lng: driver.current_lng,
        last_active: driver.last_active,
      },
    });
  } catch (error) {
    console.error('Error updating location:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating location',
      error: error.message,
    });
  }
});

/**
 * PATCH /api/v1/drivers/:id/online-status
 * Update driver's online/offline status
 */
router.patch('/:id/online-status', verifyToken, async (req, res) => {
  try {
    const { is_online } = req.body;

    if (is_online === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Missing is_online parameter',
      });
    }

    const driver = await Driver.findByPk(req.params.id);

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found',
      });
    }

    await driver.update({
      is_online,
      last_active: new Date(),
    });

    res.json({
      success: true,
      message: `Driver is now ${is_online ? 'online' : 'offline'}`,
      data: {
        id: driver.id,
        is_online: driver.is_online,
      },
    });
  } catch (error) {
    console.error('Error updating online status:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating online status',
      error: error.message,
    });
  }
});

export default router;
