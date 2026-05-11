import express from 'express';
import Task from './task.model.js';
import Driver from '../drivers/driver.model.js';
import Partner from '../partners/partner.model.js';
import User from '../auth/user.model.js';
import { verifyToken } from '../../middlewares/auth.middleware.js';
import { allocateTask } from '../../services/allocationService.js';

const router = express.Router();

/**
 * GET /api/v1/tasks
 * Retrieve all tasks with filters
 */
router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    const where = status ? { status } : {};

    const tasks = await Task.findAll({
      where,
      include: [
        {
          model: Partner,
          attributes: ['id', 'name', 'type'],
        },
        {
          model: Driver,
          attributes: ['id', 'vehicle_type'],
          include: {
            model: User,
            attributes: ['phone'],
          },
        },
      ],
      order: [['created_at', 'DESC']],
    });

    res.json({
      success: true,
      data: tasks,
    });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching tasks',
      error: error.message,
    });
  }
});

/**
 * GET /api/v1/tasks/:id
 * Retrieve a specific task
 */
router.get('/:id', async (req, res) => {
  try {
    const task = await Task.findByPk(req.params.id, {
      include: [
        {
          model: Partner,
          attributes: ['id', 'name', 'type', 'contact_phone'],
        },
        {
          model: Driver,
          attributes: ['id', 'vehicle_type'],
          include: {
            model: User,
            attributes: ['phone'],
          },
        },
      ],
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    res.json({
      success: true,
      data: task,
    });
  } catch (error) {
    console.error('Error fetching task:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching task',
      error: error.message,
    });
  }
});

/**
 * POST /api/v1/tasks
 * Create a new task and broadcast to nearby drivers
 */
router.post('/', verifyToken, async (req, res) => {
  try {
    const { partner_id, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, description, estimated_distance_km, estimated_fare } = req.body;

    // Validate required fields
    if (!partner_id || !pickup_lat || !pickup_lng) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: partner_id, pickup_lat, pickup_lng',
      });
    }

    // Verify partner exists
    const partner = await Partner.findByPk(partner_id);
    if (!partner) {
      return res.status(404).json({
        success: false,
        message: 'Partner not found',
      });
    }

    // Create task
    const task = await Task.create({
      partner_id,
      pickup_lat,
      pickup_lng,
      dropoff_lat: dropoff_lat || null,
      dropoff_lng: dropoff_lng || null,
      description,
      estimated_distance_km,
      estimated_fare,
      status: 'pending',
    });

    // Reload task with associations for response
    const taskWithAssociations = await Task.findByPk(task.id, {
      include: {
        model: Partner,
        attributes: ['id', 'name', 'type'],
      },
    });

    // Asynchronously allocate task to nearby drivers (non-blocking)
    allocateTask(taskWithAssociations).catch((error) => {
      console.error('Error in async task allocation:', error);
    });

    res.status(201).json({
      success: true,
      message: 'Task created and broadcast to nearby drivers',
      data: taskWithAssociations,
    });
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating task',
      error: error.message,
    });
  }
});

/**
 * POST /api/v1/tasks/:id/accept
 * Accept a task as a driver (Race condition protection)
 */
router.post('/:id/accept', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Find the task
    const task = await Task.findByPk(id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    // Check if task is already accepted (Race condition protection)
    if (task.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Task already ${task.status}. Cannot accept.`,
      });
    }

    // Find driver from firebase_uid
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

    // Update task status and assign driver
    await task.update({
      status: 'assigned',
      driver_id: driver.id,
      assigned_at: new Date(),
    });

    // Reload task with associations
    const updatedTask = await Task.findByPk(id, {
      include: [
        {
          model: Partner,
          attributes: ['id', 'name'],
        },
        {
          model: Driver,
          attributes: ['id', 'vehicle_type'],
        },
      ],
    });

    // TODO: Send webhook to Partner Platform to notify them
    // TODO: Send notification to other drivers that task is taken

    res.json({
      success: true,
      message: 'Task accepted successfully',
      data: updatedTask,
    });
  } catch (error) {
    console.error('Error accepting task:', error);
    res.status(500).json({
      success: false,
      message: 'Error accepting task',
      error: error.message,
    });
  }
});

/**
 * PATCH /api/v1/tasks/:id/status
 * Update task status (for drivers to mark in-progress, completed, etc.)
 */
router.patch('/:id/status', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Missing status field',
      });
    }

    const validStatuses = ['in_progress', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const task = await Task.findByPk(id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    // Verify the driver assigned to this task is the one updating
    const user = await User.findOne({
      where: { firebase_uid: req.user.uid },
    });

    const driver = await Driver.findOne({
      where: { user_id: user.id },
    });

    if (task.driver_id !== driver.id) {
      return res.status(403).json({
        success: false,
        message: 'You are not assigned to this task',
      });
    }

    // Update task status
    const updateData = { status };
    if (status === 'completed') {
      updateData.completed_at = new Date();
    }

    await task.update(updateData);

    res.json({
      success: true,
      message: `Task marked as ${status}`,
      data: task,
    });
  } catch (error) {
    console.error('Error updating task status:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating task status',
      error: error.message,
    });
  }
});

export default router;
