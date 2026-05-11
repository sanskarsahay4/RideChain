import { Op, sequelize } from 'sequelize';
import Driver from '../modules/drivers/driver.model.js';
import Task from '../modules/tasks/task.model.js';
import admin from 'firebase-admin';

const SEARCH_RADIUS_KM = 5;
const EARTH_RADIUS_KM = 6371;

/**
 * Haversine formula to calculate distance between two coordinates
 * Returns distance in kilometers
 */
function calculateDistance(lat1, lng1, lat2, lng2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

/**
 * Find drivers within a certain radius and online
 * @param {number} lat - Latitude of pickup location
 * @param {number} lng - Longitude of pickup location
 * @param {number} radiusKm - Search radius in kilometers
 * @returns {Promise<Array>} Array of nearby drivers with their info and FCM tokens
 */
export const findNearbyDrivers = async (lat, lng, radiusKm = SEARCH_RADIUS_KM) => {
  try {
    // Import User here to avoid circular imports
    import('../modules/auth/user.model.js').then(() => {});
    
    // Query all online drivers with their User info for FCM tokens
    const drivers = await Driver.findAll({
      where: {
        is_online: true,
        current_lat: { [Op.ne]: null },
        current_lng: { [Op.ne]: null },
      },
      include: {
        model: User,
        attributes: ['id', 'phone', 'firebase_uid', 'fcm_token'],
      },
      attributes: ['id', 'user_id', 'current_lat', 'current_lng', 'vehicle_type'],
    });

    // Filter by distance using Haversine formula
    const nearbyDrivers = drivers.filter((driver) => {
      const distance = calculateDistance(
        parseFloat(lat),
        parseFloat(lng),
        parseFloat(driver.current_lat),
        parseFloat(driver.current_lng)
      );
      return distance <= radiusKm;
    });

    return nearbyDrivers;
  } catch (error) {
    console.error('Error finding nearby drivers:', error);
    throw error;
  }
};

/**
 * Send push notification via Firebase Cloud Messaging
 * @param {Array<string>} fcmTokens - Firebase Cloud Messaging tokens
 * @param {object} task - Task object
 * @returns {Promise<void>}
 */
export const broadcastTaskToDrivers = async (fcmTokens, task) => {
  if (!fcmTokens || fcmTokens.length === 0) {
    console.log('No FCM tokens to broadcast to');
    return;
  }

  try {
    const message = {
      notification: {
        title: 'New Task Nearby!',
        body: `A new ride is available within 5km. Tap to view details.`,
      },
      data: {
        task_id: task.id.toString(),
        pickup_lat: task.pickup_lat.toString(),
        pickup_lng: task.pickup_lng.toString(),
        partner_name: task.Partner?.name || 'Partner',
      },
      webpush: {
        fcmOptions: {
          link: `ridechain://task/${task.id}`,
        },
      },
    };

    // Send to multiple devices
    const response = await admin.messaging().sendMulticast({
      tokens: fcmTokens,
      notification: message.notification,
      data: message.data,
    });

    console.log(`Broadcast successful: ${response.successCount} succeeded, ${response.failureCount} failed`);

    return response;
  } catch (error) {
    console.error('Error broadcasting task:', error);
    throw error;
  }
};

/**
 * Orchestrate task allocation to nearby drivers
 * This is the main "brain" function
 * @param {object} task - Task object with pickup location
 * @returns {Promise<object>} Broadcast result
 */
export const allocateTask = async (task) => {
  try {
    // Step 1: Find nearby drivers
    const nearbyDrivers = await findNearbyDrivers(
      task.pickup_lat,
      task.pickup_lng,
      SEARCH_RADIUS_KM
    );

    console.log(`Found ${nearbyDrivers.length} drivers within ${SEARCH_RADIUS_KM}km`);

    if (nearbyDrivers.length === 0) {
      return {
        success: false,
        message: 'No drivers available in the area',
        drivers_notified: 0,
      };
    }

    // Step 2: Get FCM tokens from drivers' User records
    const fcmTokens = nearbyDrivers
      .map((driver) => driver.User?.fcm_token)
      .filter((token) => token !== null && token !== undefined);

    // Step 3: Broadcast notifications
    let broadcastResult = null;
    if (fcmTokens.length > 0) {
      broadcastResult = await broadcastTaskToDrivers(fcmTokens, task);
    }

    return {
      success: true,
      message: 'Task broadcast to nearby drivers',
      drivers_found: nearbyDrivers.length,
      drivers_notified: broadcastResult?.successCount || 0,
      nearby_drivers: nearbyDrivers.map((d) => ({
        id: d.id,
        vehicle_type: d.vehicle_type,
      })),
    };
  } catch (error) {
    console.error('Error allocating task:', error);
    throw error;
  }
};

export default {
  findNearbyDrivers,
  broadcastTaskToDrivers,
  allocateTask,
};
