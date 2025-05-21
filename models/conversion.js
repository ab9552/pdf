const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Conversion = sequelize.define('Conversion', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  operationType: {
    type: DataTypes.ENUM(
      'merge', 
      'split', 
      'compress', 
      'toWord', 
      'toImage', 
      'watermark', 
      'rotate', 
      'deletePage'
    ),
    allowNull: false
  },
  originalFilename: {
    type: DataTypes.STRING,
    allowNull: false
  },
  outputFilename: {
    type: DataTypes.STRING,
    allowNull: false
  },
  fileSize: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  processingTime: {
    type: DataTypes.INTEGER
  },
  status: {
    type: DataTypes.ENUM('success', 'failed'),
    allowNull: false
  }
});

module.exports = Conversion;