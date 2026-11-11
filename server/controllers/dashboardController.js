const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');
const Setting = require('../models/Setting');
const { formatMinutes } = require('../services/attendanceCalculator');
const { getLocalDateString } = require('../utils/dateUtils');

exports.getDashboardStats = async (req, res) => {
  try {
    const todayStr = getLocalDateString();
    const [year, month] = todayStr.split('-').map(Number);
    const monthPrefix = `${year}-${String(month).padStart(2, '0')}`;

    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      last7Days.push(getLocalDateString(d));
    }

    // Parallel optimized queries with minimal projections and .lean()
    const [allEmployees, settingDoc, todayRecords, monthRecords, weeklyRecords] = await Promise.all([
      Employee.find({ status: 'Active' }).select('fullName employeeId department').lean(),
      Setting.findOne().lean(),
      Attendance.find({ date: todayStr }).populate('employee', 'fullName employeeId department').lean(),
      Attendance.find({ date: { $regex: `^${monthPrefix}` } }, 'sessions').lean(),
      Attendance.find({ date: { $in: last7Days } }, 'date sessions isLate status totalWorkingMinutes').lean()
    ]);

    const totalEmployees = allEmployees.length;

    let presentToday = 0;
    let currentlyWorking = 0;
    let lateArrivals = 0;
    let earlyDepartures = 0;
    let totalMinutesToday = 0;

    todayRecords.forEach(rec => {
      if (rec.sessions && rec.sessions.length > 0) {
        presentToday++;
        const lastSession = rec.sessions[rec.sessions.length - 1];
        if (lastSession.outTime === null) {
          currentlyWorking++;
        }
      }

      if (rec.isLate) lateArrivals++;
      if (rec.isEarlyExit) earlyDepartures++;
      totalMinutesToday += rec.totalWorkingMinutes || 0;
    });

    const absentToday = Math.max(0, totalEmployees - presentToday);

    // Monthly Attendance Percentage Calculation
    const currentDay = new Date().getDate();
    const potentialAttendances = Math.max(1, totalEmployees * currentDay);
    const actualAttendances = monthRecords.filter(r => r.sessions && r.sessions.length > 0).length;
    const monthlyAttendancePercentage = Math.min(100, Math.round((actualAttendances / potentialAttendances) * 100));

    // Last 7 Days Attendance Trend (Weekly)
    const weeklyChartData = last7Days.map(dStr => {
      const dayRecs = weeklyRecords.filter(r => r.date === dStr && r.sessions && r.sessions.length > 0);
      const dayPresent = dayRecs.length;
      const dayLate = dayRecs.filter(r => r.isLate).length;
      const dayHalf = dayRecs.filter(r => r.status === 'Half-Day').length;
      const dayAbsent = Math.max(0, totalEmployees - dayPresent);
      const dayHours = Math.round(dayRecs.reduce((acc, cur) => acc + (cur.totalWorkingMinutes || 0), 0) / 60);

      const dateObj = new Date(dStr);
      const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' });

      return {
        date: dStr,
        day: dayName,
        present: dayPresent,
        absent: dayAbsent,
        late: dayLate,
        halfDay: dayHalf,
        totalHours: dayHours
      };
    });

    // Employee Working-Hours Top Comparison Today
    const workingHoursComparison = todayRecords
      .map(r => ({
        name: r.employee ? r.employee.fullName : 'Unknown',
        employeeId: r.employee ? r.employee.employeeId : '',
        department: r.employee ? r.employee.department : '',
        hours: Number(((r.totalWorkingMinutes || 0) / 60).toFixed(1)),
        formattedHours: formatMinutes(r.totalWorkingMinutes || 0)
      }))
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 10);

    // Department Attendance Distribution Today
    const departmentMap = {};
    allEmployees.forEach(emp => {
      const dept = emp.department || 'General';
      if (!departmentMap[dept]) {
        departmentMap[dept] = { total: 0, present: 0 };
      }
      departmentMap[dept].total++;
    });

    todayRecords.forEach(r => {
      if (r.employee && r.sessions && r.sessions.length > 0) {
        const dept = r.employee.department || 'General';
        if (departmentMap[dept]) {
          departmentMap[dept].present++;
        }
      }
    });

    const departmentDistribution = Object.keys(departmentMap).map(dept => {
      const total = departmentMap[dept].total;
      const present = departmentMap[dept].present;
      const absent = Math.max(0, total - present);
      const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
      return {
        department: dept,
        total,
        present,
        absent,
        percentage
      };
    });

    return res.status(200).json({
      success: true,
      stats: {
        totalEmployees,
        presentToday,
        absentToday,
        currentlyWorking,
        lateArrivals,
        earlyDepartures,
        totalHoursToday: formatMinutes(totalMinutesToday),
        monthlyAttendancePercentage
      },
      charts: {
        weeklyAttendance: weeklyChartData,
        departmentDistribution,
        workingHoursComparison
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to load dashboard metrics.', error: error.message });
  }
};
