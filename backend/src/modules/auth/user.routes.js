import express from 'express';
import User from './user.model.js';

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

export default router;
