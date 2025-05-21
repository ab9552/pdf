const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class UserActivityLog extends Model {
    static associate(models) {
      UserActivityLog.belongsTo(models.User, { foreignKey: 'user_id' });
    }
  }

  UserActivityLog.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    activity_type: {
      type: DataTypes.ENUM('login', 'logout', 'conversion', 'subscription_change', 'payment'),
      allowNull: false
    },
    ip_address: {
      type: DataTypes.STRING(45)
    },
    user_agent: {
      type: DataTypes.TEXT
    },
    details: {
      type: DataTypes.JSON
    }
  }, {
    sequelize,
    modelName: 'UserActivityLog',
    tableName: 'user_activity_logs',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
    indexes: [
      {
        fields: ['user_id', 'created_at']
      }
    ]
  });

  return UserActivityLog;
}; 