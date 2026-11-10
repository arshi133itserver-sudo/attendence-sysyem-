import React, { useState, useEffect } from 'react';
import { reportApi, employeeApi } from '../services/api';
import { exportToExcel, exportMonthlyExcel, exportMonthlyPdf } from '../services/exportService';
import {
  FileSpreadsheet,
  FileText,
  Calendar,
  Users,
  Clock,
  CheckCircle,
  AlertTriangle,
  Award,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export default function MonthlyReport() {
  const [employees, setEmployees] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    employeeApi.getAll({ status: 'Active' }).then(res => {
      if (res.success && res.data.length > 0) {
        setEmployees(res.data);
        setSelectedEmployeeId(res.data[0]._id);
      }
    }).catch(() => {});
  }, []);

  const fetchMonthlyReport = async () => {
    if (!selectedEmployeeId || !selectedMonth) return;
    setLoading(true);
    try {
      const res = await reportApi.getMonthly(selectedEmployeeId, selectedMonth);
      if (res.success) {
        setReportData(res);
      }
    } catch (err) {
      console.error('Failed to fetch monthly report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonthlyReport();
  }, [selectedEmployeeId, selectedMonth]);

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

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Employee Monthly Attendance Report
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Individual timesheet, hours breakdown, overtime, and monthly attendance percentage
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleExportExcel}
            disabled={!reportData}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold transition-all shadow-sm disabled:opacity-50"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Export Excel</span>
          </button>
          <button
            onClick={handleExportPdf}
            disabled={!reportData}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-bold transition-all shadow-sm disabled:opacity-50"
          >
            <FileText className="w-4 h-4 text-rose-600" />
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      {/* Selectors Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm flex flex-col md:flex-row items-center gap-4">
        {/* Employee Selector */}
        <div className="flex-1 w-full md:w-auto">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            Select Employee:
          </label>
          <select
            value={selectedEmployeeId}
            onChange={(e) => setSelectedEmployeeId(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
          >
            {employees.map((emp) => (
              <option key={emp._id} value={emp._id}>
                {emp.fullName} ({emp.employeeId}) — {emp.department}
              </option>
            ))}
          </select>
        </div>

        {/* Month Selector */}
        <div className="w-full md:w-60">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            Select Month:
          </label>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Summary KPI Cards */}
      {reportData && reportData.summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-center">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
              Working Days
            </span>
            <span className="text-xl font-bold text-slate-900 dark:text-white">
              {reportData.summary.totalWorkingDays}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 shadow-sm text-center">
            <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 block mb-1">
              Present Days
            </span>
            <span className="text-xl font-bold text-emerald-700 dark:text-emerald-300">
              {reportData.summary.presentDays}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 shadow-sm text-center">
            <span className="text-[10px] uppercase font-bold text-rose-600 dark:text-rose-400 block mb-1">
              Absent Days
            </span>
            <span className="text-xl font-bold text-rose-700 dark:text-rose-300">
              {reportData.summary.absentDays}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 shadow-sm text-center">
            <span className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400 block mb-1">
              Late Arrivals
            </span>
            <span className="text-xl font-bold text-amber-700 dark:text-amber-300">
              {reportData.summary.lateArrivals}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60 shadow-sm text-center">
            <span className="text-[10px] uppercase font-bold text-indigo-600 dark:text-indigo-400 block mb-1">
              Total Hours
            </span>
            <span className="text-xl font-bold text-indigo-700 dark:text-indigo-300">
              {reportData.summary.totalWorkingHours}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-gradient-to-tr from-brand-600 to-emerald-500 text-white shadow-md shadow-brand-600/30 text-center">
            <span className="text-[10px] uppercase font-bold text-emerald-100 block mb-1">
              Attendance %
            </span>
            <span className="text-2xl font-black">
              {reportData.summary.attendancePercentage}%
            </span>
          </div>
        </div>
      )}

      {/* Daily Records Timesheet Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              Daily Punch Timesheet ({selectedMonth})
            </h3>
            {reportData?.employee && (
              <div className="flex items-center gap-2 mt-0.5">
                <span className="font-semibold text-xs text-slate-700 dark:text-slate-300">
                  {reportData.employee.fullName}
                </span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  reportData.employee.gender === 'Female'
                    ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                    : 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                }`}>
                  {reportData.employee.gender === 'Female' ? '👩 Female' : '👨 Male'} • {reportData.summary?.expectedWorkingHours || 8}h Shift
                </span>
                <span className="text-xs text-slate-500">
                  • {reportData.employee.designation} ({reportData.employee.department})
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-4 text-xs font-mono">
            <span className="text-slate-500">
              Avg Daily Hours:{' '}
              <strong className="text-slate-800 dark:text-white">
                {reportData?.summary?.averageWorkingHours || '0h 00m'}
              </strong>
            </span>
            <span className="text-slate-500">
              Overtime:{' '}
              <strong className="text-brand-600">
                {reportData?.summary?.overtimeHours || '0h 00m'}
              </strong>
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase tracking-wider text-[10px] font-bold">
                <th className="py-3 pl-6">Date</th>
                <th className="py-3">Day</th>
                <th className="py-3">IN Time</th>
                <th className="py-3">OUT Time</th>
                <th className="py-3">Working Hours</th>
                <th className="py-3">Late Arrival</th>
                <th className="py-3">Overtime</th>
                <th className="py-3 pr-6">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              {reportData?.dailyRecords?.map((r) => (
                <tr
                  key={r.date}
                  className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${
                    r.status === 'Weekend'
                      ? 'bg-slate-50/40 dark:bg-slate-950/40 opacity-70'
                      : r.status === 'Holiday'
                      ? 'bg-blue-50/40 dark:bg-blue-950/20'
                      : ''
                  }`}
                >
                  <td className="py-3 pl-6 font-mono font-bold text-slate-900 dark:text-white">
                    {r.date}
                  </td>
                  <td className="py-3 font-semibold text-slate-500">
                    {r.day}
                  </td>
                  <td className="py-3 font-mono font-bold">
                    <span className="text-emerald-600 dark:text-emerald-400">{r.inTime}</span>
                    {r.isEarlyIn && (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block">
                        Early (-{r.earlyBy})
                      </span>
                    )}
                    {r.lateBy !== '--' && (
                      <span className="text-[10px] text-amber-600 font-bold block">
                        Late (+{r.lateBy})
                      </span>
                    )}
                  </td>
                  <td className="py-3 font-mono font-bold">
                    <span className="text-blue-600 dark:text-blue-400">{r.outTime}</span>
                    {r.isLateExit && (
                      <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold block">
                        Late (+{r.lateExitBy})
                      </span>
                    )}
                    {r.isEarlyExit && (
                      <span className="text-[10px] text-rose-500 dark:text-rose-400 font-bold block">
                        Early (-{r.earlyExitBy})
                      </span>
                    )}
                  </td>
                  <td className="py-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                    {r.workingHours}
                  </td>
                  <td className="py-3 font-mono text-amber-600">
                    {r.lateBy}
                  </td>
                  <td className="py-3 font-mono text-brand-600 font-bold">
                    {r.overtime}
                  </td>
                  <td className="py-3 pr-6">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        r.status === 'Present'
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                          : r.status === 'Late'
                          ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                          : r.status === 'Half-Day'
                          ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800'
                          : r.status === 'Absent'
                          ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800'
                          : r.status === 'Weekend'
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
                          : 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 border-blue-200'
                      }`}
                    >
                      {r.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
