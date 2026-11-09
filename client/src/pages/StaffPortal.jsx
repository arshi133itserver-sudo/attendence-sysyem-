import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { reportApi, attendanceApi } from '../services/api';
import { exportToExcel, exportMonthlyPdf } from '../services/exportService';
import StatsCard from '../components/StatsCard';
import StaffIdCardModal from '../components/StaffIdCardModal';
import SelfiePunchModal from '../components/SelfiePunchModal';
import {
  UserCheck,
  Clock,
  Calendar,
  FileSpreadsheet,
  FileText,
  CreditCard,
  Briefcase,
  AlertTriangle,
  Award,
  UserX,
  TrendingUp,
  CheckCircle,
  XCircle,
  Phone,
  Mail,
  Building,
  Radio,
  Filter,
  Camera
} from 'lucide-react';

export default function StaffPortal({ onOpenSimulator }) {
  const { user } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [reportData, setReportData] = useState(null);
  const [todayRecord, setTodayRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('ALL'); // 'ALL', 'LATE', 'ABSENT', 'PRESENT'
  const [idCardOpen, setIdCardOpen] = useState(false);
  const [selfieModalOpen, setSelfieModalOpen] = useState(false);

  const empId = user?.employee?._id || user?.employee;

  const fetchStaffData = async () => {
    if (!empId) return;
    setLoading(true);
    try {
      const [res, todayRes] = await Promise.all([
        reportApi.getMonthly(empId, selectedMonth),
        attendanceApi.getToday().catch(() => ({ success: false }))
      ]);

      if (res.success) {
        setReportData(res);
      }
      if (todayRes.success && todayRes.data) {
        const myToday = todayRes.data.find(
          r => String(r.employee?._id) === String(empId) || String(r.employee?.employeeId) === String(user?.employee?.employeeId)
        );
        setTodayRecord(myToday || null);
      }
    } catch (err) {
      console.error('Failed to load staff monthly report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaffData();
  }, [empId, selectedMonth]);

  const handleExportExcel = () => {
    if (!reportData) return;
    const { employee, dailyRecords } = reportData;
    const data = dailyRecords.map(r => ({
      'Employee ID': employee.employeeId,
      'Name': employee.fullName,
      'Month': selectedMonth,
      'Date': r.date,
      'Day': r.day,
      'Status': r.status,
      'IN Time': r.inTime,
      'OUT Time': r.outTime,
      'Working Hours': r.workingHours,
      'Late By': r.lateBy,
      'Overtime': r.overtime
    }));
    exportToExcel(data, `My_Portfolio_Attendance_${selectedMonth}`, 'MyAttendance');
  };

  const handleExportPdf = () => {
    if (!reportData) return;
    exportMonthlyPdf(
      reportData.employee,
      reportData.month,
      reportData.summary,
      reportData.dailyRecords
    );
  };

  const filteredRecords = (reportData?.dailyRecords || []).filter(r => {
    if (activeFilter === 'LATE') return r.lateBy !== '--' || r.status === 'Late';
    if (activeFilter === 'ABSENT') return r.status === 'Absent';
    if (activeFilter === 'PRESENT') return r.status === 'Present' || r.status === 'Late' || r.status === 'Half-Day';
    return true;
  });

  const employee = reportData?.employee || user?.employee || {};
  const summary = reportData?.summary;

  return (
    <div className="space-y-6">
      {/* Employee Portfolio Hero Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-950 to-brand-950 border border-brand-500/30 rounded-3xl p-6 text-white shadow-2xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-brand-600 to-emerald-400 text-white font-black text-3xl flex items-center justify-center shadow-lg shadow-brand-500/30 overflow-hidden shrink-0 border-2 border-white/20">
            {employee.profilePhoto ? (
              <img src={employee.profilePhoto} alt="" className="w-full h-full object-cover" />
            ) : (
              (employee.fullName || user?.name || 'S').charAt(0)
            )}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30">
                Staff Portfolio
              </span>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-white/10 text-slate-300">
                User ID: {employee.employeeId || 'ARS-001'}
              </span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              {employee.fullName || user?.name}
            </h1>
            <p className="text-xs text-slate-300 font-medium">
              {employee.designation || 'Staff'} • {employee.department || 'General'}
            </p>

            <div className="flex flex-wrap items-center gap-4 mt-2.5 text-xs text-slate-400">
              <span className="flex items-center gap-1.5 font-mono text-emerald-400">
                <CreditCard className="w-3.5 h-3.5" />
                <span>Card UID: {employee.rfidCardUid || 'Unassigned'}</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>{employee.email || user?.email}</span>
              </span>
              {employee.mobileNumber && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{employee.mobileNumber}</span>
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Real-Time Punch Status Box & Month Selector */}
        <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end gap-3 w-full lg:w-auto">
          {/* Today Live Status Pill */}
          {todayRecord && todayRecord.isWorkingNow ? (
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-indigo-500/20 border border-indigo-400/40 text-indigo-300 text-xs font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-pulse"></span>
              <span>Currently Working Now (Clocked IN at {new Date(todayRecord.firstInTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })})</span>
            </div>
          ) : todayRecord && todayRecord.lastOutTime ? (
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-blue-500/20 border border-blue-400/40 text-blue-300 text-xs font-bold">
              <CheckCircle className="w-4 h-4 text-blue-400" />
              <span>Clocked OUT Today ({todayRecord.totalWorkingHoursFormatted} completed)</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-bold">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>Not Clocked IN Yet Today</span>
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3.5 py-2 rounded-xl bg-slate-800/90 border border-slate-700 text-xs font-mono font-bold text-white focus:outline-none"
            />
            <button
              onClick={handleExportExcel}
              className="px-3 py-2 rounded-xl bg-emerald-600/80 hover:bg-emerald-600 text-white text-xs font-bold transition-colors flex items-center gap-1"
              title="Download Excel Timesheet"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Excel</span>
            </button>
            <button
              onClick={handleExportPdf}
              className="px-3 py-2 rounded-xl bg-rose-600/80 hover:bg-rose-600 text-white text-xs font-bold transition-colors flex items-center gap-1"
              title="Download PDF Timesheet"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>PDF</span>
            </button>
            <button
              onClick={() => setIdCardOpen(true)}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors flex items-center gap-1.5 border border-slate-700"
              title="View & Print Official Staff ID Card"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>My ID Card</span>
            </button>
            <button
              onClick={() => setSelfieModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black transition-all flex items-center gap-1.5 shadow-md shadow-emerald-600/30"
              title="Live selfie photo lekar attendance request bhejein"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Selfie Present</span>
            </button>
          </div>
        </div>
      </div>

      {/* Portfolio Performance Metric Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Attendance Percentage */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Monthly Attendance
              </span>
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900 dark:text-white">
                  {summary.attendancePercentage}%
                </span>
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  {summary.attendancePercentage >= 90
                    ? 'Excellent'
                    : summary.attendancePercentage >= 75
                    ? 'Good'
                    : 'Needs Improvement'}
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 mt-3 overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-700"
                  style={{ width: `${summary.attendancePercentage}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 font-medium">
                {summary.presentDays} present out of {summary.totalWorkingDays} working days
              </p>
            </div>
          </div>

          {/* Card 2: Kitne Din Late Hua */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Late Arrivals (Kitne Din)
              </span>
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-amber-600 dark:text-amber-400">
                  {summary.lateArrivals}
                </span>
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                  {summary.lateArrivals === 1 ? 'Day Late' : 'Days Late'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                Office Start: 10:00 AM (Grace: 15 mins). Punching after 10:15 AM counts as Late.
              </p>
              <button
                onClick={() => setActiveFilter(activeFilter === 'LATE' ? 'ALL' : 'LATE')}
                className="mt-2 text-[11px] font-bold text-amber-600 hover:text-amber-700 underline"
              >
                {activeFilter === 'LATE' ? 'Show all days' : 'View late dates in table below ↓'}
              </button>
            </div>
          </div>

          {/* Card 3: Kitne Din Absent Hua */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Absent Days (Kitne Din)
              </span>
              <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                <UserX className="w-5 h-5" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-rose-600 dark:text-rose-400">
                  {summary.absentDays}
                </span>
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                  {summary.absentDays === 1 ? 'Day Absent' : 'Days Absent'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                {summary.halfDays > 0 ? `${summary.halfDays} Half-day recorded.` : 'Excludes official company holidays and Sundays.'}
              </p>
              <button
                onClick={() => setActiveFilter(activeFilter === 'ABSENT' ? 'ALL' : 'ABSENT')}
                className="mt-2 text-[11px] font-bold text-rose-600 hover:text-rose-700 underline"
              >
                {activeFilter === 'ABSENT' ? 'Show all days' : 'View absent dates in table below ↓'}
              </button>
            </div>
          </div>

          {/* Card 4: Total Working Hours & Overtime */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Total Working Time
              </span>
              <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                <Clock className="w-5 h-5" />
              </div>
            </div>
            <div>
              <span className="text-3xl font-black text-slate-900 dark:text-white">
                {summary.totalWorkingHours}
              </span>
              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <span>Avg / Day: <strong>{summary.averageWorkingHours}</strong></span>
                <span>Overtime: <strong className="text-brand-600">{summary.overtimeHours}</strong></span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Month Timesheet Table with Quick Filter Tabs */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              Monthly Attendance Portfolio ({selectedMonth})
            </h3>
            <p className="text-xs text-slate-500">
              Detailed breakdown of your daily clock-in, clock-out, late arrivals, and working hours
            </p>
          </div>

          {/* Quick Filter Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setActiveFilter('ALL')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                activeFilter === 'ALL'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All Days
            </button>
            <button
              onClick={() => setActiveFilter('LATE')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                activeFilter === 'LATE'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Late Days ({summary?.lateArrivals || 0})
            </button>
            <button
              onClick={() => setActiveFilter('ABSENT')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                activeFilter === 'ABSENT'
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Absent Days ({summary?.absentDays || 0})
            </button>
            <button
              onClick={() => setActiveFilter('PRESENT')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                activeFilter === 'PRESENT'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Present Days ({summary?.presentDays || 0})
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase tracking-wider text-[10px] font-bold">
                <th className="py-3 pl-6">Date</th>
                <th className="py-3">Day</th>
                <th className="py-3">Clock IN</th>
                <th className="py-3">Clock OUT</th>
                <th className="py-3">Working Hours</th>
                <th className="py-3">Late Arrival Status</th>
                <th className="py-3">Overtime</th>
                <th className="py-3 pr-6">Attendance Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-slate-400">
                    No records found for the "{activeFilter}" filter in {selectedMonth}.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => (
                  <tr
                    key={r.date}
                    className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${
                      r.status === 'Weekend'
                        ? 'opacity-60 bg-slate-50/30 dark:bg-slate-950/30'
                        : r.status === 'Holiday'
                        ? 'bg-blue-50/30 dark:bg-blue-950/20'
                        : r.status === 'Late'
                        ? 'bg-amber-50/30 dark:bg-amber-950/20'
                        : r.status === 'Absent'
                        ? 'bg-rose-50/30 dark:bg-rose-950/20'
                        : ''
                    }`}
                  >
                    <td className="py-3.5 pl-6 font-mono font-bold text-slate-900 dark:text-white">
                      {r.date}
                    </td>
                    <td className="py-3.5 text-slate-500 font-semibold">{r.day}</td>
                    <td className="py-3.5 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {r.inTime}
                    </td>
                    <td className="py-3.5 font-mono font-bold text-blue-600 dark:text-blue-400">
                      {r.outTime}
                    </td>
                    <td className="py-3.5 font-mono font-bold text-slate-800 dark:text-slate-200">
                      {r.workingHours}
                    </td>
                    <td className="py-3.5 font-mono font-bold">
                      {r.lateBy !== '--' ? (
                        <span className="text-amber-600 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Late (+{r.lateBy})</span>
                        </span>
                      ) : (
                        <span className="text-slate-400 font-normal">On Time</span>
                      )}
                    </td>
                    <td className="py-3.5 font-mono text-brand-600 font-bold">
                      {r.overtime !== '--' ? `+${r.overtime}` : '--'}
                    </td>
                    <td className="py-3.5 pr-6">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                          r.status === 'Present'
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                            : r.status === 'Late'
                            ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                            : r.status === 'Absent'
                            ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800'
                            : r.status === 'Half-Day'
                            ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800'
                            : r.status === 'Weekend'
                            ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
                            : 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 border-blue-200'
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Staff ID Card View & Print Modal */}
      {employee && (
        <StaffIdCardModal
          employee={employee}
          isOpen={idCardOpen}
          onClose={() => setIdCardOpen(false)}
        />
      )}

      {/* Staff Live Selfie Attendance Modal */}
      <SelfiePunchModal
        employee={employee}
        isOpen={selfieModalOpen}
        onClose={() => setSelfieModalOpen(false)}
        onSubmitted={() => fetchStaffData()}
      />
    </div>
  );
}
