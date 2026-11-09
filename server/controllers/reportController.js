const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');
const Setting = require('../models/Setting');
const Holiday = require('../models/Holiday');
const { formatMinutes } = require('../services/attendanceCalculator');

function formatTime(date) {
  if (!date) return '--:--';
  const d = new Date(date);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

// Date-Wise Comprehensive Report
exports.getDateWiseReport = async (req, res) => {
  try {
    const { date, department, search } = req.query;
    if (!date) {
      return res.status(400).json({ success: false, message: 'Date is required (YYYY-MM-DD).' });
    }

    let empQuery = { status: 'Active' };
    if (department && department !== 'All') {
      empQuery.department = department;
    }
    if (search) {
      const regex = new RegExp(search.trim(), 'i');
      empQuery.$or = [{ fullName: regex }, { employeeId: regex }, { department: regex }];
    }

    const employees = await Employee.find(empQuery).sort({ employeeId: 1 });
    const empIds = employees.map(e => e._id);

    const setting = (await Setting.findOne()) || {};
    const attendances = await Attendance.find({
      date,
      employee: { $in: empIds }
    }).populate('employee', 'employeeId fullName department designation');

    // Auto-repair any 0-hour closed records
    for (const att of attendances) {
      if (att.sessions && att.sessions.length > 0 && att.sessions[0].outTime && (!att.totalWorkingMinutes || att.totalWorkingMinutes === 0)) {
        const { recalculateAttendance } = require('../services/attendanceCalculator');
        recalculateAttendance(att, setting, employee);
        await att.save();
      }
    }

    const attMap = new Map();
    attendances.forEach(att => {
      attMap.set(att.employee._id.toString(), att);
    });

    const report = employees.map(emp => {
      const att = attMap.get(emp._id.toString());
      if (att && att.sessions && att.sessions.length > 0) {
        return {
          _id: att._id,
          attendanceId: att._id,
          employeeDbId: emp._id,
          employee: {
            _id: emp._id,
            employeeId: emp.employeeId,
            fullName: emp.fullName,
            department: emp.department,
            gender: emp.gender || 'Male'
          },
          employeeId: emp.employeeId,
          fullName: emp.fullName,
          gender: emp.gender || 'Male',
          department: emp.department,
          designation: emp.designation,
          expectedWorkingHours: att.expectedWorkingHours || (emp.gender === 'Female' ? (setting.femaleExpectedWorkingHours || 7) : (setting.maleExpectedWorkingHours || 8)),
          date,
          status: att.status,
          inTime: formatTime(att.firstInTime),
          outTime: formatTime(att.lastOutTime),
          firstInRaw: att.firstInTime,
          lastOutRaw: att.lastOutTime,
          sessions: att.sessions,
          totalWorkingMinutes: att.totalWorkingMinutes || 0,
          totalWorkingHours: formatMinutes(att.totalWorkingMinutes || 0),
          breakDuration: formatMinutes(att.breakMinutes || 0),
          isLate: att.isLate ? 'Yes' : 'No',
          lateBy: att.isLate ? `${att.lateByMinutes}m` : '--',
          isEarlyExit: att.isEarlyExit ? 'Yes' : 'No',
          earlyExitBy: att.isEarlyExit ? `${att.earlyExitMinutes}m` : '--',
          isOvertime: att.isOvertime ? 'Yes' : 'No',
          overtime: att.isOvertime ? `${att.overtimeMinutes}m` : '--',
          sessionsCount: att.sessions.length,
          isManualCorrection: att.isManualCorrection ? 'Yes' : 'No'
        };
      } else {
        return {
          _id: null,
          attendanceId: null,
          employeeDbId: emp._id,
          employee: {
            _id: emp._id,
            employeeId: emp.employeeId,
            fullName: emp.fullName,
            department: emp.department,
            gender: emp.gender || 'Male'
          },
          employeeId: emp.employeeId,
          fullName: emp.fullName,
          gender: emp.gender || 'Male',
          department: emp.department,
          designation: emp.designation,
          expectedWorkingHours: att.expectedWorkingHours || (emp.gender === 'Female' ? (setting.femaleExpectedWorkingHours || 7) : (setting.maleExpectedWorkingHours || 8)),
          date,
          status: 'Absent',
          inTime: '--:--',
          outTime: '--:--',
          firstInRaw: null,
          lastOutRaw: null,
          sessions: [],
          totalWorkingMinutes: 0,
          totalWorkingHours: '0h 00m',
          breakDuration: '0h 00m',
          isLate: 'No',
          lateBy: '--',
          isEarlyExit: 'No',
          earlyExitBy: '--',
          isOvertime: 'No',
          overtime: '--',
          sessionsCount: 0,
          isManualCorrection: 'No'
        };
      }
    });

    return res.status(200).json({
      success: true,
      date,
      count: report.length,
      data: report
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to generate date report.', error: error.message });
  }
};

// Employee Monthly Report
exports.getEmployeeMonthlyReport = async (req, res) => {
  try {
    const { employeeId, month } = req.query; // month in format 'YYYY-MM'
    if (!employeeId || !month) {
      return res.status(400).json({ success: false, message: 'employeeId and month (YYYY-MM) are required.' });
    }

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found.' });
    }

    const setting = (await Setting.findOne()) || { weeklyHolidays: [0], expectedWorkingHours: 8 };
    const holidays = await Holiday.find({ date: { $regex: `^${month}` } });
    const holidayDates = new Set(holidays.map(h => h.date));

    // Get all days of the month
    const [year, monthNum] = month.split('-').map(Number);
    const daysInMonth = new Date(year, monthNum, 0).getDate();

    // Fetch all attendance records for this month
    const attendances = await Attendance.find({
      employee: employee._id,
      date: { $regex: `^${month}` }
    }).sort({ date: 1 });

    // Auto-repair any 0-hour closed records
    for (const att of attendances) {
      if (att.sessions && att.sessions.length > 0 && att.sessions[0].outTime && (!att.totalWorkingMinutes || att.totalWorkingMinutes === 0)) {
        const { recalculateAttendance } = require('../services/attendanceCalculator');
        recalculateAttendance(att, setting, employee);
        await att.save();
      }
    }

    const attMap = new Map();
    attendances.forEach(att => {
      attMap.set(att.date, att);
    });

    let totalWorkingDays = 0;
    let presentDays = 0;
    let absentDays = 0;
    let halfDays = 0;
    let lateArrivals = 0;
    let totalWorkingMinutes = 0;
    let totalOvertimeMinutes = 0;
    const dailyRecords = [];

    // Today's date to avoid marking future days as absent
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(monthNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayDate = new Date(year, monthNum - 1, day);
      const dayOfWeek = dayDate.getDay();
      const isWeeklyOff = (setting.weeklyHolidays || [0]).includes(dayOfWeek);
      const isPublicHoliday = holidayDates.has(dateStr);
      const isFuture = dateStr > todayStr;

      const att = attMap.get(dateStr);
      const hasWorked = att && att.sessions && att.sessions.length > 0;

      let dayStatus = 'Absent';
      let inTime = '--:--';
      let outTime = '--:--';
      let minutesWorked = 0;
      let lateBy = 0;
      let overtime = 0;

      if (!isFuture) {
        if (!isWeeklyOff && !isPublicHoliday) {
          totalWorkingDays++;
        } else if (hasWorked) {
          // Employee worked on a weekend / holiday
          totalWorkingDays++;
        }
      }

      if (hasWorked) {
        inTime = formatTime(att.firstInTime);
        outTime = formatTime(att.lastOutTime);
        minutesWorked = att.totalWorkingMinutes || 0;
        totalWorkingMinutes += minutesWorked;

        if (att.isLate) {
          lateArrivals++;
          lateBy = att.lateByMinutes;
        }

        if (att.isOvertime) {
          totalOvertimeMinutes += (att.overtimeMinutes || 0);
          overtime = att.overtimeMinutes;
        }

        if (att.status === 'Half-Day') {
          halfDays++;
          dayStatus = 'Half-Day';
        } else {
          presentDays++;
          dayStatus = att.isLate ? 'Late' : 'Present';
        }
      } else if (isWeeklyOff) {
        dayStatus = 'Weekend';
      } else if (isPublicHoliday) {
        dayStatus = 'Holiday';
      } else if (!isFuture) {
        absentDays++;
        dayStatus = 'Absent';
      } else if (isFuture) {
        dayStatus = '--';
      }

      dailyRecords.push({
        date: dateStr,
        day: dayDate.toLocaleDateString('en-US', { weekday: 'short' }),
        status: dayStatus,
        inTime,
        outTime,
        workingMinutes: minutesWorked,
        workingHours: formatMinutes(minutesWorked),
        lateBy: lateBy > 0 ? `${lateBy}m` : '--',
        overtime: overtime > 0 ? `${overtime}m` : '--',
        isManual: att ? (att.isManualCorrection ? 'Yes' : 'No') : 'No'
      });
    }

    const averageWorkingMinutes = (presentDays + halfDays > 0)
      ? Math.round(totalWorkingMinutes / (presentDays + halfDays))
      : 0;

    const monthlyPercentage = totalWorkingDays > 0
      ? Math.min(100, Math.round(((presentDays + halfDays * 0.5) / totalWorkingDays) * 100))
      : 0;

    return res.status(200).json({
      success: true,
      employee: {
        _id: employee._id,
        employeeId: employee.employeeId,
        fullName: employee.fullName,
        gender: employee.gender || 'Male',
        department: employee.department,
        designation: employee.designation,
        joiningDate: employee.joiningDate,
        rfidCardUid: employee.rfidCardUid,
        profilePhoto: employee.profilePhoto
      },
      month,
      summary: {
        gender: employee.gender || 'Male',
        expectedWorkingHours: employee.customWorkingHours || (employee.gender === 'Female' ? (setting.femaleExpectedWorkingHours || 7) : (setting.maleExpectedWorkingHours || 8)),
        totalWorkingDays,
        presentDays,
        absentDays,
        halfDays,
        lateArrivals,
        totalWorkingMinutes,
        totalWorkingHours: formatMinutes(totalWorkingMinutes),
        averageWorkingMinutes,
        averageWorkingHours: formatMinutes(averageWorkingMinutes),
        overtimeMinutes: totalOvertimeMinutes,
        overtimeHours: formatMinutes(totalOvertimeMinutes),
        attendancePercentage: monthlyPercentage
      },
      dailyRecords
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to generate monthly report.', error: error.message });
  }
};
