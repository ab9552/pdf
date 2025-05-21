const { Sequelize } = require('sequelize');
const path = require('path');
const fs = require('fs-extra');

// Ensure the database directory exists
const dbDir = path.join(process.cwd(), 'database');
fs.ensureDirSync(dbDir);

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(dbDir, 'database.sqlite'),
  logging: false // Disable logging for cleaner output
});

async function initDatabase() {
  try {
    // Test the connection
    await sequelize.authenticate();
    console.log('Database connection established successfully.');

    // Import models
    const User = require('../models/User');
    const SubscriptionPlan = require('../models/SubscriptionPlan');
    const UserSubscription = require('../models/UserSubscription');
    const ConversionHistory = require('../models/ConversionHistory');
    const FileMetadata = require('../models/FileMetadata');

    // Define associations
    User.hasMany(UserSubscription);
    UserSubscription.belongsTo(User);
    UserSubscription.belongsTo(SubscriptionPlan);
    User.hasMany(ConversionHistory);
    ConversionHistory.belongsTo(User);
    ConversionHistory.hasOne(FileMetadata);
    FileMetadata.belongsTo(ConversionHistory);

    // Sync all models
    await sequelize.sync({ alter: true });
    console.log('Database models synchronized successfully.');

    // Create default subscription plans if they don't exist
    const plans = [
      { name: 'Free', price: 0, features: 'Basic PDF operations' },
      { name: 'Pro', price: 9.99, features: 'All PDF operations, priority support' },
      { name: 'Enterprise', price: 29.99, features: 'All features, API access, custom solutions' }
    ];

    for (const plan of plans) {
      await SubscriptionPlan.findOrCreate({
        where: { name: plan.name },
        defaults: plan
      });
    }
    console.log('Default subscription plans created/verified.');

    return sequelize;
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error; // Re-throw to handle in app.js
  }
}

module.exports = initDatabase; 