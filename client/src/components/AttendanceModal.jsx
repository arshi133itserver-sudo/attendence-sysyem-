import React, { useState, useEffect } from 'react';
import { attendanceApi, employeeApi } from '../services/api';
import { X, Clock, AlertCircle, CheckCircle2, Calendar } from 'lucide-react';

function toLocalTimeString(dateInput) {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function calculateWorkingHoursDisplay(inStr, outStr) {
  if (!inStr || !outStr) return null;
  const [inH, inM] = inStr.split(':').map(Number);
  let [outH, outM] = outStr.split(':').map(Number);

  // If out is earlier than or equal to in (e.g. in: 10:00, out: 06:00 -> 6:00 PM = 18:00)
  if (outH < inH || (outH === inH && outM <= inM)) {
    if (outH + 12 < 24) {
      outH += 12;
    }
  }

  const inMinutes = inH * 60 + inM;
  const outMinutes = outH * 60 + outM;
  const diff = outMinutes - inMinutes;

  if (diff <= 0) return '0h 00m';
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  return `${h}h ${m < 10 ? '0' : ''}${m}m`;
}

export default function AttendanceModal({ isOpen, onClose, recordToEdit, onSaved }) {
  const [employees, setEmployees] = useState([]);
  const [mode, setMode] = useState('manual'); // 'manual' or 'correct'
  const [manualType, setManualType] = useState('FULL_DAY'); // 'FULL_DAY', 'IN', 'OUT'
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  
  // Single punch time
  const [punchTime, setPunchTime] = useState('10:00');

  // Full shift or correction times
  const [inTimeStr, setInTimeStr] = useState('10:00');
  const [outTimeStr, setOutTimeStr] = useState('18:00');
  const [status, setStatus] = useState('Present');
  const [reason, setReason] = useState('Manual full day attendance recorded by Admin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setError('');
      employeeApi.getAll({ status: 'Active' }).then(res => {
        if (res.success && res.data) {
          setEmployees(res.data);
          if (!selectedEmployeeId && res.data.length > 0) {
            setSelectedEmployeeId(res.data[0]._id);
          }
        }
      }).catch(() => {});

      if (recordToEdit) {
        setMode('correct');
        const empId = recordToEdit.employee?._id || recordToEdit.employeeDbId || recordToEdit._id || recordToEdit.employeeId;
        setSelectedEmployeeId(empId);
        setDate(recordToEdit.date || new Date().toISOString().split('T')[0]);
        setStatus(recordToEdit.status || 'Present');

        if (recordToEdit.sessions && recordToEdit.sessions.length > 0) {
          const first = recordToEdit.sessions[0];
          setInTimeStr(toLocalTimeString(first.inTime) || '10:00');
          setOutTimeStr(toLocalTimeString(first.outTime) || '18:00');
        } else if (recordToEdit.firstInRaw || recordToEdit.firstInTime) {
          setInTimeStr(toLocalTimeString(recordToEdit.firstInRaw || recordToEdit.firstInTime) || '10:00');
          setOutTimeStr(toLocalTimeString(recordToEdit.lastOutRaw || recordToEdit.lastOutTime) || '18:00');
        } else {
          setInTimeStr('10:00');
          setOutTimeStr('18:00');
        }
        setReason('Admin manual correction');
      } else {
        setMode('manual');
        setManualType('FULL_DAY');
        setInTimeStr('10:00');
        setOutTimeStr('18:00');
        setPunchTime('10:00');
        setReason('Manual attendance recorded by Admin');
      }
    }
  }, [isOpen, recordToEdit]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Audit reason is required.');
      return;
    }

    if (!selectedEmployeeId) {
      setError('Please select an employee.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (mode === 'manual') {
        if (manualType === 'FULL_DAY') {
          // Send full day entry
          await attendanceApi.manualEntry({
            employeeId: selectedEmployeeId,
            date,
            type: 'FULL_DAY',
            inTime: new Date(`${date}T${inTimeStr}:00`),
            outTime: new Date(`${date}T${outTimeStr}:00`),
            reason
          });
        } else {
          const fullTimestamp = new Date(`${date}T${punchTime}:00`);
          await attendanceApi.manualEntry({
            employeeId: selectedEmployeeId,
            date,
            type: manualType,
            timestamp: fullTimestamp,
            reason
          });
        }
      } else {
        // Correction workflow
        const sessions = [];
        if (inTimeStr) {
          sessions.push({
            inTime: new Date(`${date}T${inTimeStr}:00`),
            outTime: outTimeStr ? new Date(`${date}T${outTimeStr}:00`) : null,
            inDeviceId: 'ADMIN_CORRECTION',
            outDeviceId: 'ADMIN_CORRECTION'
          });
        }

        await attendanceApi.correctAttendance({
          attendanceId: recordToEdit?._id || recordToEdit?.attendanceId,
          employeeId: selectedEmployeeId,
          date,
          sessions,
          status,
          reason
        });
      }

      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      setError(err.message || 'Operation failed.');
    } finally {
      setLoading(false);
    }
  };

  const calculatedHours = (mode === 'manual' && manualType === 'FULL_DAY') || mode === 'correct'
    ? calculateWorkingHoursDisplay(inTimeStr, outTimeStr)
    : null;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                {mode === 'manual' ? 'Manual Attendance Entry' : 'Admin Attendance Correction'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {mode === 'manual' ? 'Record full shift or punch on behalf of staff' : 'Edit timings and recalculate working hours'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Employee Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Employee
            </label>
            <select
              disabled={mode === 'correct'}
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none"
            >
              <option value="">Select Employee...</option>
              {employees.map((emp) => (
                <option key={emp._id} value={emp._id}>
                  {emp.fullName} ({emp.employeeId}) - {emp.department}
                </option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>

          {mode === 'manual' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Entry Mode
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setManualType('FULL_DAY')}
                  className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all text-center ${
                    manualType === 'FULL_DAY'
                      ? 'bg-brand-600 text-white border-brand-600 shadow-md shadow-brand-600/20'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  Full Shift (IN + OUT)
                </button>
                <button
                  type="button"
                  onClick={() => setManualType('IN')}
                  className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all text-center ${
                    manualType === 'IN'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  Clock IN Only
                </button>
                <button
                  type="button"
                  onClick={() => setManualType('OUT')}
                  className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all text-center ${
                    manualType === 'OUT'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/20'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  Clock OUT Only
                </button>
              </div>
            </div>
          )}

          {/* Time pickers based on mode */}
          {(mode === 'correct' || (mode === 'manual' && manualType === 'FULL_DAY')) ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    IN Time
                  </label>
                  <input
                    type="time"
                    value={inTimeStr}
                    onChange={(e) => setInTimeStr(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    OUT Time
                  </label>
                  <input
                    type="time"
                    value={outTimeStr}
                    onChange={(e) => setOutTimeStr(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  />
                </div>
              </div>

              {calculatedHours && (
                <div className="p-3 rounded-xl bg-brand-50 dark:bg-brand-950/40 border border-brand-200 dark:border-brand-800/60 flex items-center justify-between text-xs">
                  <span className="font-semibold text-brand-700 dark:text-brand-300">
                    ⏱️ Calculated Working Hours:
                  </span>
                  <span className="font-mono font-bold text-brand-800 dark:text-brand-200 text-sm">
                    {calculatedHours}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                {manualType === 'IN' ? 'Punch IN Time' : 'Punch OUT Time'}
              </label>
              <input
                type="time"
                value={punchTime}
                onChange={(e) => setPunchTime(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>
          )}

          {mode === 'correct' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Attendance Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none"
              >
                <option value="Present">Present</option>
                <option value="Late">Late</option>
                <option value="Half-Day">Half-Day</option>
                <option value="Absent">Absent</option>
              </select>
            </div>
          )}

          {/* Reason for Audit Log */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Reason / Justification <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows="2"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Employee forgot RFID card, Gate reader sync, Shift adjustment..."
              required
              className="w-full px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>

          {/* Submit */}
          <div className="pt-2 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md shadow-brand-600/30 transition-all disabled:opacity-50 flex items-center gap-1.5"
            >
              {loading ? 'Saving...' : mode === 'manual' ? 'Save Attendance' : 'Update Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
