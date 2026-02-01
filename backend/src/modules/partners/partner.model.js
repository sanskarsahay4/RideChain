import { DataTypes } from 'sequelize';
import sequelize from '../../config/db.js';

const Partner = sequelize.define('Partner', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },

  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },

  type: {
    type: DataTypes.ENUM(
      'restaurant',
      'pharmacy',
      'grocery',
      'logistics',
      'platform'
    ),
    allowNull: false,
  },

  contact_name: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },

  contact_phone: {
    type: DataTypes.STRING(15),
    allowNull: true,
  },

  status: {
    type: DataTypes.ENUM('active', 'inactive'),
    defaultValue: 'active',
  },

  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },

  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'partners',
  timestamps: false,
});

export default Partner;
