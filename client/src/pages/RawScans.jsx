import React, { useState, useEffect } from 'react';
import { rfidApi } from '../services/api';
import {
  Cpu,
  Search,
  Filter,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  Radio,
  RefreshCw
} from 'lucide-react';

export default function RawScans() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [cardUidSearch, setCardUidSearch] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await rfidApi.getRawLogs({
        status: statusFilter || undefined,
        cardUid: cardUidSearch || undefined,
        limit: 100
      });
      if (res.success) {
        setLogs(res.data);
      }
    } catch (err) {
      console.error('Failed to load raw scan logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [statusFilter, cardUidSearch]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Raw RFID Scan Events & Hardware Audit
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Immutable log of every scan received from ESP32 readers, debounce rejects, and invalid cards
          </p>
        </div>

        <button
          onClick={fetchLogs}
          className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs font-bold shadow-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-all self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Scan Logs</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
          <input
            type="text"
            placeholder="Search by RFID Card UID..."
            value={cardUidSearch}
            onChange={(e) => setCardUidSearch(e.target.value.toUpperCase())}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs font-mono uppercase text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-brand-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-xs font-bold text-slate-500 uppercase">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="SUCCESS">SUCCESS (IN / OUT)</option>
            <option value="DUPLICATE_DEBOUNCED">DUPLICATE_DEBOUNCED</option>
            <option value="UNKNOWN_CARD">UNKNOWN_CARD</option>
            <option value="INACTIVE_CARD">INACTIVE_CARD</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase tracking-wider text-[10px] font-bold">
                <th className="py-3.5 pl-6">Timestamp</th>
                <th className="py-3.5">Device ID</th>
                <th className="py-3.5">Card UID</th>
                <th className="py-3.5">Employee</th>
                <th className="py-3.5">Scan Type</th>
                <th className="py-3.5">Status</th>
                <th className="py-3.5 pr-6">Audit Message</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-400">
                    No raw scan logs found.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 pl-6 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString('en-US')}
                    </td>
                    <td className="py-3.5">
                      <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[11px] font-bold">
                        {log.deviceId}
                      </span>
                    </td>
                    <td className="py-3.5 font-mono font-bold text-brand-600 dark:text-brand-400">
                      {log.cardUid}
                    </td>
                    <td className="py-3.5">
                      {log.employee ? (
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">
                            {log.employee.fullName}
                          </p>
                          <p className="text-[10px] text-slate-500 font-mono">
                            {log.employee.employeeId} • {log.employee.department}
                          </p>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">Unregistered Card</span>
                      )}
                    </td>
                    <td className="py-3.5 font-bold">
                      <span
                        className={
                          log.scanType === 'IN'
                            ? 'text-emerald-600'
                            : log.scanType === 'OUT'
                            ? 'text-blue-600'
                            : 'text-rose-500'
                        }
                      >
                        {log.scanType}
                      </span>
                    </td>
                    <td className="py-3.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          log.status === 'SUCCESS'
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                            : log.status === 'DUPLICATE_DEBOUNCED'
                            ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                            : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800'
                        }`}
                      >
                        {log.status === 'SUCCESS' ? (
                          <CheckCircle className="w-3 h-3" />
                        ) : log.status === 'DUPLICATE_DEBOUNCED' ? (
                          <AlertTriangle className="w-3 h-3" />
                        ) : (
                          <XCircle className="w-3 h-3" />
                        )}
                        <span>{log.status}</span>
                      </span>
                    </td>
                    <td className="py-3.5 pr-6 text-slate-500 dark:text-slate-400 text-xs">
                      {log.message}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
