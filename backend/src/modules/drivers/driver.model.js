import { DataTypes } from 'sequelize';
import sequelize from '../../config/db.js';
import User from '../auth/user.model.js';

const Driver = sequelize.define('Driver', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.INTEGER,
    references: {
      model: User,
      key: 'id',
    },
    allowNull: false,
  },
  vehicle_type: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },
  vehicle_number: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('pending', 'active', 'suspended'),
    defaultValue: 'pending',
  },
  is_online: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  total_earnings: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'drivers',
  timestamps: false,
});

export default Driver;
