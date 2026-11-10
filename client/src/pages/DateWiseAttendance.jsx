import React, { useState, useEffect } from 'react';
import { reportApi, attendanceApi } from '../services/api';
import { exportToExcel, exportDateWiseExcel, exportDateWisePdf } from '../services/exportService';
import AttendanceModal from '../components/AttendanceModal';
import {
  Calendar,
  Search,
  Filter,
  FileSpreadsheet,
  FileText,
  Clock,
  RefreshCw,
  Edit,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Coffee
} from 'lucide-react';

export default function DateWiseAttendance() {
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  const [department, setDepartment] = useState('All');
  const [search, setSearch] = useState('');
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchRecords = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await reportApi.getDateWise(selectedDate, department, search);
      if (res.success && Array.isArray(res.data)) {
        setRecords(res.data);
      } else {
        setErrorMsg(res.message || 'Failed to load date report.');
      }
    } catch (err) {
      console.error('Failed to load date report:', err);
      setErrorMsg(err.message || 'Error connecting to server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [selectedDate, department, search]);

  const handleExportExcel = () => {
    exportDateWiseExcel(records, selectedDate, department);
  };

  const handleExportPdf = () => {
    exportDateWisePdf(records, selectedDate, department);
  };

  const handleEditRecord = (rec) => {
    setSelectedRecord({
      ...rec,
      _id: rec._id || rec.attendanceId,
      attendanceId: rec._id || rec.attendanceId,
      employee: {
        _id: rec.employeeDbId || rec._id,
        fullName: rec.fullName,
        employeeId: rec.employeeId,
        department: rec.department
      },
      employeeDbId: rec.employeeDbId || rec._id,
      employeeId: rec.employeeDbId || rec._id,
      date: selectedDate
    });
    setIsModalOpen(true);
  };

  const handleOpenManualEntry = () => {
    setSelectedRecord(null);
    setIsModalOpen(true);
  };

  const dynamicDepts = Array.from(new Set(records.map(r => r.department).filter(Boolean)));
  const departmentsList = ['All', ...dynamicDepts];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Date-Wise Attendance Report
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Audit daily punch timings, multi-session hours, breaks, and compliance
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <button
            onClick={handleOpenManualEntry}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold transition-all shadow-md shadow-brand-600/30"
          >
            <Clock className="w-4 h-4" />
            <span>+ Manual Entry</span>
          </button>
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold transition-all shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Export Excel</span>
          </button>
          <button
            onClick={handleExportPdf}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-bold transition-all shadow-sm"
          >
            <FileText className="w-4 h-4 text-rose-600" />
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      {/* Date, Department & Search Controls */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm flex flex-col md:flex-row items-center gap-4 justify-between">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Date Picker */}
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/60 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700">
            <Calendar className="w-4 h-4 text-brand-600 shrink-0" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-900 dark:text-white focus:outline-none"
            />
          </div>

          {/* Department Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase">Dept:</span>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none"
            >
              {departmentsList.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
          <input
            type="text"
            placeholder="Search employee name or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Date-Wise Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase tracking-wider text-[10px] font-bold">
                <th className="py-3.5 pl-6">Employee</th>
                <th className="py-3.5">Department</th>
                <th className="py-3.5">Date</th>
                <th className="py-3.5">IN</th>
                <th className="py-3.5">OUT</th>
                <th className="py-3.5">Working Hours</th>
                <th className="py-3.5">Break</th>
                <th className="py-3.5">Late / Early</th>
                <th className="py-3.5">Status</th>
                <th className="py-3.5 pr-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              {loading ? (
                <tr>
                  <td colSpan="10" className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-5 h-5 animate-spin text-brand-600" />
                      <span className="text-xs font-medium">Loading attendance records for {selectedDate}...</span>
                    </div>
                  </td>
                </tr>
              ) : errorMsg ? (
                <tr>
                  <td colSpan="10" className="py-8 text-center text-rose-500 text-xs">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-rose-500" />
                      <span>{errorMsg}</span>
                      <button
                        onClick={fetchRecords}
                        className="px-3 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 border border-rose-200 dark:border-rose-800 text-xs font-bold hover:bg-rose-100"
                      >
                        Retry
                      </button>
                    </div>
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan="10" className="py-8 text-center text-slate-400">
                    No attendance records for date {selectedDate}.
                  </td>
                </tr>
              ) : (
                records.map((row) => (
                  <tr key={row.employeeId} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 pl-6">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="font-bold text-slate-900 dark:text-white">
                            {row.fullName}
                          </p>
                          {row.gender === 'Female' ? (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                              👩 F
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                              👨 M
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500 font-mono">
                          {row.employeeId} • {row.designation}
                        </p>
                      </div>
                    </td>
                    <td className="py-3.5 text-slate-700 dark:text-slate-300 font-semibold">
                      {row.department}
                    </td>
                    <td className="py-3.5 font-mono text-slate-600 dark:text-slate-400">
                      {row.date}
                    </td>
                    <td className="py-3.5 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {row.inTime}
                    </td>
                    <td className="py-3.5 font-mono font-bold text-blue-600 dark:text-blue-400">
                      {row.outTime}
                    </td>
                    <td className="py-3.5">
                      <span className="font-mono font-bold px-2 py-0.5 rounded bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-800 text-xs">
                        {row.totalWorkingHours}
                      </span>
                    </td>
                    <td className="py-3.5 font-mono text-slate-600 dark:text-slate-400 flex items-center gap-1">
                      <Coffee className="w-3 h-3 text-slate-400" />
                      <span>{row.breakDuration}</span>
                    </td>
                    <td className="py-3.5 space-y-0.5">
                      {row.isEarlyIn === 'Yes' && (
                        <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3 text-emerald-500 shrink-0" />
                          <span>Early (-{row.earlyInBy})</span>
                        </div>
                      )}
                      {row.isLate === 'Yes' && (
                        <div className="text-[10px] font-bold text-amber-600 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
                          <span>Late (+{row.lateBy})</span>
                        </div>
                      )}
                      {row.isEarlyExit === 'Yes' && (
                        <div className="text-[10px] font-bold text-rose-500 dark:text-rose-400 flex items-center gap-1">
                          <span>Early Exit (-{row.earlyExitBy})</span>
                        </div>
                      )}
                      {row.isLateExit === 'Yes' && (
                        <div className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                          <span>Late Exit (+{row.lateExitBy})</span>
                        </div>
                      )}
                      {row.isLate === 'No' && row.isEarlyIn === 'No' && row.isEarlyExit === 'No' && row.isLateExit === 'No' && row.status !== 'Absent' && (
                        <span className="text-[10px] text-slate-400 font-medium">On Time</span>
                      )}
                      {row.status === 'Absent' && (
                        <span className="text-[10px] text-slate-400">--</span>
                      )}
                    </td>
                    <td className="py-3.5">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                          row.status === 'Present'
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                            : row.status === 'Late'
                            ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                            : row.status === 'Half-Day'
                            ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800'
                            : row.status === 'Holiday'
                            ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800'
                            : row.status === 'Weekend'
                            ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800'
                            : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800'
                        }`}
                      >
                        {row.status === 'Holiday' ? '🏖️ Holiday' : row.status === 'Weekend' ? '📅 Sunday Off' : row.status}
                      </span>
                    </td>
                    <td className="py-3.5 pr-6 text-right">
                      <button
                        onClick={() => handleEditRecord(row)}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Adjust Attendance Record"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Attendance Edit Modal */}
      <AttendanceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        recordToEdit={selectedRecord}
        onSaved={fetchRecords}
      />
    </div>
  );
}
