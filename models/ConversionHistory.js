const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ConversionHistory = sequelize.define('ConversionHistory', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  original_filename: {
    type: DataTypes.STRING,
    allowNull: false
  },
  original_file_size: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  converted_filename: {
    type: DataTypes.STRING,
    allowNull: false
  },
  converted_file_size: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  conversion_type: {
    type: DataTypes.STRING,
    allowNull: false
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'completed'
  }
});

module.exports = ConversionHistory; 