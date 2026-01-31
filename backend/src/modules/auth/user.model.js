import { DataTypes } from 'sequelize';
import sequelize from '../../config/db.js';

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  phone: {
    type: DataTypes.STRING(15),
    unique: true,
    allowNull: false,
  },
  role: {
    type: DataTypes.ENUM('driver', 'admin'),
    defaultValue: 'driver',
  },
  firebase_uid: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: true,
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'users',
  timestamps: false,
});

export default User;
