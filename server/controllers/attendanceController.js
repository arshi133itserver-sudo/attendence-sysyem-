const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');
const Setting = require('../models/Setting');
const AuditLog = require('../models/AuditLog');
const RawScanLog = require('../models/RawScanLog');
const Holiday = require('../models/Holiday');
const { recalculateAttendance, formatMinutes } = require('../services/attendanceCalculator');
const { getLocalDateString } = require('../utils/dateUtils');

// Get Attendance for Today (with real-time working status)
exports.getTodayAttendance = async (req, res) => {
  try {
    const todayStr = getLocalDateString();
    let empQuery = { status: 'Active' };
    const isStaff = req.user && req.user.role === 'staff';
    const staffEmpId = isStaff ? (req.user.employee?._id || req.user.employee) : null;
    if (isStaff && staffEmpId) {
      empQuery._id = staffEmpId;
    }

    const employees = await Employee.find(empQuery).sort({ fullName: 1 });
    const attendanceRecords = await Attendance.find({ date: todayStr });

    const attendanceMap = new Map();
    attendanceRecords.forEach(att => {
      attendanceMap.set(att.employee.toString(), att);
    });

    const result = employees.map(emp => {
      const att = attendanceMap.get(emp._id.toString());
      let currentStatus = 'Absent';
      let isWorkingNow = false;
      let firstIn = null;
      let lastOut = null;
      let totalMinutes = 0;
      let breakMinutes = 0;
      let sessions = [];

      if (att) {
        sessions = att.sessions || [];
        totalMinutes = att.totalWorkingMinutes || 0;
        breakMinutes = att.breakMinutes || 0;
        firstIn = att.firstInTime;
        lastOut = att.lastOutTime;

        if (sessions.length > 0 && sessions[sessions.length - 1].outTime === null) {
          isWorkingNow = true;
          currentStatus = 'Working';
        } else if (sessions.length > 0) {
          currentStatus = att.status || 'Present';
        }
      }

      return {
        employee: {
          _id: emp._id,
          employeeId: emp.employeeId,
          fullName: emp.fullName,
          department: emp.department,
          designation: emp.designation,
          rfidCardUid: emp.rfidCardUid,
          profilePhoto: emp.profilePhoto
        },
        date: todayStr,
        attendanceId: att ? att._id : null,
        isWorkingNow,
        status: currentStatus,
        firstInTime: firstIn,
        lastOutTime: lastOut,
        totalWorkingMinutes: totalMinutes,
        totalWorkingHoursFormatted: formatMinutes(totalMinutes),
        breakMinutes,
        breakFormatted: formatMinutes(breakMinutes),
        isEarlyIn: att ? att.isEarlyIn : false,
        earlyByMinutes: att ? att.earlyByMinutes : 0,
        isLate: att ? att.isLate : false,
        lateByMinutes: att ? att.lateByMinutes : 0,
        isEarlyExit: att ? att.isEarlyExit : false,
        earlyExitMinutes: att ? att.earlyExitMinutes : 0,
        isLateExit: att ? att.isLateExit : false,
        lateExitMinutes: att ? att.lateExitMinutes : 0,
        isOvertime: att ? att.isOvertime : false,
        overtimeMinutes: att ? att.overtimeMinutes : 0,
        sessions
      };
    });

    // Fetch latest successful scan today for real-time dashboard greeting events
    const latestRawScan = await RawScanLog.findOne({
      status: 'SUCCESS',
      scanType: { $in: ['IN', 'OUT'] }
    })
      .populate('employee', 'employeeId fullName department designation profilePhoto')
      .sort({ timestamp: -1 });

    let latestScan = null;
    if (latestRawScan) {
      const scanDate = new Date(latestRawScan.timestamp);
      const hour = scanDate.getHours();
      let timeOfDay = 'Morning';
      if (hour >= 12 && hour < 17) timeOfDay = 'Afternoon';
      else if (hour >= 17) timeOfDay = 'Evening';

      const scanTimeStr = scanDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
      const empName = latestRawScan.employee?.fullName || 'Staff Member';

      latestScan = {
        id: latestRawScan._id.toString(),
        scanType: latestRawScan.scanType,
        timestamp: latestRawScan.timestamp,
        time: scanTimeStr,
        timeOfDay,
        employee: latestRawScan.employee ? {
          id: latestRawScan.employee.employeeId,
          name: empName,
          department: latestRawScan.employee.department,
          designation: latestRawScan.employee.designation,
          photo: latestRawScan.employee.profilePhoto
        } : null,
        message: latestRawScan.message,
        spokenGreeting: latestRawScan.scanType === 'IN'
          ? `Welcome ${empName}! Good ${timeOfDay}, your entry is marked at ${scanTimeStr}. Have a great and productive day!`
          : `Thank you ${empName}! Checkout successful at ${scanTimeStr}. Have a wonderful evening! Goodbye!`
      };
    }

    return res.status(200).json({
      success: true,
      date: todayStr,
      count: result.length,
      data: result,
      latestScan
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch today attendance.', error: error.message });
  }
};

// Get Attendance by Specific Date with Filters
exports.getAttendanceByDate = async (req, res) => {
  try {
    const { date = getLocalDateString(), department, search } = req.query;

    let empQuery = {};
    if (req.user && req.user.role === 'staff') {
      const staffEmpId = req.user.employee?._id || req.user.employee;
      empQuery._id = staffEmpId;
    } else {
      if (department && department !== 'All') {
        empQuery.department = department;
      }
      if (search) {
        const searchRegex = new RegExp(search.trim(), 'i');
        empQuery.$or = [
          { fullName: searchRegex },
          { employeeId: searchRegex },
          { department: searchRegex }
        ];
      }
    }

    const employees = await Employee.find(empQuery).sort({ employeeId: 1 });
    const empIds = employees.map(e => e._id);

    const attendanceRecords = await Attendance.find({
      date,
      employee: { $in: empIds }
    }).populate('employee', 'employeeId fullName department designation profilePhoto');

    const attMap = new Map();
    attendanceRecords.forEach(att => {
      attMap.set(att.employee._id.toString(), att);
    });

    const data = employees.map(emp => {
      const att = attMap.get(emp._id.toString());
      if (att) {
        return {
          _id: att._id,
          employee: {
            _id: emp._id,
            employeeId: emp.employeeId,
            fullName: emp.fullName,
            department: emp.department,
            designation: emp.designation,
            profilePhoto: emp.profilePhoto
          },
          date: att.date,
          status: att.status,
          firstInTime: att.firstInTime,
          lastOutTime: att.lastOutTime,
          totalWorkingMinutes: att.totalWorkingMinutes,
          totalWorkingHoursFormatted: formatMinutes(att.totalWorkingMinutes),
          breakMinutes: att.breakMinutes,
          breakFormatted: formatMinutes(att.breakMinutes),
          isEarlyIn: att.isEarlyIn,
          earlyByMinutes: att.earlyByMinutes,
          isLate: att.isLate,
          lateByMinutes: att.lateByMinutes,
          isEarlyExit: att.isEarlyExit,
          earlyExitMinutes: att.earlyExitMinutes,
          isLateExit: att.isLateExit,
          lateExitMinutes: att.lateExitMinutes,
          isOvertime: att.isOvertime,
          overtimeMinutes: att.overtimeMinutes,
          isManualCorrection: att.isManualCorrection,
          sessions: att.sessions
        };
      } else {
        return {
          _id: null,
          employee: {
            _id: emp._id,
            employeeId: emp.employeeId,
            fullName: emp.fullName,
            department: emp.department,
            designation: emp.designation,
            profilePhoto: emp.profilePhoto
          },
          date,
          status: 'Absent',
          firstInTime: null,
          lastOutTime: null,
          totalWorkingMinutes: 0,
          totalWorkingHoursFormatted: '0h 00m',
          breakMinutes: 0,
          breakFormatted: '0h 00m',
          isEarlyIn: false,
          earlyByMinutes: 0,
          isLate: false,
          lateByMinutes: 0,
          isEarlyExit: false,
          earlyExitMinutes: 0,
          isLateExit: false,
          lateExitMinutes: 0,
          isOvertime: false,
          overtimeMinutes: 0,
          isManualCorrection: false,
          sessions: []
        };
      }
    });

    return res.status(200).json({
      success: true,
      date,
      count: data.length,
      data
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch date attendance.', error: error.message });
  }
};

// Manual Attendance Entry / Check-in / Check-out / Holiday by Admin
exports.manualAttendanceEntry = async (req, res) => {
  try {
    const { employeeId, date, type, timestamp, inTime, outTime, reason = 'Manual entry by Admin' } = req.body;

    if (!employeeId) {
      return res.status(400).json({ success: false, message: 'Employee is required.' });
    }

    const normalizedType = (type || 'FULL_DAY').toUpperCase();
    const isAllEmployees = employeeId === 'ALL' || employeeId === 'ALL_EMPLOYEES';

    let targetEmployees = [];
    if (isAllEmployees) {
      targetEmployees = await Employee.find({ status: 'Active' });
      if (targetEmployees.length === 0) {
        return res.status(404).json({ success: false, message: 'No active employees found.' });
      }
    } else {
      let emp = null;
      if (employeeId.match(/^[0-9a-fA-F]{24}$/)) {
        emp = await Employee.findById(employeeId);
      }
      if (!emp) {
        emp = await Employee.findOne({ employeeId });
      }
      if (!emp) {
        return res.status(404).json({ success: false, message: 'Employee not found.' });
      }
      targetEmployees = [emp];
    }

    const entryTime = timestamp ? new Date(timestamp) : new Date();
    const entryDate = date || getLocalDateString(entryTime);
    const setting = (await Setting.findOne()) || {};

    // If marking as Holiday, also register in Holiday collection so it shows across all views
    if (normalizedType === 'HOLIDAY') {
      try {
        const existingHoliday = await Holiday.findOne({ date: entryDate });
        if (!existingHoliday) {
          const isSun = new Date(`${entryDate}T12:00:00+05:30`).getDay() === 0;
          await Holiday.create({
            name: reason || (isSun ? 'Sunday Holiday' : 'Company Holiday'),
            date: entryDate,
            type: 'Company',
            description: reason || 'Marked as Holiday by Admin via Manual Entry'
          });
        }
      } catch (_) {}
    }

    const results = [];

    for (const employee of targetEmployees) {
      let attendance = await Attendance.findOne({ employee: employee._id, date: entryDate });

      if (!attendance) {
        attendance = new Attendance({
          employee: employee._id,
          date: entryDate,
          sessions: []
        });
      }

      if (normalizedType === 'HOLIDAY' || normalizedType === 'WEEKEND') {
        attendance.sessions = [];
        attendance.firstInTime = null;
        attendance.lastOutTime = null;
        attendance.totalWorkingMinutes = 0;
        attendance.breakMinutes = 0;
        attendance.status = normalizedType === 'HOLIDAY' ? 'Holiday' : 'Weekend';
        attendance.isLate = false;
        attendance.isEarlyIn = false;
        attendance.isEarlyExit = false;
        attendance.isLateExit = false;
        attendance.isOvertime = false;
      } else if (normalizedType === 'ABSENT') {
        attendance.sessions = [];
        attendance.firstInTime = null;
        attendance.lastOutTime = null;
        attendance.totalWorkingMinutes = 0;
        attendance.breakMinutes = 0;
        attendance.status = 'Absent';
        attendance.isLate = false;
        attendance.isEarlyIn = false;
        attendance.isEarlyExit = false;
        attendance.isLateExit = false;
        attendance.isOvertime = false;
      } else if (normalizedType === 'FULL_DAY' || (inTime && outTime)) {
        const inD = inTime ? new Date(inTime) : new Date(`${entryDate}T09:00:00`);
        let outD = outTime ? new Date(outTime) : new Date(`${entryDate}T18:00:00`);

        if (outD <= inD) {
          const potentialOut = new Date(outD.getTime() + 12 * 60 * 60 * 1000);
          if (potentialOut > inD && (potentialOut.getTime() - inD.getTime()) <= 16 * 60 * 60 * 1000) {
            outD = potentialOut;
          }
        }

        attendance.sessions = [{
          inTime: inD,
          outTime: outD,
          inDeviceId: 'MANUAL_ADMIN',
          outDeviceId: 'MANUAL_ADMIN',
          durationMinutes: Math.max(0, Math.round((outD - inD) / 60000))
        }];
        recalculateAttendance(attendance, setting, employee);
      } else if (normalizedType === 'IN') {
        attendance.sessions.push({
          inTime: entryTime,
          outTime: null,
          inDeviceId: 'MANUAL_ADMIN',
          durationMinutes: 0
        });
        recalculateAttendance(attendance, setting, employee);
      } else if (normalizedType === 'OUT') {
        let finalOutTime = entryTime;
        if (attendance.sessions.length > 0) {
          const lastSession = attendance.sessions[attendance.sessions.length - 1];
          const lastInTime = new Date(lastSession.inTime);
          if (finalOutTime <= lastInTime) {
            const adjustedOut = new Date(finalOutTime.getTime() + 12 * 60 * 60 * 1000);
            if (adjustedOut > lastInTime && (adjustedOut.getTime() - lastInTime.getTime()) <= 16 * 60 * 60 * 1000) {
              finalOutTime = adjustedOut;
            }
          }
          lastSession.outTime = finalOutTime;
          lastSession.outDeviceId = 'MANUAL_ADMIN';
        } else {
          const defaultInTime = new Date(`${entryDate}T09:00:00`);
          let outD = finalOutTime;
          if (outD <= defaultInTime) {
            const adjustedOut = new Date(outD.getTime() + 12 * 60 * 60 * 1000);
            if (adjustedOut > defaultInTime) outD = adjustedOut;
          }
          attendance.sessions.push({
            inTime: defaultInTime,
            outTime: outD,
            inDeviceId: 'MANUAL_ADMIN',
            outDeviceId: 'MANUAL_ADMIN',
            durationMinutes: Math.max(0, Math.round((outD - defaultInTime) / 60000))
          });
        }
        recalculateAttendance(attendance, setting, employee);
      }

      attendance.isManualCorrection = true;
      attendance.correctionReason = reason;
      attendance.correctedBy = req.user._id;

      attendance.auditHistory.push({
        modifiedAt: new Date(),
        modifiedBy: req.user._id,
        action: `MANUAL_${normalizedType}`,
        reason,
        snapshot: { type: normalizedType, entryTime, entryDate }
      });

      await attendance.save();
      results.push(attendance);
    }

    await AuditLog.create({
      action: `MANUAL_ATTENDANCE_${normalizedType}`,
      entity: 'Attendance',
      performedBy: req.user._id,
      details: {
        target: isAllEmployees ? 'ALL_EMPLOYEES' : targetEmployees[0]?.employeeId,
        count: targetEmployees.length,
        type: normalizedType,
        entryDate
      },
      reason
    });

    return res.status(200).json({
      success: true,
      message: isAllEmployees
        ? `Marked ${normalizedType} for all ${targetEmployees.length} staff on ${entryDate}.`
        : `Manual ${normalizedType} recorded for ${targetEmployees[0].fullName}.`,
      count: targetEmployees.length,
      data: results.length === 1 ? results[0] : results
    });
      data: attendance
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Manual entry failed.', error: error.message });
  }
};

// Admin Correction Workflow (Missed checkout, session edit, custom times)
exports.correctAttendance = async (req, res) => {
  try {
    const { attendanceId, employeeId, date, sessions, status, reason } = req.body;

    if (!reason) {
      return res.status(400).json({ success: false, message: 'Reason for correction is required for audit compliance.' });
    }

    let attendance;
    if (attendanceId && attendanceId.match(/^[0-9a-fA-F]{24}$/)) {
      attendance = await Attendance.findById(attendanceId).populate('employee');
    }
    
    if (!attendance && employeeId && date) {
      let resolvedEmpId = employeeId;
      if (!employeeId.match(/^[0-9a-fA-F]{24}$/)) {
        const emp = await Employee.findOne({ employeeId });
        if (emp) resolvedEmpId = emp._id;
      }
      attendance = await Attendance.findOne({ employee: resolvedEmpId, date }).populate('employee');
      if (!attendance) {
        attendance = new Attendance({
          employee: resolvedEmpId,
          date,
          sessions: []
        });
      }
    }

    if (!attendance) {
      return res.status(400).json({ success: false, message: 'Could not find or create attendance record.' });
    }

    const previousSnapshot = attendance.toObject();

    if (Array.isArray(sessions)) {
      attendance.sessions = sessions.map(s => {
        const inD = new Date(s.inTime);
        let outD = s.outTime ? new Date(s.outTime) : null;
        if (outD && outD <= inD) {
          const potentialOut = new Date(outD.getTime() + 12 * 60 * 60 * 1000);
          if (potentialOut > inD && (potentialOut.getTime() - inD.getTime()) <= 16 * 60 * 60 * 1000) {
            outD = potentialOut;
          }
        }
        return {
          inTime: inD,
          outTime: outD,
          inDeviceId: s.inDeviceId || 'ADMIN_CORRECTION',
          outDeviceId: s.outDeviceId || 'ADMIN_CORRECTION',
          durationMinutes: outD ? Math.max(0, Math.round((outD - inD) / 60000)) : 0
        };
      });
    }

    const setting = (await Setting.findOne()) || {};
    recalculateAttendance(attendance, setting, employee);

    if (status) {
      attendance.status = status;
    }

    attendance.isManualCorrection = true;
    attendance.correctionReason = reason;
    attendance.correctedBy = req.user._id;

    attendance.auditHistory.push({
      modifiedAt: new Date(),
      modifiedBy: req.user._id,
      action: 'ADMIN_CORRECTION',
      reason,
      snapshot: previousSnapshot
    });

    await attendance.save();

    await AuditLog.create({
      action: 'ATTENDANCE_CORRECTION',
      entity: 'Attendance',
      entityId: attendance._id.toString(),
      performedBy: req.user._id,
      details: {
        employee: attendance.employee ? attendance.employee.fullName : null,
        date: attendance.date,
        sessionsCount: attendance.sessions.length,
        totalWorkingMinutes: attendance.totalWorkingMinutes
      },
      reason
    });

    return res.status(200).json({
      success: true,
      message: 'Attendance corrected successfully with audit log recorded.',
      data: attendance
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Correction failed.', error: error.message });
  }
};
