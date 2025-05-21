const sequelize = require('./database');
const User = require('../models/User');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const ConversionHistory = require('../models/ConversionHistory');
const FileMetadata = require('../models/FileMetadata');
const UserActivityLog = require('../models/UserActivityLog');

async function testDatabase() {
  try {
    // Test database connection
    await sequelize.authenticate();
    console.log('Database connection successful!');

    // Test model synchronization
    await sequelize.sync({ alter: true });
    console.log('Models synchronized successfully!');

    // Test creating a subscription plan
    const plan = await SubscriptionPlan.create({
      name: 'Test Plan',
      description: 'Test subscription plan',
      price: 9.99,
      billing_cycle: 'monthly',
      features: JSON.stringify(['feature1', 'feature2']),
      max_file_size: 10485760,
      max_files_per_month: 100,
      storage_limit: 1073741824
    });
    console.log('Test subscription plan created:', plan.toJSON());

    // Test creating a user
    const user = await User.create({
      email: 'test@example.com',
      password_hash: 'hashed_password',
      first_name: 'Test',
      last_name: 'User',
      subscription_status: 'active',
      storage_used: 0,
      max_storage: 1073741824,
      api_key: 'test_api_key'
    });
    console.log('Test user created:', user.toJSON());

    // Test creating conversion history
    const conversion = await ConversionHistory.create({
      user_id: user.id,
      original_filename: 'test.pdf',
      original_file_size: 1048576,
      converted_filename: 'test_converted.pdf',
      converted_file_size: 524288,
      conversion_type: 'compress',
      status: 'completed',
      processing_time: 1000
    });
    console.log('Test conversion history created:', conversion.toJSON());

    // Test creating file metadata
    const metadata = await FileMetadata.create({
      conversion_id: conversion.id,
      file_path: '/path/to/file.pdf',
      file_type: 'pdf',
      page_count: 10,
      dimensions: 'A4',
      is_encrypted: false,
      has_watermark: false,
      ocr_processed: false
    });
    console.log('Test file metadata created:', metadata.toJSON());

    // Test creating user activity log
    const activity = await UserActivityLog.create({
      user_id: user.id,
      activity_type: 'login',
      ip_address: '127.0.0.1',
      user_agent: 'Mozilla/5.0',
      details: JSON.stringify({ browser: 'Chrome', os: 'Windows' })
    });
    console.log('Test user activity log created:', activity.toJSON());

    console.log('All tests completed successfully!');
  } catch (error) {
    console.error('Error testing database:', error);
  } finally {
    await sequelize.close();
  }
}

// Run the tests
testDatabase(); 