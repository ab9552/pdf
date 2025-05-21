const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const FileMetadata = sequelize.define('FileMetadata', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  conversion_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  file_path: {
    type: DataTypes.STRING,
    allowNull: false
  },
  file_type: {
    type: DataTypes.STRING,
    allowNull: false
  },
  page_count: {
    type: DataTypes.INTEGER
  },
  dimensions: {
    type: DataTypes.STRING(50)
  },
  is_encrypted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  has_watermark: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  ocr_processed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'file_metadata',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  indexes: [
    {
      fields: ['conversion_id']
    }
  ]
});

module.exports = FileMetadata; 