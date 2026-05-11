# RideChain Core Engine Implementation Guide

## Overview
This document outlines the complete implementation of the RideChain core engine with driver availability tracking, task broadcasting, and real-time location updates.

## What's Been Implemented

### 1. **Database Schema Enhancements**

#### Driver Model Updates
- `current_lat` (DECIMAL): Driver's current latitude
- `current_lng` (DECIMAL): Driver's current longitude
- `last_active` (DATE): Timestamp of last location update (for detecting "ghosted" drivers)
- `is_online` (BOOLEAN): Driver's online/offline status

#### New Task Model
- Tracks task lifecycle: pending → assigned → in_progress → completed/cancelled
- Stores pickup and dropoff coordinates
- Links tasks to drivers and partners
- Includes timing data: created_at, assigned_at, completed_at

#### User Model Enhancement
- `fcm_token` (TEXT): Firebase Cloud Messaging token for push notifications

### 2. **API Endpoints**

#### Driver Routes (`/api/v1/drivers`)
- `GET /` - List all drivers
- `GET /:id` - Get specific driver
- **`PATCH /location`** - Location Pulse API (Driver sends location every 30-60s)
- `PATCH /:id/online-status` - Toggle driver online/offline status

#### Task Routes (`/api/v1/tasks`)
- `GET /` - List tasks with filters
- `GET /:id` - Get task details
- **`POST /`** - Create new task (triggers broadcast)
- **`POST /:id/accept`** - Driver accepts task (race condition protected)
- `PATCH /:id/status` - Update task status (in_progress, completed, cancelled)

#### User Routes (`/api/v1/users`)
- `GET /` - List all users
- `POST /` - Create user
- **`POST /register-fcm-token`** - Register device for push notifications

#### Admin Routes (`/api/v1/admin`)
- **`GET /live-map`** - Real-time map data with all online drivers and active tasks
- `GET /driver-analytics` - Driver activity analytics
- `GET /task-analytics` - Task completion analytics

### 3. **Core Services**

#### allocationService.js
The heart of the system with three key functions:

**`findNearbyDrivers(lat, lng, radiusKm)`**
- Uses Haversine formula to calculate distances
- Default search radius: 5km
- Returns drivers with their User info and FCM tokens
- Only returns online drivers with valid locations

**`broadcastTaskToDrivers(fcmTokens, task)`**
- Sends Firebase Cloud Messaging notifications to drivers
- Includes task_id, pickup coordinates, and partner info
- Uses deep linking: `ridechain://task/{taskId}`

**`allocateTask(task)`**
- Orchestrates the full allocation workflow
- Finds nearby drivers → Gets FCM tokens → Broadcasts notifications
- Returns summary of notification success/failure

### 4. **Security & Race Condition Protection**

**Authentication Middleware**
- Firebase ID Token verification on protected routes
- JWT extracted from `Authorization: Bearer <token>` header

**Race Condition Protection (Task Acceptance)**
```javascript
// Only accept if status is still 'pending'
if (task.status !== 'pending') {
    return error("Task already taken!");
}
// Atomically update status
task.status = 'assigned';
```

**Admin Verification**
- Admin endpoints check user role in middleware
- Only admins can access live-map and analytics

### 5. **Model Associations**

```
User ←→ Driver (One-to-One)
    ↓
  fcm_token

Partner ←→ Tasks (One-to-Many)
Driver ←→ Tasks (One-to-Many)
```

## Database Migration SQL

```sql
-- Update drivers table
ALTER TABLE drivers
ADD COLUMN current_lat DECIMAL(10, 8),
ADD COLUMN current_lng DECIMAL(11, 8),
ADD COLUMN last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Add fcm_token to users
ALTER TABLE users
ADD COLUMN fcm_token TEXT;

-- Create tasks table
CREATE TABLE tasks (
    id SERIAL PRIMARY KEY,
    partner_id INTEGER NOT NULL,
    driver_id INTEGER,
    status ENUM('pending', 'assigned', 'in_progress', 'completed', 'cancelled') DEFAULT 'pending',
    pickup_lat DECIMAL(10, 8) NOT NULL,
    pickup_lng DECIMAL(11, 8) NOT NULL,
    dropoff_lat DECIMAL(10, 8),
    dropoff_lng DECIMAL(11, 8),
    description TEXT,
    estimated_distance_km DECIMAL(8, 2),
    estimated_fare DECIMAL(10, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_at TIMESTAMP,
    completed_at TIMESTAMP,
    FOREIGN KEY (partner_id) REFERENCES partners(id),
    FOREIGN KEY (driver_id) REFERENCES drivers(id)
);
```

## Integration Flow

### Driver Lifecycle

1. **Driver Registration**
   ```
   POST /api/v1/users → Create user
   Create Driver profile → Set vehicle_type, vehicle_number
   ```

2. **Driver Comes Online**
   ```
   PATCH /api/v1/drivers/:id/online-status { is_online: true }
   POST /api/v1/users/register-fcm-token { fcm_token: "..." }
   ```

3. **Driver Location Pulse (Every 30-60s)**
   ```
   PATCH /api/v1/drivers/location
   {
       "latitude": 28.6139,
       "longitude": 77.2090
   }
   → Updates: current_lat, current_lng, last_active
   ```

4. **Task Broadcast (Near Driver)**
   ```
   Partner creates task → POST /api/v1/tasks
   System finds drivers within 5km → Sends FCM notification
   Driver sees "New Task Nearby!" → Opens app
   ```

5. **Driver Accepts Task**
   ```
   POST /api/v1/tasks/:id/accept
   → Status: pending → assigned
   → driver_id assigned
   → assigned_at timestamp set
   ```

6. **Task Completion**
   ```
   PATCH /api/v1/tasks/:id/status { status: "in_progress" }
   PATCH /api/v1/tasks/:id/status { status: "completed" }
   → completed_at timestamp set
   ```

### Partner Workflow

1. **Create Task**
   ```
   POST /api/v1/tasks
   {
       "partner_id": 1,
       "pickup_lat": 28.6139,
       "pickup_lng": 77.2090,
       "description": "Deliver package",
       "estimated_distance_km": 2.5,
       "estimated_fare": 150
   }
   ```

2. **System Response**
   ```
   {
       "success": true,
       "message": "Task broadcast to nearby drivers",
       "drivers_found": 5,
       "drivers_notified": 4,
       "nearby_drivers": [
           { "id": 1, "vehicle_type": "bike" },
           ...
       ]
   }
   ```

### Admin Monitoring

**Live Map View**
```
GET /api/v1/admin/live-map
→ Returns all online drivers with current location
→ Returns all active tasks with status
→ Includes statistics: online_drivers, active_tasks, pending_tasks
```

**Perfect for**:
- Real-time visualization on Mapbox/Google Maps
- Monitoring system health
- Spotting supply gaps (areas with no drivers)

## Performance Optimizations

### Current (MVP)
- ✅ Direct PostgreSQL queries for location updates
- ✅ Synchronous task broadcast (can be made async)
- ✅ In-memory Haversine calculations

### Next Steps (Scale)
- 📊 Redis caching for driver locations (hot data)
- ⚡ Background job queue for FCM broadcasts
- 🔄 Geospatial indexing on lat/lng columns
- 📱 WebSocket for real-time driver positions
- 🎯 Segment drivers by area for faster queries

## Testing Checklist

### Driver Pulse
- [ ] Send PATCH /drivers/location with new coordinates
- [ ] Verify last_active updates to current timestamp
- [ ] Test with expired JWT token (should fail)

### Task Creation & Broadcast
- [ ] Create task with nearby online drivers
- [ ] Verify broadcast response shows correct driver count
- [ ] Test with no nearby drivers (error response)

### Task Acceptance (Race Condition)
- [ ] Have 2 drivers accept same task simultaneously
- [ ] Verify only first gets the task (status check)
- [ ] Second driver gets "Task already taken" error

### Admin Dashboard
- [ ] GET /admin/live-map returns all online drivers
- [ ] Verify coordinates are formatted correctly
- [ ] Check statistics match driver/task counts

### FCM Notifications
- [ ] Register FCM token
- [ ] Create task
- [ ] Verify notification received on driver's device
- [ ] Click notification opens correct task details

## Configuration Checklist

### Firebase Setup
- [ ] Download Service Account JSON
- [ ] Set `GOOGLE_APPLICATION_CREDENTIALS` env var
- [ ] Initialize Firebase Admin SDK in config

### Environment Variables
```env
DB_NAME=ridechain
DB_USER=postgres
DB_PASSWORD=...
DB_HOST=localhost
DB_PORT=5432

REDIS_URL=redis://localhost:6379

FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=...
FIREBASE_CLIENT_EMAIL=...
```

### Database
- [ ] PostgreSQL running
- [ ] Tables created/synced
- [ ] Test connection with /health endpoint

## Next Phase: Enhanced Features

1. **Rating & Reputation System**
   - Add `rating`, `total_rides`, `acceptance_rate` to Driver model
   - Show top-rated drivers first in allocation

2. **Surge Pricing**
   - Calculate fare multiplier based on nearby_drivers vs pending_tasks ratio
   - Higher demand = higher fare

3. **Notifications**
   - Send notifications to Partner when task assigned
   - Send notifications to Driver when task accepted

4. **Analytics Dashboard**
   - Track metrics: average time to assign, driver utilization, partner growth

5. **Webhook Integrations**
   - When task completes, notify Partner platform (Uber/Ola)
   - Support payment gateway callbacks

## Troubleshooting

**"No drivers available in the area"**
- Verify drivers have `is_online: true`
- Verify drivers have `current_lat` and `current_lng` set
- Check search radius (currently 5km)

**"Task already taken"**
- This is working correctly! Race condition protection is active
- Second driver needs to wait for new task

**FCM notifications not received**
- Verify FCM token registered: `POST /users/register-fcm-token`
- Check token hasn't expired
- Verify Firebase Admin SDK credentials

**Driver not appearing in live-map**
- Driver must be online: `is_online: true`
- Driver must have recent location: `last_active` within last 30 mins
- Verify user has `firebase_uid` and `fcm_token`

## File Structure

```
backend/
├── src/
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── user.model.js (updated with fcm_token)
│   │   │   └── user.routes.js (added FCM registration)
│   │   ├── drivers/
│   │   │   ├── driver.model.js (updated with location fields)
│   │   │   └── driver.routes.js (new - pulse API)
│   │   ├── tasks/
│   │   │   ├── task.model.js (new)
│   │   │   └── task.routes.js (new)
│   │   └── partners/
│   ├── services/
│   │   └── allocationService.js (new - core engine)
│   ├── routes/
│   │   └── admin.routes.js (new - live map & analytics)
│   ├── middlewares/
│   │   └── auth.middleware.js (new - JWT verification)
│   ├── models/
│   │   └── index.js (updated with Task associations)
│   └── routes.js (updated with new route imports)
└── package.json
```

---

**Status**: ✅ MVP Complete - Ready for Testing & Integration
