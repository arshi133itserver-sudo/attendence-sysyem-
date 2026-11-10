import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { reportApi, attendanceApi } from '../services/api';
import { exportMonthlyExcel, exportMonthlyPdf } from '../services/exportService';
import StaffIdCardModal from '../components/StaffIdCardModal';
import SelfiePunchModal from '../components/SelfiePunchModal';
import {
  Clock,
  Calendar,
  FileSpreadsheet,
  FileText,
  CreditCard,
  AlertTriangle,
  UserX,
  TrendingUp,
  CheckCircle,
  Phone,
  Mail,
  Camera,
  Heart,
  Home,
  ShieldCheck,
  Sparkles,
  MapPin,
  RefreshCw
} from 'lucide-react';

export default function StaffPortal() {
  const { user } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [reportData, setReportData] = useState(null);
  const [todayRecord, setTodayRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('ALL'); // 'ALL', 'LATE', 'ABSENT', 'PRESENT'
  const [idCardOpen, setIdCardOpen] = useState(false);
  const [selfieModalOpen, setSelfieModalOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Real-time IST clock update
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const empId = user?.employee?._id || user?.employee;

  const fetchStaffData = async (isManual = false) => {
    if (!empId) return;
    if (isManual) setRefreshing(true);
    else setLoading(true);

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
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStaffData();
  }, [empId, selectedMonth]);

  const handleExportExcel = () => {
    if (!reportData) return;
    exportMonthlyExcel(
      reportData.employee,
      selectedMonth,
      reportData.summary,
      reportData.dailyRecords
    );
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
    if (activeFilter === 'EARLY') return r.isEarlyIn;
    if (activeFilter === 'LATE') return r.lateBy !== '--' || r.status === 'Late';
    if (activeFilter === 'ABSENT') return r.status === 'Absent';
    if (activeFilter === 'PRESENT') return r.status === 'Present' || r.status === 'Late' || r.status === 'Half-Day';
    return true;
  });

  const employee = reportData?.employee || user?.employee || {};
  const summary = reportData?.summary;

  // Format Date of Birth
  const formattedDob = employee.dob
    ? new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(employee.dob))
    : null;

  // Format Joining Date
  const formattedJoiningDate = employee.joiningDate
    ? new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(employee.joiningDate))
    : null;

  const istTimeString = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  }).format(currentTime);

  const istDateString = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(currentTime);

  return (
    <div className="space-y-6 pb-8">
      {/* Top Welcome & Live IST Clock Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center font-bold">
            <Sparkles className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Namaste, {employee.fullName || user?.name || 'Staff Member'}!</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Welcome to your personal attendance portal
            </p>
          </div>
        </div>

        {/* Live IST Time Badge */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
            <Clock className="w-3.5 h-3.5 text-brand-600" />
            <span>{istTimeString}</span>
            <span className="text-slate-400">|</span>
            <span className="text-slate-500 font-medium">{istDateString}</span>
          </div>

          <button
            onClick={() => fetchStaffData(true)}
            disabled={refreshing}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
            title="Refresh Attendance Data"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-brand-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Staff Hero Profile Portfolio Card */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-950 to-brand-950 border border-brand-500/30 rounded-3xl p-5 sm:p-7 text-white shadow-xl relative overflow-hidden">
        {/* Background glow decoration */}
        <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          {/* Avatar and Essential Info */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-5 w-full lg:w-auto">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-tr from-brand-600 to-emerald-400 text-white font-black text-3xl sm:text-4xl flex items-center justify-center shadow-lg shadow-brand-500/30 overflow-hidden shrink-0 border-2 border-white/20">
              {employee.profilePhoto ? (
                <img src={employee.profilePhoto} alt="" className="w-full h-full object-cover" />
              ) : (
                (employee.fullName || user?.name || 'S').charAt(0).toUpperCase()
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30">
                  Staff Portfolio
                </span>
                <span className="text-[10px] font-mono font-bold uppercase px-2.5 py-0.5 rounded-full bg-white/10 text-emerald-300 border border-white/10">
                  ID: {employee.employeeId || 'ARS-001'}
                </span>
                {employee.bloodGroup && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                    🩸 Blood: {employee.bloodGroup}
                  </span>
                )}
              </div>

              <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight break-words">
                {employee.fullName || user?.name}
              </h1>

              <p className="text-xs sm:text-sm text-slate-300 font-semibold mt-0.5">
                {employee.designation || 'Staff'} • <span className="text-brand-300">{employee.department || 'General'}</span>
              </p>

              {/* Personal details row */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 text-xs text-slate-300">
                <span className="flex items-center gap-1.5 font-mono text-emerald-400 font-medium">
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>RFID: {employee.rfidCardUid || 'Unassigned'}</span>
                </span>
                {employee.email && (
                  <span className="flex items-center gap-1.5 text-slate-300">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>{employee.email}</span>
                  </span>
                )}
                {employee.mobileNumber && (
                  <span className="flex items-center gap-1.5 text-slate-300">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{employee.mobileNumber}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Action Buttons on Top Banner */}
          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-start lg:justify-end pt-2 lg:pt-0 border-t border-slate-800 lg:border-t-0">
            {/* Selfie Present Punch Button */}
            <button
              onClick={() => setSelfieModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white text-xs font-black transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/25 active:scale-95"
              title="Punch Attendance via Live Camera Selfie"
            >
              <Camera className="w-4 h-4" />
              <span>Selfie Punch</span>
            </button>

            {/* My ID Card Modal Trigger */}
            <button
              onClick={() => setIdCardOpen(true)}
              className="px-3.5 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-white text-xs font-bold transition-colors flex items-center gap-1.5 border border-slate-700 active:scale-95"
              title="View & Print Official Staff ID Card"
            >
              <CreditCard className="w-4 h-4 text-brand-400" />
              <span>My ID Card</span>
            </button>

            {/* Export Timesheets */}
            <button
              onClick={handleExportExcel}
              className="px-3 py-2.5 rounded-xl bg-emerald-600/80 hover:bg-emerald-600 text-white text-xs font-bold transition-colors flex items-center gap-1.5 active:scale-95"
              title="Download Monthly Timesheet in Excel format"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span className="hidden sm:inline">Excel</span>
            </button>
            <button
              onClick={handleExportPdf}
              className="px-3 py-2.5 rounded-xl bg-rose-600/80 hover:bg-rose-600 text-white text-xs font-bold transition-colors flex items-center gap-1.5 active:scale-95"
              title="Download Monthly Timesheet in PDF format"
            >
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">PDF</span>
            </button>
          </div>
        </div>

        {/* Extended Employee Profile Details (DOB, Blood Group, Address, Emergency Contact) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-slate-800/80 text-xs">
          <div className="bg-slate-800/50 rounded-xl p-2.5 border border-slate-700/50">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
              🩸 Blood Group
            </span>
            <span className="font-bold text-red-400">
              {employee.bloodGroup || 'Not specified'}
            </span>
          </div>

          <div className="bg-slate-800/50 rounded-xl p-2.5 border border-slate-700/50">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
              🎂 Date of Birth
            </span>
            <span className="font-medium text-slate-200">
              {formattedDob || 'Not specified'}
            </span>
          </div>

          <div className="bg-slate-800/50 rounded-xl p-2.5 border border-slate-700/50">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
              🚨 Emergency Contact
            </span>
            <span className="font-mono font-medium text-amber-300">
              {employee.emergencyContact || 'Not specified'}
            </span>
          </div>

          <div className="bg-slate-800/50 rounded-xl p-2.5 border border-slate-700/50">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
              📅 Date of Joining
            </span>
            <span className="font-medium text-slate-200">
              {formattedJoiningDate || 'Active'}
            </span>
          </div>
        </div>

        {employee.address && (
          <div className="mt-3 flex items-center gap-2 text-xs text-slate-300 bg-slate-800/30 px-3 py-2 rounded-xl border border-slate-700/40">
            <MapPin className="w-3.5 h-3.5 text-brand-400 shrink-0" />
            <span className="truncate">
              <strong>Address:</strong> {employee.address}
            </span>
          </div>
        )}
      </div>

      {/* Today's Real-Time Attendance Status Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-brand-600" />
              <span>Today's Attendance Status</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Real-time gate punch status for today ({istDateString})
            </p>
          </div>

          {/* Today Status Pill */}
          {todayRecord && todayRecord.isWorkingNow ? (
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold shadow-sm">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Currently Working Now (Clocked IN at {new Date(todayRecord.firstInTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })})</span>
            </div>
          ) : todayRecord && todayRecord.lastOutTime ? (
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-blue-600 dark:text-blue-400 text-xs font-bold">
              <CheckCircle className="w-4 h-4 text-blue-500" />
              <span>Shift Completed Today ({todayRecord.totalWorkingHoursFormatted} recorded)</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-bold">
              <Clock className="w-4 h-4 text-amber-500" />
              <span>Not Clocked IN Yet Today</span>
            </div>
          )}
        </div>

        {/* 3 Metrics: Clock IN, Clock OUT, Working Hours */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
              Clock IN (पहला प्रवेश)
            </span>
            <span className="text-lg sm:text-xl font-mono font-extrabold text-emerald-600 dark:text-emerald-400">
              {todayRecord?.firstInTime
                ? new Date(todayRecord.firstInTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                : '--:--'}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
              Clock OUT (अंतिम प्रस्थान)
            </span>
            <span className="text-lg sm:text-xl font-mono font-extrabold text-blue-600 dark:text-blue-400">
              {todayRecord?.lastOutTime
                ? new Date(todayRecord.lastOutTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                : '--:--'}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
              Today Total Hours (कुल कार्य समय)
            </span>
            <span className="text-lg sm:text-xl font-mono font-extrabold text-slate-900 dark:text-white">
              {todayRecord?.totalWorkingHoursFormatted || '0h 00m'}
            </span>
          </div>
        </div>
      </div>

      {/* Monthly Performance KPI Metric Cards */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Card 1: Attendance Percentage */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Monthly %
              </span>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                  {summary.attendancePercentage}%
                </span>
                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hidden sm:inline">
                  {summary.attendancePercentage >= 90
                    ? 'Excellent'
                    : summary.attendancePercentage >= 75
                    ? 'Good'
                    : 'Average'}
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 mt-2.5 overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-700"
                  style={{ width: `${summary.attendancePercentage}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 font-medium">
                {summary.presentDays} present / {summary.totalWorkingDays} days
              </p>
            </div>
          </div>

          {/* Card 2: Late Arrivals */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Late Days
              </span>
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400">
                  {summary.lateArrivals}
                </span>
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                  {summary.lateArrivals === 1 ? 'Day' : 'Days'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                Punched after 10:15 AM
              </p>
              <button
                onClick={() => setActiveFilter(activeFilter === 'LATE' ? 'ALL' : 'LATE')}
                className="mt-1 text-[11px] font-bold text-amber-600 hover:text-amber-700 underline"
              >
                {activeFilter === 'LATE' ? 'Clear filter' : 'Filter late days ↓'}
              </button>
            </div>
          </div>

          {/* Card 3: Absent Days */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Absent Days
              </span>
              <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                <UserX className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400">
                  {summary.absentDays}
                </span>
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                  {summary.absentDays === 1 ? 'Day' : 'Days'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                {summary.halfDays > 0 ? `${summary.halfDays} Half-day` : 'Excludes holidays'}
              </p>
              <button
                onClick={() => setActiveFilter(activeFilter === 'ABSENT' ? 'ALL' : 'ABSENT')}
                className="mt-1 text-[11px] font-bold text-rose-600 hover:text-rose-700 underline"
              >
                {activeFilter === 'ABSENT' ? 'Clear filter' : 'Filter absent ↓'}
              </button>
            </div>
          </div>

          {/* Card 4: Total Working Time */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Total Hours
              </span>
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div>
              <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                {summary.totalWorkingHours}
              </span>
              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <span>Avg: <strong>{summary.averageWorkingHours}</strong></span>
                <span>OT: <strong className="text-brand-600">{summary.overtimeHours}</strong></span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Monthly Timesheet Section (with Month Selector & Filter Tabs) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
        {/* Header with Month Input and Filter Tabs */}
        <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base sm:text-lg">
                Daily Attendance Timesheet
              </h3>
              <p className="text-xs text-slate-500">
                Personal daily clock-in, clock-out, and working hours record
              </p>
            </div>

            {/* Month Selector */}
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none"
            />
          </div>

          {/* Quick Filter Tabs (Scrollable on mobile) */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl overflow-x-auto max-w-full">
            <button
              onClick={() => setActiveFilter('ALL')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                activeFilter === 'ALL'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All Days
            </button>
            <button
              onClick={() => setActiveFilter('PRESENT')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                activeFilter === 'PRESENT'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Present ({summary?.presentDays || 0})
            </button>
            <button
              onClick={() => setActiveFilter('EARLY')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                activeFilter === 'EARLY'
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Early ({summary?.earlyArrivals || 0})
            </button>
            <button
              onClick={() => setActiveFilter('LATE')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                activeFilter === 'LATE'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Late ({summary?.lateArrivals || 0})
            </button>
            <button
              onClick={() => setActiveFilter('ABSENT')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                activeFilter === 'ABSENT'
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Absent ({summary?.absentDays || 0})
            </button>
          </div>
        </div>

        {/* 1. Mobile Cards View (shown on screens < 768px) */}
        <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
          {filteredRecords.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No attendance records found for this filter in {selectedMonth}.
            </div>
          ) : (
            filteredRecords.map((r) => (
              <div
                key={r.date}
                className={`p-4 transition-colors ${
                  r.status === 'Weekend'
                    ? 'opacity-60 bg-slate-50/40 dark:bg-slate-950/40'
                    : r.status === 'Holiday'
                    ? 'bg-blue-50/30 dark:bg-blue-950/20'
                    : r.status === 'Late'
                    ? 'bg-amber-50/30 dark:bg-amber-950/20'
                    : r.status === 'Absent'
                    ? 'bg-rose-50/30 dark:bg-rose-950/20'
                    : ''
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-900 dark:text-white text-xs">
                      {r.date}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500">
                      ({r.day})
                    </span>
                  </div>

                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
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
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs bg-white dark:bg-slate-800/80 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      IN
                    </span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {r.inTime}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      OUT
                    </span>
                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                      {r.outTime}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Duration
                    </span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {r.workingHours}
                    </span>
                  </div>
                </div>

                {r.isEarlyIn && (
                  <div className="mt-1.5 flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Early by {r.earlyBy}</span>
                  </div>
                )}

                {r.lateBy !== '--' && (
                  <div className="mt-1.5 flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Late by {r.lateBy}</span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* 2. Desktop Table View (shown on md+ screens) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase tracking-wider text-[10px] font-bold">
                <th className="py-3 pl-6">Date</th>
                <th className="py-3">Day</th>
                <th className="py-3">Clock IN</th>
                <th className="py-3">Clock OUT</th>
                <th className="py-3">Working Hours</th>
                <th className="py-3">Arrival Status</th>
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
                      {r.isEarlyIn ? (
                        <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Early (-{r.earlyBy})</span>
                        </span>
                      ) : r.lateBy !== '--' ? (
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
        onSubmitted={() => fetchStaffData(true)}
      />
    </div>
  );
}
