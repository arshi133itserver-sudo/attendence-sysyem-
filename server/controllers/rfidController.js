const Employee = require('../models/Employee');
const RfidCard = require('../models/RfidCard');
const Attendance = require('../models/Attendance');
const RawScanLog = require('../models/RawScanLog');
const Setting = require('../models/Setting');
const { recalculateAttendance, formatMinutes } = require('../services/attendanceCalculator');
const {
  getLocalDateString,
  formatDate,
  formatTime,
  getIstHour,
  getTimeOfDayInfo
} = require('../utils/dateUtils');

// Handle RFID Scan (Hardware REST API)
exports.handleScan = async (req, res) => {
  try {
    const { cardUid, deviceId = 'ESP32_GATE_01', timestamp } = req.body;

    if (!cardUid) {
      return res.status(400).json({
        success: false,
        status: 'ERROR',
        message: 'RFID Card UID is required.',
        buzzer: { beeps: 3, durationMs: 400 }
      });
    }

    const cleanUid = cardUid.toUpperCase().trim();
    const scanTime = timestamp ? new Date(timestamp) : new Date();
    const todayStr = getLocalDateString(scanTime);

    // Fetch Attendance Settings
    const setting = (await Setting.findOne()) || {
      scanCooldownSeconds: 60,
      officeStartTime: '09:00',
      officeEndTime: '18:00',
      gracePeriodMinutes: 15,
      expectedWorkingHours: 8,
      halfDayThresholdHours: 4,
      overtimeThresholdHours: 8.5
    };

    // 1. Check for Duplicate / Cooldown Debounce
    const cooldownMs = (setting.scanCooldownSeconds || 60) * 1000;
    const cooldownThreshold = new Date(scanTime.getTime() - cooldownMs);

    const recentScan = await RawScanLog.findOne({
      cardUid: cleanUid,
      timestamp: { $gte: cooldownThreshold },
      status: 'SUCCESS'
    }).sort({ timestamp: -1 });

    if (recentScan) {
      const elapsedSeconds = Math.round((scanTime.getTime() - new Date(recentScan.timestamp).getTime()) / 1000);
      const remainingSeconds = Math.max(1, (setting.scanCooldownSeconds || 60) - elapsedSeconds);

      await RawScanLog.create({
        cardUid: cleanUid,
        employee: recentScan.employee,
        deviceId,
        timestamp: scanTime,
        scanType: 'REJECTED',
        status: 'DUPLICATE_DEBOUNCED',
        message: `Card scanned too quickly. Debounce cooldown active (${remainingSeconds}s remaining).`,
        rawPayload: req.body
      });

      return res.status(200).json({
        success: false,
        status: 'DUPLICATE_DEBOUNCED',
        message: `Please wait ${remainingSeconds}s before scanning again.`,
        buzzer: { beeps: 2, durationMs: 100 }
      });
    }

    // 2. Identify Employee
    const employee = await Employee.findOne({ rfidCardUid: cleanUid });

    if (!employee) {
      await RawScanLog.create({
        cardUid: cleanUid,
        deviceId,
        timestamp: scanTime,
        scanType: 'REJECTED',
        status: 'UNKNOWN_CARD',
        message: `Card UID ${cleanUid} not assigned to any employee.`,
        rawPayload: req.body
      });

      return res.status(404).json({
        success: false,
        status: 'UNKNOWN_CARD',
        cardUid: cleanUid,
        message: 'Unknown RFID Card. Access Denied.',
        buzzer: { beeps: 3, durationMs: 300 }
      });
    }

    if (employee.status !== 'Active') {
      await RawScanLog.create({
        cardUid: cleanUid,
        employee: employee._id,
        deviceId,
        timestamp: scanTime,
        scanType: 'REJECTED',
        status: 'INACTIVE_CARD',
        message: `Employee ${employee.fullName} (${employee.employeeId}) account is inactive.`,
        rawPayload: req.body
      });

      return res.status(403).json({
        success: false,
        status: 'INACTIVE_CARD',
        message: `Employee status is Inactive. Please contact HR.`,
        employee: { id: employee.employeeId, name: employee.fullName },
        buzzer: { beeps: 3, durationMs: 300 }
      });
    }

    // 3. Process Attendance Record
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

    // Check if there is an open session waiting for an OUT scan
    if (sessions.length > 0 && sessions[sessions.length - 1].outTime === null) {
      // OUT scan
      scanType = 'OUT';
      currentSession = sessions[sessions.length - 1];
      currentSession.outTime = scanTime;
      currentSession.outDeviceId = deviceId;
      currentSession.durationMinutes = Math.max(0, Math.round((scanTime - currentSession.inTime) / 60000));
    } else {
      // IN scan (first of the day or new session)
      scanType = 'IN';
      currentSession = {
        inTime: scanTime,
        outTime: null,
        inDeviceId: deviceId,
        durationMinutes: 0
      };
      sessions.push(currentSession);
    }

    // Recalculate totals & status
    recalculateAttendance(attendance, setting, employee);
    await attendance.save();

    // 4. Log Raw Scan
    const savedLog = await RawScanLog.create({
      cardUid: cleanUid,
      employee: employee._id,
      deviceId,
      timestamp: scanTime,
      scanType,
      status: 'SUCCESS',
      message: `${scanType} recorded for ${employee.fullName}`,
      rawPayload: req.body
    });

    // 5. Construct hardware-friendly response & personalized greeting (locked to IST)
    const formattedScanTime = formatTime(scanTime);
    const formattedScanDate = formatDate(scanTime);
    const { timeOfDay, hindiGreeting } = getTimeOfDayInfo(scanTime);
    const hour = getIstHour(scanTime);

    let message = '';
    let greetingText = '';
    let spokenGreeting = '';
    let buzzer = { beeps: 1, durationMs: 150 };
    let lcdLine1 = '';
    let lcdLine2 = '';

    if (scanType === 'IN') {
      let timingRemark = '';
      let spokenRemark = '';
      if (attendance.isEarlyIn) {
        timingRemark = ` (Early by ${attendance.earlyByMinutes}m)`;
        spokenRemark = ` You have arrived ${attendance.earlyByMinutes} minutes early today! Great job!`;
      } else if (attendance.isLate) {
        timingRemark = ` (Late by ${attendance.lateByMinutes}m)`;
        spokenRemark = ` Late arrival by ${attendance.lateByMinutes} minutes.`;
      }

      message = `Welcome ${employee.fullName}! Clocked IN at ${formattedScanTime}.${timingRemark}`;
      greetingText = `Good ${timeOfDay}, ${employee.fullName}! Welcome to Arshi Enterprises.${timingRemark}`;
      spokenGreeting = `Welcome ${employee.fullName}! Good ${timeOfDay}, your entry is marked at ${formattedScanTime}.${spokenRemark} Have a great and productive day!`;
      buzzer = { beeps: 1, durationMs: 200 };
      lcdLine1 = attendance.isEarlyIn ? `WELCOME EARLY!` : `WELCOME!`;
      lcdLine2 = employee.fullName.slice(0, 16);
    } else {
      const sessionStr = formatMinutes(currentSession.durationMinutes);
      const totalStr = formatMinutes(attendance.totalWorkingMinutes);
      const exitWish = hour >= 18 ? 'Have a good evening and take care!' : (hour >= 12 ? 'Have a wonderful afternoon!' : 'Have a wonderful day!');
      
      let exitRemark = '';
      let spokenExitRemark = '';
      if (attendance.isLateExit) {
        exitRemark = ` (Late Checkout +${attendance.lateExitMinutes}m)`;
        spokenExitRemark = ` You stayed ${attendance.lateExitMinutes} minutes after scheduled shift.`;
      } else if (attendance.isEarlyExit) {
        exitRemark = ` (Early Exit -${attendance.earlyExitMinutes}m)`;
        spokenExitRemark = ` Checked out ${attendance.earlyExitMinutes} minutes early.`;
      }

      message = `Thank you ${employee.fullName}! Checkout successful at ${formattedScanTime}.${exitRemark} (Today: ${totalStr})`;
      greetingText = `Thank you ${employee.fullName}! Checkout successful${exitRemark} (${totalStr}).`;
      spokenGreeting = `Thank you ${employee.fullName}! Checkout successful at ${formattedScanTime}.${spokenExitRemark} Total working hours: ${totalStr}. ${exitWish} Goodbye!`;
      buzzer = { beeps: 2, durationMs: 150 };
      lcdLine1 = attendance.isLateExit ? `LATE CHECKOUT!` : (attendance.isEarlyExit ? `EARLY EXIT!` : `CHECKOUT OK!`);
      lcdLine2 = `${employee.fullName.slice(0, 8)} ${totalStr}`.slice(0, 16);
    }

    return res.status(200).json({
      success: true,
      status: 'SUCCESS',
      rawLogId: savedLog._id.toString(),
      scanType,
      message,
      greeting: greetingText,
      spokenGreeting,
      timeOfDay,
      hardwareLcd: { line1: lcdLine1, line2: lcdLine2 },
      employee: {
        id: employee.employeeId,
        name: employee.fullName,
        department: employee.department,
        designation: employee.designation,
        photo: employee.profilePhoto
      },
      time: formattedScanTime,
      date: formattedScanDate,
      rawDate: todayStr,
      sessionDuration: scanType === 'OUT' ? formatMinutes(currentSession.durationMinutes) : null,
      totalWorkingHours: formatMinutes(attendance.totalWorkingMinutes),
      isLate: attendance.isLate,
      lateByMinutes: attendance.lateByMinutes,
      isEarlyIn: attendance.isEarlyIn,
      earlyByMinutes: attendance.earlyByMinutes,
      isLateExit: attendance.isLateExit,
      lateExitMinutes: attendance.lateExitMinutes,
      isEarlyExit: attendance.isEarlyExit,
      earlyExitMinutes: attendance.earlyExitMinutes,
      isOvertime: attendance.isOvertime,
      overtimeMinutes: attendance.overtimeMinutes,
      buzzer
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      status: 'ERROR',
      message: 'Failed to process RFID scan.',
      error: error.message,
      buzzer: { beeps: 3, durationMs: 500 }
    });
  }
};

// Sync Offline Scans from ESP32
exports.syncOfflineScans = async (req, res) => {
  try {
    const { scans } = req.body; // Array of { cardUid, deviceId, timestamp }

    if (!Array.isArray(scans) || scans.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid or empty scans array.' });
    }

    // Sort chronologically
    const sortedScans = [...scans].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    const results = [];

    for (const scan of sortedScans) {
      try {
        const cleanUid = (scan.cardUid || '').toUpperCase().trim();
        const scanTime = new Date(scan.timestamp || Date.now());
        const todayStr = getLocalDateString(scanTime);

        const employee = await Employee.findOne({ rfidCardUid: cleanUid });
        if (!employee || employee.status !== 'Active') {
          await RawScanLog.create({
            cardUid: cleanUid,
            deviceId: scan.deviceId || 'ESP32_OFFLINE_SYNC',
            timestamp: scanTime,
            scanType: 'REJECTED',
            status: employee ? 'INACTIVE_CARD' : 'UNKNOWN_CARD',
            isOfflineSync: true,
            message: 'Offline sync: Unregistered or inactive employee'
          });
          results.push({ cardUid: cleanUid, success: false, reason: 'Invalid or inactive card' });
          continue;
        }

        const setting = (await Setting.findOne()) || {};
        let attendance = await Attendance.findOne({ employee: employee._id, date: todayStr });
        if (!attendance) {
          attendance = new Attendance({ employee: employee._id, date: todayStr, sessions: [] });
        }

        const sessions = attendance.sessions;
        let scanType = 'IN';

        if (sessions.length > 0 && sessions[sessions.length - 1].outTime === null) {
          scanType = 'OUT';
          const current = sessions[sessions.length - 1];
          current.outTime = scanTime;
          current.outDeviceId = scan.deviceId || 'ESP32_OFFLINE';
          current.durationMinutes = Math.max(0, Math.round((scanTime - current.inTime) / 60000));
        } else {
          scanType = 'IN';
          sessions.push({
            inTime: scanTime,
            outTime: null,
            inDeviceId: scan.deviceId || 'ESP32_OFFLINE',
            durationMinutes: 0
          });
        }

        recalculateAttendance(attendance, setting, employee);
        await attendance.save();

        await RawScanLog.create({
          cardUid: cleanUid,
          employee: employee._id,
          deviceId: scan.deviceId || 'ESP32_OFFLINE_SYNC',
          timestamp: scanTime,
          scanType,
          status: 'SUCCESS',
          isOfflineSync: true,
          message: `Offline sync: ${scanType} for ${employee.fullName}`
        });

        results.push({
          cardUid: cleanUid,
          employee: employee.fullName,
          scanType,
          timestamp: scanTime,
          success: true
        });
      } catch (innerErr) {
        results.push({ cardUid: scan.cardUid, success: false, error: innerErr.message });
      }
    }

    return res.status(200).json({
      success: true,
      message: `Processed ${results.filter(r => r.success).length}/${results.length} offline scans successfully.`,
      results
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Offline sync failed.', error: error.message });
  }
};

// Get Raw Scan Audit Logs
exports.getRawScanLogs = async (req, res) => {
  try {
    const { limit = 50, page = 1, cardUid, status } = req.query;
    let query = {};

    if (cardUid) {
      query.cardUid = cardUid.toUpperCase().trim();
    }
    if (status) {
      query.status = status;
    }

    const logs = await RawScanLog.find(query)
      .populate('employee', 'employeeId fullName department designation profilePhoto')
      .sort({ timestamp: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await RawScanLog.countDocuments(query);

    return res.status(200).json({
      success: true,
      count: logs.length,
      total,
      data: logs
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve raw scan logs.', error: error.message });
  }
};
