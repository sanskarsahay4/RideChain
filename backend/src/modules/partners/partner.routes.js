import express from 'express';
import Partner from './partner.model.js';

const router = express.Router();

/**
 * GET /api/partners
 * Fetch all partners
 */
router.get('/', async (req, res) => {
  try {
    const partners = await Partner.findAll();
    res.json(partners);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/partners
 * Create a partner manually
 */
router.post('/', async (req, res) => {
  try {
    const partner = await Partner.create(req.body);
    res.status(201).json(partner);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
