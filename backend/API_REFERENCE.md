# RideChain API Quick Reference

## Base URL
```
http://localhost:3000/api/v1
```

## Authentication
All protected endpoints require:
```
Authorization: Bearer {Firebase_ID_Token}
```

## Driver Endpoints

### 1. Get All Drivers
```bash
GET /drivers
```

### 2. Get Specific Driver
```bash
GET /drivers/:id
```

### 3. Update Driver Location (Pulse API) ⭐
```bash
PATCH /drivers/location
Authorization: Bearer {token}

{
  "latitude": 28.6139,
  "longitude": 77.2090
}
```
**Called every 30-60 seconds by driver app**

### 4. Toggle Online Status
```bash
PATCH /drivers/:id/online-status
Authorization: Bearer {token}

{
  "is_online": true
}
```

---

## Task Endpoints

### 1. Get All Tasks
```bash
GET /tasks
GET /tasks?status=pending
GET /tasks?status=assigned
GET /tasks?status=in_progress
GET /tasks?status=completed
```

### 2. Get Specific Task
```bash
GET /tasks/:id
```

### 3. Create Task (Partner) ⭐
```bash
POST /tasks
Authorization: Bearer {partner_token}

{
  "partner_id": 1,
  "pickup_lat": 28.6139,
  "pickup_lng": 77.2090,
  "dropoff_lat": 28.5244,
  "dropoff_lng": 77.1855,
  "description": "Deliver urgent package",
  "estimated_distance_km": 8.5,
  "estimated_fare": 250
}
```
**Response includes broadcast status**

### 4. Accept Task (Driver) ⭐
```bash
POST /tasks/:id/accept
Authorization: Bearer {driver_token}
```

### 5. Update Task Status (Driver)
```bash
PATCH /tasks/:id/status
Authorization: Bearer {driver_token}

{
  "status": "in_progress"
}
```
**Valid statuses**: `in_progress`, `completed`, `cancelled`

---

## User Endpoints

### 1. Get All Users
```bash
GET /users
```

### 2. Create User
```bash
POST /users

{
  "phone": "+919876543210",
  "role": "driver",
  "firebase_uid": "abcd1234..."
}
```

### 3. Register FCM Token ⭐
```bash
POST /users/register-fcm-token
Authorization: Bearer {token}

{
  "fcm_token": "eJxsSvOKsvD_aL0k..."
}
```
**Called once on app startup**

---

## Admin Endpoints (Requires Admin Role)

### 1. Live Map Data ⭐
```bash
GET /admin/live-map
Authorization: Bearer {admin_token}
```
**Response**:
```json
{
  "success": true,
  "timestamp": "2026-05-11T10:30:00Z",
  "statistics": {
    "total_online_drivers": 42,
    "total_active_tasks": 28,
    "pending_tasks": 15,
    "assigned_tasks": 13
  },
  "data": {
    "drivers": [
      {
        "id": 1,
        "latitude": 28.6139,
        "longitude": 77.2090,
        "vehicle_type": "bike",
        "last_active": "2026-05-11T10:29:45Z",
        "driver_phone": "+919876543210"
      }
    ],
    "tasks": [
      {
        "id": 101,
        "status": "pending",
        "pickup": {
          "latitude": 28.6139,
          "longitude": 77.2090
        },
        "dropoff": {
          "latitude": 28.5244,
          "longitude": 77.1855
        },
        "partner_name": "Swiggy",
        "driver_id": null,
        "created_at": "2026-05-11T10:25:00Z"
      }
    ]
  }
}
```

### 2. Driver Analytics
```bash
GET /admin/driver-analytics
Authorization: Bearer {admin_token}
```

### 3. Task Analytics
```bash
GET /admin/task-analytics
Authorization: Bearer {admin_token}
```

---

## Health Check
```bash
GET /health
```
**Response**:
```json
{
  "status": "ok",
  "db": "up",
  "redis": "up",
  "timestamp": "2026-05-11T10:30:00Z"
}
```

---

## Common Workflows

### 🔄 Driver Comes Online
```bash
# 1. Update online status
PATCH /drivers/:driver_id/online-status
{ "is_online": true }

# 2. Register device token
POST /users/register-fcm-token
{ "fcm_token": "..." }

# 3. Start sending location pulses every 30s
PATCH /drivers/location (every 30-60 seconds)
{ "latitude": ..., "longitude": ... }
```

### 📍 Partner Creates Task
```bash
POST /tasks
{
  "partner_id": 1,
  "pickup_lat": 28.6139,
  "pickup_lng": 77.2090,
  "description": "Deliver food order",
  "estimated_fare": 150
}

# System automatically:
# 1. Finds nearby drivers
# 2. Broadcasts FCM notifications
# 3. Returns notification stats
```

### ✅ Driver Accepts Task
```bash
# Driver receives notification → Opens app → Taps "Accept"

POST /tasks/:task_id/accept

# Response: Task status changes to "assigned"
# Note: If another driver already accepted, gets error
```

### 🎯 Complete Task
```bash
# Driver reaches location and completes task

# Step 1: Mark as in progress
PATCH /tasks/:task_id/status
{ "status": "in_progress" }

# Step 2: Mark as completed
PATCH /tasks/:task_id/status
{ "status": "completed" }

# System records: completed_at timestamp
```

### 📊 Admin Monitors
```bash
# Real-time dashboard refresh
GET /admin/live-map

# Shows:
# - All 42 online drivers with their locations
# - All 28 active tasks with pickup/dropoff
# - 15 waiting for driver, 13 being delivered
```

---

## Error Responses

### 400 - Bad Request
```json
{
  "success": false,
  "message": "Missing latitude or longitude"
}
```

### 401 - Unauthorized
```json
{
  "success": false,
  "message": "Unauthorized: Invalid token"
}
```

### 403 - Forbidden
```json
{
  "success": false,
  "message": "Admin access required"
}
```

### 404 - Not Found
```json
{
  "success": false,
  "message": "Driver not found"
}
```

### 500 - Server Error
```json
{
  "success": false,
  "message": "Error updating location",
  "error": "..."
}
```

---

## Testing with cURL

### Create a test driver
```bash
curl -X POST http://localhost:3000/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+919876543210",
    "role": "driver",
    "firebase_uid": "test_uid_123"
  }'
```

### Update location (needs real JWT token)
```bash
curl -X PATCH http://localhost:3000/api/v1/drivers/location \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN" \
  -d '{
    "latitude": 28.6139,
    "longitude": 77.2090
  }'
```

### Get live map (needs admin token)
```bash
curl -X GET http://localhost:3000/api/v1/admin/live-map \
  -H "Authorization: Bearer ADMIN_FIREBASE_TOKEN"
```

---

## Frontend Integration

### React/Flutter Driver App
```javascript
// Every 30 seconds
setInterval(() => {
  axios.patch('/api/v1/drivers/location', {
    latitude: currentLocation.lat,
    longitude: currentLocation.lng
  }, {
    headers: {
      'Authorization': `Bearer ${firebaseToken}`
    }
  });
}, 30000);

// Listen for task notifications via FCM
messaging.onMessage((message) => {
  if (message.data.task_id) {
    // New task available!
    openTaskDetails(message.data.task_id);
  }
});

// Accept task
axios.post(`/api/v1/tasks/${taskId}/accept`, {}, {
  headers: { 'Authorization': `Bearer ${firebaseToken}` }
});
```

### React Admin Dashboard
```javascript
// Refresh every 5 seconds
useEffect(() => {
  const interval = setInterval(() => {
    axios.get('/api/v1/admin/live-map', {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    }).then(res => {
      // Plot drivers on map
      plotDrivers(res.data.data.drivers);
      // Plot tasks on map
      plotTasks(res.data.data.tasks);
      // Update statistics
      updateStats(res.data.statistics);
    });
  }, 5000);
  
  return () => clearInterval(interval);
}, []);
```

---

**Last Updated**: May 11, 2026
**Version**: 1.0 (MVP)
