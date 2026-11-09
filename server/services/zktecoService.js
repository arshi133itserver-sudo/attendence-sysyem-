const ZKLib = require('node-zklib');
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const RawScanLog = require('../models/RawScanLog');
const Setting = require('../models/Setting');
const { recalculateAttendance } = require('./attendanceCalculator');

/**
 * Format Date to YYYY-MM-DD in local time
 */
function getLocalDateString(date = new Date()) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Find matching employee by ZKTeco Device User ID (Enroll ID)
 * Supports matching by:
 * 1. biometricEnrollId (exact match, trimmed)
 * 2. employeeId (e.g. "AE1322", "1322", "ARS-001")
 * 3. rfidCardUid
 */
async function matchEmployee(deviceUserId) {
  if (!deviceUserId) return null;
  const cleanId = String(deviceUserId).trim();

  // 1. Direct biometricEnrollId
  let emp = await Employee.findOne({ biometricEnrollId: cleanId });
  if (emp) return emp;

  // 2. Direct employeeId
  emp = await Employee.findOne({
    employeeId: { $regex: new RegExp(`^${cleanId}$`, 'i') }
  });
  if (emp) return emp;

  // 3. Employee ID with standard prefixes (e.g. ID "1322" matches "AE1322" or "ARS-1322")
  emp = await Employee.findOne({
    $or: [
      { employeeId: { $regex: new RegExp(cleanId + '$', 'i') } },
      { employeeId: `AE${cleanId}` },
      { employeeId: `ARS-${cleanId}` }
    ]
  });
  if (emp) return emp;

  // 4. RFID Card UID match if deviceUserId happens to be card number
  emp = await Employee.findOne({
    rfidCardUid: { $regex: new RegExp(`^${cleanId}$`, 'i') }
  });
  if (emp) return emp;

  return null;
}

/**
 * Process a single attendance punch from ZKTeco (Direct Sync, ADMS push, or USB import)
 */
async function processSinglePunch({
  deviceUserId,
  timestamp,
  deviceId = 'ZKTECO_MB360',
  isOfflineSync = false,
  cardUidOverride = null
}) {
  const punchTime = timestamp ? new Date(timestamp) : new Date();
  if (isNaN(punchTime.getTime())) {
    return { success: false, reason: 'INVALID_TIMESTAMP' };
  }

  const todayStr = getLocalDateString(punchTime);

  // Fetch Settings
  const setting = (await Setting.findOne()) || {
    scanCooldownSeconds: 60,
    officeStartTime: '09:00',
    officeEndTime: '18:00',
    expectedWorkingHours: 8
  };

  const employee = await matchEmployee(deviceUserId);
  const cardUid = cardUidOverride || (employee && employee.rfidCardUid) || `ZK_${String(deviceUserId).toUpperCase()}`;

  if (!employee) {
    // Record Unknown punch log
    await RawScanLog.create({
      cardUid,
      deviceId,
      timestamp: punchTime,
      scanType: 'REJECTED',
      status: 'UNKNOWN_CARD',
      message: `ZKTeco User ID '${deviceUserId}' not registered or linked to any staff.`,
      isOfflineSync,
      rawPayload: { deviceUserId, timestamp }
    });
    return { success: false, reason: 'UNKNOWN_EMPLOYEE', deviceUserId };
  }

  if (employee.status !== 'Active') {
    await RawScanLog.create({
      cardUid,
      employee: employee._id,
      deviceId,
      timestamp: punchTime,
      scanType: 'REJECTED',
      status: 'INACTIVE_CARD',
      message: `ZKTeco punch for inactive staff ${employee.fullName} (${employee.employeeId}).`,
      isOfflineSync,
      rawPayload: { deviceUserId, timestamp }
    });
    return { success: false, reason: 'INACTIVE_STAFF', employee: employee.fullName };
  }

  // Find or create Attendance record for that date
  let attendance = await Attendance.findOne({
    employee: employee._id,
    date: todayStr
  });

  if (!attendance) {
    attendance = new Attendance({
      employee: employee._id,
      date: todayStr,
      sessions: []
    });
  }

  const sessions = attendance.sessions;
  let scanType = 'IN';
  let currentSession = null;

  // Check cooldown debounce against existing sessions or logs
  if (sessions.length > 0) {
    const lastSession = sessions[sessions.length - 1];

    if (lastSession.outTime === null) {
      // Open session: Check if this punch is too close to inTime (e.g. accidental double tap within cooldown)
      const diffSec = (punchTime.getTime() - new Date(lastSession.inTime).getTime()) / 1000;
      const cooldown = setting.scanCooldownSeconds || 60;

      if (diffSec < cooldown && diffSec >= 0) {
        return {
          success: false,
          reason: 'DEBOUNCE_COOLDOWN',
          message: `Punch ignored: within ${cooldown}s cooldown of IN punch.`
        };
      }

      // Valid OUT punch
      scanType = 'OUT';
      currentSession = lastSession;
      currentSession.outTime = punchTime;
      currentSession.outDeviceId = deviceId;
      currentSession.durationMinutes = Math.max(0, Math.round((punchTime - currentSession.inTime) / 60000));
    } else {
      // Session already closed: Check if this new IN punch is too close to previous OUT
      const diffSec = (punchTime.getTime() - new Date(lastSession.outTime).getTime()) / 1000;
      const cooldown = setting.scanCooldownSeconds || 60;

      if (diffSec < cooldown && diffSec >= 0) {
        return {
          success: false,
          reason: 'DEBOUNCE_COOLDOWN',
          message: `Punch ignored: within ${cooldown}s cooldown of previous OUT punch.`
        };
      }

      // New IN session
      scanType = 'IN';
      currentSession = {
        inTime: punchTime,
        outTime: null,
        inDeviceId: deviceId,
        durationMinutes: 0
      };
      sessions.push(currentSession);
    }
  } else {
    // First punch of the day: IN
    scanType = 'IN';
    currentSession = {
      inTime: punchTime,
      outTime: null,
      inDeviceId: deviceId,
      durationMinutes: 0
    };
    sessions.push(currentSession);
  }

  // Recalculate totals & status
  recalculateAttendance(attendance, setting, employee);
  await attendance.save();

  // Save RawScanLog
  await RawScanLog.create({
    cardUid,
    employee: employee._id,
    deviceId,
    timestamp: punchTime,
    scanType,
    status: 'SUCCESS',
    message: `ZKTeco ${scanType} recorded for ${employee.fullName}`,
    isOfflineSync,
    rawPayload: { deviceUserId, timestamp }
  });

  return {
    success: true,
    scanType,
    employee: {
      id: employee.employeeId,
      name: employee.fullName
    },
    punchTime
  };
}

/**
 * Test network connectivity to ZKTeco device
 */
async function testConnection(ip, port = 4370, timeout = 5000) {
  let zkInstance = null;
  try {
    zkInstance = new ZKLib(ip, port, timeout);
    await zkInstance.createSocket();
    
    // Attempt to read basic info or users
    let info = {};
    try {
      info = await zkInstance.getInfo();
    } catch (e) {
      // Fallback
      info = { reachable: true };
    }

    try {
      await zkInstance.disconnect();
    } catch (_) {}

    return {
      success: true,
      message: `Successfully connected to ZKTeco device at ${ip}:${port}`,
      info
    };
  } catch (err) {
    if (zkInstance) {
      try {
        await zkInstance.disconnect();
      } catch (_) {}
    }
    return {
      success: false,
      message: `Could not connect to ZKTeco terminal at ${ip}:${port}: ${err.message || 'Connection timeout/refused'}`,
      error: err.message
    };
  }
}

/**
 * Sync attendance logs directly from ZKTeco MB360 device over socket (Port 4370)
 */
async function syncAttendanceLogs(ip, port = 4370, timeout = 10000) {
  let zkInstance = null;
  try {
    zkInstance = new ZKLib(ip, port, timeout);
    await zkInstance.createSocket();

    const attendanceData = await zkInstance.getAttendances();
    const records = (attendanceData && attendanceData.data) ? attendanceData.data : [];

    try {
      await zkInstance.disconnect();
    } catch (_) {}

    // Sort chronologically
    records.sort((a, b) => new Date(a.recordTime) - new Date(b.recordTime));

    let syncedCount = 0;
    let skippedCount = 0;
    let unknownCount = 0;

    for (const record of records) {
      try {
        const result = await processSinglePunch({
          deviceUserId: record.deviceUserId,
          timestamp: record.recordTime,
          deviceId: `ZKTECO_MB360_${ip}`,
          isOfflineSync: true
        });

        if (result.success) {
          syncedCount++;
        } else if (result.reason === 'UNKNOWN_EMPLOYEE') {
          unknownCount++;
        } else {
          skippedCount++;
        }
      } catch (err) {
        console.error('Error processing ZK record:', err);
        skippedCount++;
      }
    }

    // Update Setting last sync timestamp
    await Setting.findOneAndUpdate(
      {},
      { zktecoLastSyncTime: new Date() },
      { new: true, upsert: true }
    );

    return {
      success: true,
      totalDeviceRecords: records.length,
      syncedCount,
      skippedCount,
      unknownCount,
      lastSyncTime: new Date()
    };
  } catch (err) {
    if (zkInstance) {
      try {
        await zkInstance.disconnect();
      } catch (_) {}
    }
    return {
      success: false,
      message: `Failed to sync from ZKTeco device: ${err.message}`,
      error: err.message
    };
  }
}

/**
 * Parse USB attlog.dat / text file lines
 * Format typically:
 * USER_PIN \t YYYY-MM-DD HH:mm:ss \t STATUS \t VERIFY_TYPE \t ...
 */
async function parseAttlogContent(fileContent) {
  const lines = fileContent.split(/\r?\n/).filter(line => line.trim().length > 0);
  let syncedCount = 0;
  let unknownCount = 0;
  let skippedCount = 0;

  for (const line of lines) {
    // Splits by tab or spaces
    const parts = line.trim().split(/\s+/);
    if (parts.length < 2) continue;

    const deviceUserId = parts[0];
    let timestampStr = parts[1];
    if (parts.length >= 3 && parts[2].includes(':')) {
      timestampStr = `${parts[1]} ${parts[2]}`;
    }

    const timestamp = new Date(timestampStr);
    if (isNaN(timestamp.getTime())) {
      skippedCount++;
      continue;
    }

    try {
      const result = await processSinglePunch({
        deviceUserId,
        timestamp,
        deviceId: 'ZKTECO_USB_IMPORT',
        isOfflineSync: true
      });

      if (result.success) syncedCount++;
      else if (result.reason === 'UNKNOWN_EMPLOYEE') unknownCount++;
      else skippedCount++;
    } catch (e) {
      skippedCount++;
    }
  }

  return {
    success: true,
    totalLines: lines.length,
    syncedCount,
    unknownCount,
    skippedCount
  };
}

module.exports = {
  testConnection,
  syncAttendanceLogs,
  processSinglePunch,
  parseAttlogContent,
  matchEmployee
};
