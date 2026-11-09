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

    // 1. Employee Counts
    const totalEmployees = await Employee.countDocuments({ status: 'Active' });

    // 2. Today's Attendance Records
    const setting = (await Setting.findOne()) || {};
    const todayRecords = await Attendance.find({ date: todayStr }).populate('employee', 'fullName employeeId department');

    // Auto-repair any 0-hour closed records
    for (const rec of todayRecords) {
      if (rec.sessions && rec.sessions.length > 0 && rec.sessions[0].outTime && (!rec.totalWorkingMinutes || rec.totalWorkingMinutes === 0)) {
        const { recalculateAttendance } = require('../services/attendanceCalculator');
        recalculateAttendance(rec, setting);
        await rec.save();
      }
    }

    let presentToday = 0;
    let currentlyWorking = 0;
    let lateArrivals = 0;
    let earlyDepartures = 0;
    let totalMinutesToday = 0;

    todayRecords.forEach(rec => {
      // If has at least one session
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

    // 3. Monthly Attendance Percentage Calculation
    const monthRecords = await Attendance.find({
      date: { $regex: `^${monthPrefix}` }
    });

    // Approximate working days up to current day
    const currentDay = new Date().getDate();
    const potentialAttendances = Math.max(1, totalEmployees * currentDay);
    const actualAttendances = monthRecords.filter(r => r.sessions && r.sessions.length > 0).length;
    const monthlyAttendancePercentage = Math.min(100, Math.round((actualAttendances / potentialAttendances) * 100));

    // 4. Last 7 Days Attendance Trend (Weekly)
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      last7Days.push(getLocalDateString(d));
    }

    const weeklyRecords = await Attendance.find({ date: { $in: last7Days } });

    // Auto-repair any 0-hour closed records in weekly records
    for (const rec of weeklyRecords) {
      if (rec.sessions && rec.sessions.length > 0 && rec.sessions[0].outTime && (!rec.totalWorkingMinutes || rec.totalWorkingMinutes === 0)) {
        const { recalculateAttendance } = require('../services/attendanceCalculator');
        recalculateAttendance(rec, setting);
        await rec.save();
      }
    }

    const weeklyChartData = last7Days.map(dStr => {
      const dayRecs = weeklyRecords.filter(r => r.date === dStr && r.sessions && r.sessions.length > 0);
      const dayPresent = dayRecs.length;
      const dayLate = dayRecs.filter(r => r.isLate).length;
      const dayHalf = dayRecs.filter(r => r.status === 'Half-Day').length;
      const dayAbsent = Math.max(0, totalEmployees - dayPresent);
      const dayHours = Math.round(dayRecs.reduce((acc, cur) => acc + (cur.totalWorkingMinutes || 0), 0) / 60);

      // Short day name
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

    // 5. Employee Working-Hours Top Comparison Today
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

    // 6. Department Attendance Distribution Today
    const departmentMap = {};
    const allEmployees = await Employee.find({ status: 'Active' });
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

    const departmentChartData = Object.keys(departmentMap).map(dept => ({
      department: dept,
      total: departmentMap[dept].total,
      present: departmentMap[dept].present,
      absent: Math.max(0, departmentMap[dept].total - departmentMap[dept].present),
      attendanceRate: Math.round((departmentMap[dept].present / (departmentMap[dept].total || 1)) * 100)
    }));

    return res.status(200).json({
      success: true,
      stats: {
        totalEmployees,
        presentToday,
        absentToday,
        currentlyWorking,
        lateArrivals,
        earlyDepartures,
        totalWorkingMinutesToday: totalMinutesToday,
        totalWorkingHoursFormatted: formatMinutes(totalMinutesToday),
        monthlyAttendancePercentage
      },
      charts: {
        weeklyTrend: weeklyChartData,
        workingHoursComparison,
        departmentDistribution: departmentChartData
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch dashboard stats.', error: error.message });
  }
};
