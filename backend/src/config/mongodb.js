// File: backend/src/config/mongodb.js
// MongoDB connection configuration

const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/obscura_db';
    
    // Connect to MongoDB (Mongoose 6+ doesn't need deprecated options)
    await mongoose.connect(mongoURI);
    
    console.log('✅ MongoDB connected successfully!');
    console.log(`📦 Database: ${mongoose.connection.name}`);
    
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    console.error('');
    console.error('🔧 Troubleshooting:');
    console.error('   1. Check if MongoDB is running');
    console.error('   2. Verify MONGODB_URI in .env file');
    console.error('   3. Check network/firewall settings');
    console.error('');
  }
};

// Connection event handlers
mongoose.connection.on('connected', () => {
  console.log('🔗 Mongoose connected to MongoDB');
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️  MongoDB disconnected');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB error:', err.message);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('MongoDB connection closed through app termination');
  process.exit(0);
});

module.exports = connectDB;