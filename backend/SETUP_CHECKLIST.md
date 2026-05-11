# RideChain Backend Setup Checklist

## Phase 1: Environment Setup ✅

### Prerequisites
- [ ] Node.js 16+ installed
- [ ] PostgreSQL 12+ running
- [ ] Redis running (for cache/session management)
- [ ] Firebase Project created (for authentication & push notifications)

### 1.1 Clone & Install Dependencies
```bash
cd backend
npm install
```

### 1.2 Configure Environment Variables
Create `.env` file:
```env
# Database
DB_NAME=ridechain
DB_USER=postgres
DB_PASSWORD=your_secure_password
DB_HOST=localhost
DB_PORT=5432

# Redis
REDIS_URL=redis://localhost:6379

# Firebase Admin SDK
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxx@your-project.iam.gserviceaccount.com

# Server
PORT=3000
NODE_ENV=development
```

### 1.3 Initialize Firebase Admin SDK
1. Go to Firebase Console → Project Settings
2. Service Accounts tab → Generate new private key
3. Copy the JSON and use for FIREBASE_PRIVATE_KEY env vars

### 1.4 Create `.firebaserc` (optional)
```json
{
  "projects": {
    "default": "your-firebase-project-id"
  }
}
```

---

## Phase 2: Database Setup 🗄️

### 2.1 Create Database
```bash
createdb ridechain
```

### 2.2 Run Migrations
```bash
# Using raw SQL
psql -U postgres -d ridechain -f migrations/001_core_engine.sql

# OR Sequelize (if using sequelize-cli)
npx sequelize-cli db:migrate
```

### 2.3 Verify Tables
```bash
psql -U postgres -d ridechain

# Inside psql:
\dt  # List all tables
\d drivers  # View drivers table structure
SELECT COUNT(*) FROM drivers;
SELECT COUNT(*) FROM users;
```

---

## Phase 3: Start Server 🚀

### 3.1 Development Mode (with auto-reload)
```bash
npm run dev
```

### 3.2 Production Mode
```bash
npm start
```

### 3.3 Health Check
```bash
curl http://localhost:3000/api/health

# Expected response:
{
  "status": "ok",
  "db": "up",
  "redis": "up",
  "timestamp": "..."
}
```

---

## Phase 4: Manual Testing 🧪

### 4.1 Create Test Users
```bash
# Create a test driver user
curl -X POST http://localhost:3000/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+919876543210",
    "role": "driver",
    "firebase_uid": "test_driver_uid_123"
  }'

# Create a test partner
curl -X POST http://localhost:3000/api/v1/partners \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Restaurant",
    "type": "restaurant",
    "contact_name": "Manager",
    "contact_phone": "+919876543211",
    "status": "active"
  }'

# Create test admin
curl -X POST http://localhost:3000/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+919876543212",
    "role": "admin",
    "firebase_uid": "test_admin_uid_456"
  }'
```

### 4.2 Get Firebase ID Token
```bash
# For testing, use Firebase CLI:
firebase auth:import users.json --project your-project

# Or manually from Firebase Console → Authentication
# Sign in a test user and copy the ID token from browser console
```

### 4.3 Test Driver Location Pulse
```bash
# Set driver to online
curl -X PATCH http://localhost:3000/api/v1/drivers/1/online-status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN" \
  -d '{"is_online": true}'

# Send location
curl -X PATCH http://localhost:3000/api/v1/drivers/location \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN" \
  -d '{
    "latitude": 28.6139,
    "longitude": 77.2090
  }'
```

### 4.4 Test Task Creation & Broadcast
```bash
# Create a task (triggers broadcast to nearby drivers)
curl -X POST http://localhost:3000/api/v1/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer PARTNER_FIREBASE_TOKEN" \
  -d '{
    "partner_id": 1,
    "pickup_lat": 28.6139,
    "pickup_lng": 77.2090,
    "description": "Deliver urgent package",
    "estimated_distance_km": 5,
    "estimated_fare": 250
  }'
```

### 4.5 Test Admin Live Map
```bash
curl -X GET http://localhost:3000/api/v1/admin/live-map \
  -H "Authorization: Bearer ADMIN_FIREBASE_TOKEN"
```

---

## Phase 5: Integration Testing 🔗

### 5.1 Driver Journey Test
- [ ] Create driver user
- [ ] Set to online
- [ ] Register FCM token
- [ ] Send location pulse
- [ ] Verify location updated in DB
- [ ] Create task nearby
- [ ] Accept task
- [ ] Verify task status = 'assigned'
- [ ] Update task to 'in_progress'
- [ ] Mark as 'completed'

### 5.2 Race Condition Test
- [ ] Create 2 drivers near same location
- [ ] Create 1 task
- [ ] Both drivers try to accept simultaneously
- [ ] Verify only one succeeds
- [ ] Other gets "Task already taken" error

### 5.3 Admin Dashboard Test
- [ ] Create multiple drivers at different locations
- [ ] Create multiple tasks
- [ ] Access live-map endpoint
- [ ] Verify all drivers appear with correct coordinates
- [ ] Verify all tasks appear with status
- [ ] Verify statistics match actual counts

---

## Phase 6: Load Testing 📊

### 6.1 Location Update Load Test
```bash
# Simulate 100 drivers sending location updates
for i in {1..100}; do
  curl -X PATCH http://localhost:3000/api/v1/drivers/location \
    -H "Authorization: Bearer TOKEN_$i" \
    -d "{\"latitude\": 28.$i, \"longitude\": 77.$i}" &
done
```

### 6.2 Task Broadcast Load Test
```bash
# Create 50 tasks rapidly
for i in {1..50}; do
  curl -X POST http://localhost:3000/api/v1/tasks \
    -H "Authorization: Bearer PARTNER_TOKEN" \
    -d "{\"partner_id\": 1, \"pickup_lat\": 28.$i, \"pickup_lng\": 77.$i}" &
done
```

### 6.3 Monitor Performance
```bash
# Terminal 1: Watch server logs
npm run dev

# Terminal 2: Check database connections
psql -U postgres -d ridechain -c "SELECT count(*) FROM pg_stat_activity;"

# Terminal 3: Check Redis
redis-cli INFO stats
```

---

## Phase 7: Deployment Checklist ☁️

### 7.1 Security Review
- [ ] All passwords and secrets in `.env` (not committed)
- [ ] Firebase credentials secure
- [ ] Database password changed from default
- [ ] API rate limiting configured (for production)
- [ ] CORS configured for specific frontend domains
- [ ] JWT token expiration set appropriately

### 7.2 Performance Optimization
- [ ] Database indexes created (in migration file)
- [ ] Redis enabled for caching
- [ ] FCM notifications working
- [ ] Location queries optimized
- [ ] Connection pooling configured

### 7.3 Monitoring
- [ ] Sentry/DataDog configured (optional)
- [ ] Database backups scheduled
- [ ] Error logging enabled
- [ ] Performance metrics tracking

### 7.4 Docker Setup (Optional)
```bash
# Build Docker image
docker build -t ridechain-backend .

# Run container
docker run -p 3000:3000 \
  -e DB_HOST=host.docker.internal \
  -e REDIS_URL=redis://host.docker.internal:6379 \
  ridechain-backend
```

---

## Troubleshooting 🔧

### Server won't start
```bash
# Check if port 3000 is already in use
lsof -i :3000
# Kill the process: kill -9 <PID>

# Check if database is running
psql -U postgres -c "SELECT version();"
```

### Database connection fails
```bash
# Verify credentials in .env
# Test connection:
psql -U postgres -h localhost -d ridechain

# If permission denied:
sudo -u postgres psql
ALTER USER postgres WITH PASSWORD 'new_password';
```

### FCM notifications not working
```bash
# Verify Firebase credentials
npm test  # (if test suite exists)

# Check if fcm_token is registered for user
psql -U postgres -d ridechain -c "SELECT phone, fcm_token FROM users LIMIT 5;"
```

### Location updates not showing in live-map
```bash
# Check if driver is marked as online
SELECT id, is_online, current_lat, current_lng FROM drivers;

# Update manually if needed
UPDATE drivers SET is_online = true, current_lat = 28.6139, current_lng = 77.2090 WHERE id = 1;
```

---

## Next Steps 🎯

After core engine is working:

1. **Frontend Integration**
   - [ ] Driver app (React Native/Flutter)
   - [ ] Partner dashboard (React)
   - [ ] Admin dashboard (React)

2. **Enhanced Features**
   - [ ] Rating system
   - [ ] Surge pricing
   - [ ] Payment integration
   - [ ] Analytics dashboard

3. **Infrastructure**
   - [ ] Docker & Docker Compose
   - [ ] Kubernetes deployment
   - [ ] CI/CD pipeline (GitHub Actions)
   - [ ] Load balancing

4. **Monitoring**
   - [ ] Error tracking (Sentry)
   - [ ] Performance monitoring (NewRelic)
   - [ ] Database monitoring
   - [ ] Alert system

---

## Quick Commands Reference

```bash
# Start development server
npm run dev

# View logs
tail -f logs/app.log

# Database commands
psql -U postgres -d ridechain
\dt                                    # List tables
SELECT * FROM drivers LIMIT 5;         # View drivers
UPDATE drivers SET is_online = true;   # Update drivers

# Redis commands
redis-cli
KEYS *                                 # View all keys
FLUSHDB                                # Clear database

# Test with curl
curl -i http://localhost:3000/api/health
```

---

**Status**: Ready for Testing
**Last Updated**: May 11, 2026
**Version**: 1.0 (MVP)
