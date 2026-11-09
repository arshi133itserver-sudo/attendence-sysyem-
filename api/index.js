const mongoose = require('mongoose');
const app = require('../server/server');

let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb && mongoose.connection.readyState === 1) {
    return cachedDb;
  }

  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/arshi_attendance';
  try {
    cachedDb = await mongoose.connect(uri, {
      bufferCommands: false,
    });
    return cachedDb;
  } catch (err) {
    console.error('Vercel Serverless MongoDB Connection Error:', err);
    throw err;
  }
}

module.exports = async (req, res) => {
  try {
    await connectToDatabase();
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Database connection failed. Please ensure MONGODB_URI environment variable is configured in Vercel.',
      error: err.message
    });
  }

  return app(req, res);
};
