import express from 'express';
import User from './user.model.js';
import { verifyToken } from '../../middlewares/auth.middleware.js';

const router = express.Router();

// Get all users
router.get('/', async (req, res) => {
  const users = await User.findAll();
  res.json(users);
});

// Create user (manual)
router.post('/', async (req, res) => {
  const { phone, role, firebase_uid } = req.body;
  const user = await User.create({ phone, role, firebase_uid });
  res.json(user);
});

/**
 * POST /api/v1/users/register-fcm-token
 * Register Firebase Cloud Messaging token for push notifications
 */
router.post('/register-fcm-token', verifyToken, async (req, res) => {
  try {
    const { fcm_token } = req.body;

    if (!fcm_token) {
      return res.status(400).json({
        success: false,
        message: 'Missing fcm_token',
      });
    }

    const user = await User.findOne({
      where: { firebase_uid: req.user.uid },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    await user.update({ fcm_token });

    res.json({
      success: true,
      message: 'FCM token registered successfully',
    });
  } catch (error) {
    console.error('Error registering FCM token:', error);
    res.status(500).json({
      success: false,
      message: 'Error registering FCM token',
      error: error.message,
    });
  }
});

export default router;
