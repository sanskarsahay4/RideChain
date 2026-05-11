import { DataTypes } from 'sequelize';
import sequelize from '../../config/db.js';
import Partner from '../partners/partner.model.js';
import Driver from '../drivers/driver.model.js';

const Task = sequelize.define('Task', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  partner_id: {
    type: DataTypes.INTEGER,
    references: {
      model: Partner,
      key: 'id',
    },
    allowNull: false,
  },
  driver_id: {
    type: DataTypes.INTEGER,
    references: {
      model: Driver,
      key: 'id',
    },
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('pending', 'assigned', 'in_progress', 'completed', 'cancelled'),
    defaultValue: 'pending',
  },
  pickup_lat: {
    type: DataTypes.DECIMAL(10, 8),
    allowNull: false,
  },
  pickup_lng: {
    type: DataTypes.DECIMAL(11, 8),
    allowNull: false,
  },
  dropoff_lat: {
    type: DataTypes.DECIMAL(10, 8),
    allowNull: true,
  },
  dropoff_lng: {
    type: DataTypes.DECIMAL(11, 8),
    allowNull: true,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  estimated_distance_km: {
    type: DataTypes.DECIMAL(8, 2),
    allowNull: true,
  },
  estimated_fare: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  assigned_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  completed_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'tasks',
  timestamps: false,
});

export default Task;
