const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();

const app = express();

// Middlewares
app.use(cors());

// Text body parser specifically for ZKTeco ADMS cloud pushes
app.use('/iclock', express.text({ type: '*/*', limit: '10mb' }));
app.use('/cdata', express.text({ type: '*/*', limit: '10mb' }));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// ZKTeco Controller for ADMS Cloud Push
const zktecoController = require('./controllers/zktecoController');
const zktecoService = require('./services/zktecoService');
const Setting = require('./models/Setting');

// ADMS Cloud Server Push Endpoints (ZKTeco MB360 cloud push)
app.get('/iclock/cdata', zktecoController.handleAdmsGet);
app.post('/iclock/cdata', zktecoController.handleAdmsPost);
app.get('/iclock/getrequest', zktecoController.handleAdmsGetRequest);
app.post('/iclock/devicecmd', zktecoController.handleAdmsDeviceCmd);

app.get('/cdata', zktecoController.handleAdmsGet);
app.post('/cdata', zktecoController.handleAdmsPost);

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/employees', require('./routes/employeeRoutes'));
app.use('/api/rfid', require('./routes/rfidRoutes'));
app.use('/api/zkteco', require('./routes/zktecoRoutes'));
app.use('/api/attendance', require('./routes/attendanceRoutes'));
app.use('/api/attendance-requests', require('./routes/attendanceRequestRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));
app.use('/api/settings', require('./routes/settingsRoutes'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    company: 'Arshi Enterprises',
    service: 'Smart RFID & ZKTeco MB360 Attendance System',
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
  });
});

// Central Error Handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Database Connection & Server Initialization
const PORT = process.env.PORT || 5000;
const ATLAS_URI = 'mongodb+srv://arshi133itserver_db_user:msCQomFWXkhiboZc@cluster0.epwaz1l.mongodb.net/arshi_attendance?retryWrites=true&w=majority';
const MONGODB_URI = process.env.MONGODB_URI || ATLAS_URI;

let isConnected = false;
const connectDB = async () => {
  if (isConnected && mongoose.connection.readyState === 1) return;
  try {
    await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
    isConnected = true;
    console.log('✅ Connected to MongoDB Atlas / Database successfully.');
  } catch (err) {
    console.error('❌ MongoDB Connection Error:', err.message);
  }
};

// Immediate connect
connectDB();

// Serverless DB connection middleware
app.use(async (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    try {
      await connectDB();
    } catch (_) {}
  }
  next();
});

// Start listening on port (supports local and Vercel Services)
app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 Arshi Enterprises Attendance Server running on port ${PORT}`);
  console.log(`📡 RFID Hardware API: http://localhost:${PORT}/api/rfid/scan`);
  console.log(`📠 ZKTeco MB360 ADMS URL: http://localhost:${PORT}/iclock/cdata`);
  console.log(`🌐 Web API Base URL: http://localhost:${PORT}/api`);
  console.log(`=======================================================`);

  // Background Auto-sync scheduler for local ZKTeco terminal (runs if enabled in settings)
  if (!process.env.VERCEL) {
    setInterval(async () => {
      try {
        const setting = await Setting.findOne();
        if (setting && setting.zktecoAutoSync && setting.zktecoIp) {
          console.log(`[ZKTeco Auto-Sync] Syncing logs from ${setting.zktecoIp}:${setting.zktecoPort || 4370}...`);
          const syncRes = await zktecoService.syncAttendanceLogs(setting.zktecoIp, setting.zktecoPort || 4370);
          if (syncRes.success) {
            console.log(`[ZKTeco Auto-Sync] Done. Synced: ${syncRes.syncedCount}, Total: ${syncRes.totalDeviceRecords}`);
          }
        }
      } catch (err) {
        // Silent ignore background sync error
      }
    }, 5 * 60 * 1000); // Check every 5 minutes
  }
});

module.exports = app;
