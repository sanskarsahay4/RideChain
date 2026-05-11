-- RideChain Database Migration
-- Run these migrations to set up the complete database schema

-- ============================================
-- 1. Users Table (Already exists - just adding column)
-- ============================================
ALTER TABLE users
ADD COLUMN IF NOT EXISTS fcm_token TEXT;

-- ============================================
-- 2. Drivers Table (Update with geospatial fields)
-- ============================================
ALTER TABLE drivers
ADD COLUMN IF NOT EXISTS current_lat DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS current_lng DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Create indexes for faster geospatial queries
CREATE INDEX IF NOT EXISTS idx_drivers_is_online ON drivers(is_online);
CREATE INDEX IF NOT EXISTS idx_drivers_current_location ON drivers(current_lat, current_lng) 
  WHERE is_online = true AND current_lat IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_drivers_last_active ON drivers(last_active);

-- ============================================
-- 3. Partners Table (Already exists - verify structure)
-- ============================================
-- ALTER TABLE partners ADD COLUMN IF NOT EXISTS location_lat DECIMAL(10, 8);
-- ALTER TABLE partners ADD COLUMN IF NOT EXISTS location_lng DECIMAL(11, 8);

-- ============================================
-- 4. Tasks Table (New - Create from scratch)
-- ============================================
CREATE TABLE IF NOT EXISTS tasks (
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
    FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE,
    FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE SET NULL
);

-- Create indexes for task queries
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_partner_id ON tasks(partner_id);
CREATE INDEX IF NOT EXISTS idx_tasks_driver_id ON tasks(driver_id);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);
CREATE INDEX IF NOT EXISTS idx_tasks_pickup_location ON tasks(pickup_lat, pickup_lng) 
  WHERE status IN ('pending', 'assigned', 'in_progress');

-- ============================================
-- 5. Create a view for live drivers
-- ============================================
CREATE OR REPLACE VIEW live_drivers AS
SELECT 
    d.id,
    d.user_id,
    d.vehicle_type,
    d.current_lat,
    d.current_lng,
    d.last_active,
    u.phone,
    u.firebase_uid,
    u.fcm_token
FROM drivers d
JOIN users u ON d.user_id = u.id
WHERE d.is_online = true
  AND d.current_lat IS NOT NULL
  AND d.current_lng IS NOT NULL;

-- ============================================
-- 6. Create a view for active tasks
-- ============================================
CREATE OR REPLACE VIEW active_tasks AS
SELECT 
    t.id,
    t.partner_id,
    t.driver_id,
    t.status,
    t.pickup_lat,
    t.pickup_lng,
    t.dropoff_lat,
    t.dropoff_lng,
    t.description,
    t.estimated_distance_km,
    t.estimated_fare,
    t.created_at,
    t.assigned_at,
    p.name AS partner_name,
    p.type AS partner_type,
    d.vehicle_type,
    u.phone AS driver_phone
FROM tasks t
JOIN partners p ON t.partner_id = p.id
LEFT JOIN drivers d ON t.driver_id = d.id
LEFT JOIN users u ON d.user_id = u.id
WHERE t.status IN ('pending', 'assigned', 'in_progress');

-- ============================================
-- 7. Create a view for task analytics
-- ============================================
CREATE OR REPLACE VIEW task_analytics AS
SELECT 
    COUNT(*) FILTER (WHERE status = 'pending') AS pending_count,
    COUNT(*) FILTER (WHERE status = 'assigned') AS assigned_count,
    COUNT(*) FILTER (WHERE status = 'in_progress') AS in_progress_count,
    COUNT(*) FILTER (WHERE status = 'completed') AS completed_count,
    COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled_count,
    COUNT(*) AS total_count,
    AVG(EXTRACT(EPOCH FROM (assigned_at - created_at))) / 60 AS avg_time_to_assign_minutes,
    AVG(EXTRACT(EPOCH FROM (completed_at - created_at))) / 60 AS avg_time_to_complete_minutes
FROM tasks;

-- ============================================
-- 8. Seed data (Optional - for testing)
-- ============================================
-- Insert test drivers with locations (Bangalore, India)
-- INSERT INTO drivers (user_id, vehicle_type, vehicle_number, status, is_online, current_lat, current_lng, last_active)
-- VALUES 
--   (1, 'bike', 'KA01AB1234', 'active', true, 12.9716, 77.5946, CURRENT_TIMESTAMP),
--   (2, 'car', 'KA01CD5678', 'active', true, 12.9352, 77.6245, CURRENT_TIMESTAMP),
--   (3, 'bike', 'KA01EF9012', 'active', false, 12.9689, 77.5799, CURRENT_TIMESTAMP);

-- ============================================
-- Verification Queries
-- ============================================
-- Check if tables exist:
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public';

-- Check drivers with locations:
-- SELECT id, vehicle_type, current_lat, current_lng, is_online FROM drivers;

-- Check tasks:
-- SELECT id, partner_id, driver_id, status, created_at FROM tasks;

-- Check live drivers count:
-- SELECT COUNT(*) FROM live_drivers;

-- ============================================
-- Cleanup (if needed)
-- ============================================
-- DROP TABLE IF EXISTS tasks CASCADE;
-- DROP VIEW IF EXISTS live_drivers;
-- DROP VIEW IF EXISTS active_tasks;
-- DROP VIEW IF EXISTS task_analytics;
