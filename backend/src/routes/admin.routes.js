import express from 'express';
import Driver from '../modules/drivers/driver.model.js';
import User from '../modules/auth/user.model.js';
import Task from '../modules/tasks/task.model.js';
import Partner from '../modules/partners/partner.model.js';
import { verifyToken } from '../middlewares/auth.middleware.js';
import { Op } from 'sequelize';

const router = express.Router();

/**
 * Middleware to verify admin role
 */
const verifyAdmin = async (req, res, next) => {
  try {
    const user = await User.findOne({
      where: { firebase_uid: req.user.uid },
    });

    if (!user || user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required',
      });
    }

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error verifying admin role',
      error: error.message,
    });
  }
};

/**
 * GET /api/v1/admin/live-map
 * Get all online drivers and active tasks for real-time visualization
 */
router.get('/live-map', verifyToken, verifyAdmin, async (req, res) => {
  try {
    // Get all online drivers with their current location
    const onlineDrivers = await Driver.findAll({
      where: {
        is_online: true,
        current_lat: { [Op.ne]: null },
        current_lng: { [Op.ne]: null },
      },
      include: {
        model: User,
        attributes: ['phone', 'firebase_uid'],
      },
      attributes: ['id', 'user_id', 'current_lat', 'current_lng', 'vehicle_type', 'last_active'],
    });

    // Get all active tasks (pending or assigned)
    const activeTasks = await Task.findAll({
      where: {
        status: { [Op.in]: ['pending', 'assigned', 'in_progress'] },
      },
      include: [
        {
          model: Partner,
          attributes: ['id', 'name', 'type'],
        },
        {
          model: Driver,
          attributes: ['id', 'vehicle_type'],
        },
      ],
      attributes: ['id', 'partner_id', 'driver_id', 'status', 'pickup_lat', 'pickup_lng', 'dropoff_lat', 'dropoff_lng', 'created_at'],
    });

    // Get statistics
    const totalOnlineDrivers = onlineDrivers.length;
    const totalActiveTasks = activeTasks.length;
    const assignedTasks = activeTasks.filter((t) => t.status === 'assigned' || t.status === 'in_progress').length;
    const pendingTasks = activeTasks.filter((t) => t.status === 'pending').length;

    res.json({
      success: true,
      timestamp: new Date(),
      statistics: {
        total_online_drivers: totalOnlineDrivers,
        total_active_tasks: totalActiveTasks,
        pending_tasks: pendingTasks,
        assigned_tasks: assignedTasks,
      },
      data: {
        drivers: onlineDrivers.map((driver) => ({
          id: driver.id,
          latitude: parseFloat(driver.current_lat),
          longitude: parseFloat(driver.current_lng),
          vehicle_type: driver.vehicle_type,
          last_active: driver.last_active,
          driver_phone: driver.User?.phone,
        })),
        tasks: activeTasks.map((task) => ({
          id: task.id,
          status: task.status,
          pickup: {
            latitude: parseFloat(task.pickup_lat),
            longitude: parseFloat(task.pickup_lng),
          },
          dropoff: task.dropoff_lat
            ? {
                latitude: parseFloat(task.dropoff_lat),
                longitude: parseFloat(task.dropoff_lng),
              }
            : null,
          partner_name: task.Partner?.name,
          driver_id: task.driver_id,
          created_at: task.created_at,
        })),
      },
    });
  } catch (error) {
    console.error('Error fetching live map data:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching live map data',
      error: error.message,
    });
  }
});

/**
 * GET /api/v1/admin/driver-analytics
 * Get detailed analytics about driver activity
 */
router.get('/driver-analytics', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const drivers = await Driver.findAll({
      include: {
        model: User,
        attributes: ['phone'],
      },
      attributes: ['id', 'vehicle_type', 'is_online', 'total_earnings', 'last_active', 'created_at'],
    });

    const analytics = {
      total_drivers: drivers.length,
      online_drivers: drivers.filter((d) => d.is_online).length,
      offline_drivers: drivers.filter((d) => !d.is_online).length,
      total_earnings: drivers.reduce((sum, d) => sum + parseFloat(d.total_earnings || 0), 0),
      drivers: drivers.map((d) => ({
        id: d.id,
        phone: d.User?.phone,
        vehicle_type: d.vehicle_type,
        is_online: d.is_online,
        total_earnings: parseFloat(d.total_earnings),
        last_active: d.last_active,
        created_at: d.created_at,
      })),
    };

    res.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    console.error('Error fetching driver analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching driver analytics',
      error: error.message,
    });
  }
});

/**
 * GET /api/v1/admin/task-analytics
 * Get detailed analytics about task activity
 */
router.get('/task-analytics', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const tasks = await Task.findAll({
      include: [
        {
          model: Partner,
          attributes: ['name', 'type'],
        },
      ],
      attributes: ['id', 'status', 'created_at', 'assigned_at', 'completed_at'],
    });

    const analytics = {
      total_tasks: tasks.length,
      pending_tasks: tasks.filter((t) => t.status === 'pending').length,
      assigned_tasks: tasks.filter((t) => t.status === 'assigned').length,
      in_progress_tasks: tasks.filter((t) => t.status === 'in_progress').length,
      completed_tasks: tasks.filter((t) => t.status === 'completed').length,
      cancelled_tasks: tasks.filter((t) => t.status === 'cancelled').length,
      tasks: tasks.map((t) => ({
        id: t.id,
        status: t.status,
        partner: t.Partner?.name,
        partner_type: t.Partner?.type,
        created_at: t.created_at,
        assigned_at: t.assigned_at,
        completed_at: t.completed_at,
        time_to_assign_ms: t.assigned_at
          ? new Date(t.assigned_at) - new Date(t.created_at)
          : null,
        time_to_complete_ms: t.completed_at
          ? new Date(t.completed_at) - new Date(t.created_at)
          : null,
      })),
    };

    res.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    console.error('Error fetching task analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching task analytics',
      error: error.message,
    });
  }
});

export default router;
