import React, { useState, useEffect } from 'react';
import { settingsApi, zktecoApi } from '../services/api';
import {
  Settings as SettingsIcon,
  Clock,
  Shield,
  Calendar,
  Building,
  Save,
  CheckCircle,
  Plus,
  Trash2,
  Key,
  Cpu,
  UserCheck,
  Users,
  Fingerprint,
  RefreshCw,
  FileUp,
  Wifi,
  Server,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

export default function Settings() {
  const [settings, setSettings] = useState({
    companyName: 'Arshi Enterprises',
    officeStartTime: '09:00',
    officeEndTime: '18:00',
    gracePeriodMinutes: 15,
    expectedWorkingHours: 8,
    halfDayThresholdHours: 4,
    overtimeThresholdHours: 8.5,
    // Male duty hour settings
    maleExpectedWorkingHours: 8,
    maleOfficeStartTime: '09:00',
    maleOfficeEndTime: '18:00',
    maleHalfDayThresholdHours: 4,
    maleOvertimeThresholdHours: 8.5,
    // Female duty hour settings
    femaleExpectedWorkingHours: 7,
    femaleOfficeStartTime: '09:30',
    femaleOfficeEndTime: '17:30',
    femaleHalfDayThresholdHours: 3.5,
    femaleOvertimeThresholdHours: 7.5,
    weeklyHolidays: [0], // 0 = Sunday
    scanCooldownSeconds: 60,
    breakDurationMinutes: 60,
    rfidApiKey: 'ARSHI_RFID_SECRET_KEY_2026',
    // ZKTeco MB360 Biometric Settings
    zktecoIp: '192.168.1.201',
    zktecoPort: 4370,
    zktecoCommKey: 0,
    zktecoAutoSync: false,
    zktecoLastSyncTime: null
  });

  const [holidays, setHolidays] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [newHoliday, setNewHoliday] = useState({ name: '', date: '', type: 'Company' });
  const [saving, setSaving] = useState(false);
  const [holidayLoading, setHolidayLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const loadSettings = async () => {
    try {
      const res = await settingsApi.getSettings();
      if (res.success && res.data) {
        if (res.data.settings) {
          setSettings(prev => ({
            ...prev,
            ...res.data.settings,
            maleExpectedWorkingHours: res.data.settings.maleExpectedWorkingHours ?? res.data.settings.expectedWorkingHours ?? 8,
            maleOfficeStartTime: res.data.settings.maleOfficeStartTime || res.data.settings.officeStartTime || '09:00',
            maleOfficeEndTime: res.data.settings.maleOfficeEndTime || res.data.settings.officeEndTime || '18:00',
            maleHalfDayThresholdHours: res.data.settings.maleHalfDayThresholdHours ?? 4,
            maleOvertimeThresholdHours: res.data.settings.maleOvertimeThresholdHours ?? 8.5,
            femaleExpectedWorkingHours: res.data.settings.femaleExpectedWorkingHours ?? 7,
            femaleOfficeStartTime: res.data.settings.femaleOfficeStartTime || '09:30',
            femaleOfficeEndTime: res.data.settings.femaleOfficeEndTime || '17:30',
            femaleHalfDayThresholdHours: res.data.settings.femaleHalfDayThresholdHours ?? 3.5,
            femaleOvertimeThresholdHours: res.data.settings.femaleOvertimeThresholdHours ?? 7.5
          }));
        }
        if (res.data.holidays) setHolidays(res.data.holidays);
        if (res.data.departments) setDepartments(res.data.departments);
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (type === 'number' ? (value === '' ? '' : Number(value)) : value)
    }));
  };

  const [testingZk, setTestingZk] = useState(false);
  const [syncingZk, setSyncingZk] = useState(false);
  const [uploadingLog, setUploadingLog] = useState(false);
  const [zkStatus, setZkStatus] = useState(null);

  const handleTestZk = async () => {
    setTestingZk(true);
    setZkStatus(null);
    try {
      const res = await zktecoApi.testConnection({
        ip: settings.zktecoIp,
        port: settings.zktecoPort
      });
      if (res.success) {
        setZkStatus({
          type: 'success',
          text: `Online! Connected to MB360 at ${settings.zktecoIp}:${settings.zktecoPort || 4370}.`
        });
      } else {
        setZkStatus({
          type: 'error',
          text: res.message || 'Cannot connect to ZKTeco device. Verify IP & LAN/Wi-Fi connection.'
        });
      }
    } catch (err) {
      setZkStatus({
        type: 'error',
        text: err.message || 'Failed to connect to ZKTeco terminal.'
      });
    } finally {
      setTestingZk(false);
    }
  };

  const handleSyncZk = async () => {
    setSyncingZk(true);
    setZkStatus(null);
    try {
      const res = await zktecoApi.syncLogs({
        ip: settings.zktecoIp,
        port: settings.zktecoPort
      });
      if (res.success) {
        setZkStatus({
          type: 'success',
          text: `Sync Complete! Synced ${res.syncedCount} punches from MB360 (${res.totalDeviceRecords || 0} logs found, ${res.unknownCount || 0} unmapped).`
        });
        setSettings(prev => ({ ...prev, zktecoLastSyncTime: res.lastSyncTime }));
      } else {
        setZkStatus({
          type: 'error',
          text: res.message || 'Sync failed. Make sure device is powered ON and reachable.'
        });
      }
    } catch (err) {
      setZkStatus({
        type: 'error',
        text: err.message || 'Sync operation failed.'
      });
    } finally {
      setSyncingZk(false);
    }
  };

  const handleUploadAttlog = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setUploadingLog(true);
    setZkStatus(null);
    try {
      const text = await file.text();
      const res = await zktecoApi.uploadLogFile(text);
      if (res.success) {
        setZkStatus({
          type: 'success',
          text: `USB File Imported! Synced ${res.syncedCount} punches from ${file.name} (${res.totalLines} lines, ${res.unknownCount} unmapped).`
        });
      } else {
        setZkStatus({
          type: 'error',
          text: res.message || 'Failed to process attlog.dat file.'
        });
      }
    } catch (err) {
      setZkStatus({
        type: 'error',
        text: err.message || 'Failed to read USB file.'
      });
    } finally {
      setUploadingLog(false);
      e.target.value = '';
    }
  };

  const handleWeeklyHolidayToggle = (dayIndex) => {
    setSettings((prev) => {
      const current = prev.weeklyHolidays || [];
      const updated = current.includes(dayIndex)
        ? current.filter((d) => d !== dayIndex)
        : [...current, dayIndex];
      return { ...prev, weeklyHolidays: updated };
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      await settingsApi.updateSettings(settings);
      setSuccessMsg('Attendance settings & gender duty hours saved successfully!');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddHoliday = async (e) => {
    e.preventDefault();
    if (!newHoliday.name || !newHoliday.date) return;
    setHolidayLoading(true);
    setErrorMsg('');
    try {
      const res = await settingsApi.addHoliday(newHoliday);
      setNewHoliday({ name: '', date: '', type: 'Company' });
      setSuccessMsg(res.message || 'Holiday saved successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
      loadSettings();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to save holiday.');
    } finally {
      setHolidayLoading(false);
    }
  };

  const handleDeleteHoliday = async (holiday) => {
    if (!window.confirm(`Are you sure you want to delete holiday "${holiday.name}" (${holiday.date})?`)) {
      return;
    }
    // Optimistically update list
    setHolidays(prev => prev.filter(h => h._id !== holiday._id && h.date !== holiday.date));
    try {
      await settingsApi.deleteHoliday(holiday._id || holiday.date);
      setSuccessMsg(`Holiday "${holiday.name}" deleted. You can re-add this date anytime.`);
      setTimeout(() => setSuccessMsg(''), 3000);
      loadSettings();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to delete holiday.');
      loadSettings();
    }
  };

  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Attendance Rules & Gender Duty Hours
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Customize duty hours for Male and Female staff, shifts, grace periods, and holiday calendar
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-lg shadow-brand-600/30 transition-all self-start sm:self-auto disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Saving...' : 'Save Settings'}</span>
        </button>
      </div>

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-2 animate-fade-in shadow-sm">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs font-bold flex items-center gap-2 animate-fade-in shadow-sm">
          <Shield className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Settings Form */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* GENDER DUTY HOURS CUSTOMIZATION */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* MALE STAFF POLICY */}
          <div className="bg-white dark:bg-slate-900 border-2 border-blue-200 dark:border-blue-900/60 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-blue-100 dark:border-blue-900/40">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold text-lg">
                  👨
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    Male Staff Duty Hours
                  </h3>
                  <p className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold">
                    Policy for Male Employees
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-mono font-bold text-xs border border-blue-200 dark:border-blue-800">
                {settings.maleExpectedWorkingHours}h Shift
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div className="col-span-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Expected Working Hours / Day
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.5"
                    name="maleExpectedWorkingHours"
                    value={settings.maleExpectedWorkingHours}
                    onChange={handleChange}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <span className="absolute right-3.5 top-2.5 text-xs text-slate-400 font-bold">Hours</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Full-day compliance requirement for males (e.g. 8.0 hrs)</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Office Start Time (IN)
                </label>
                <input
                  type="time"
                  name="maleOfficeStartTime"
                  value={settings.maleOfficeStartTime}
                  onChange={handleChange}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Office End Time (OUT)
                </label>
                <input
                  type="time"
                  name="maleOfficeEndTime"
                  value={settings.maleOfficeEndTime}
                  onChange={handleChange}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Half-Day Threshold
                </label>
                <input
                  type="number"
                  step="0.5"
                  name="maleHalfDayThresholdHours"
                  value={settings.maleHalfDayThresholdHours}
                  onChange={handleChange}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <p className="text-[10px] text-slate-400 mt-1">Under this = Half-Day</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Overtime Threshold
                </label>
                <input
                  type="number"
                  step="0.5"
                  name="maleOvertimeThresholdHours"
                  value={settings.maleOvertimeThresholdHours}
                  onChange={handleChange}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <p className="text-[10px] text-slate-400 mt-1">Above this = Overtime</p>
              </div>
            </div>
          </div>

          {/* FEMALE STAFF POLICY */}
          <div className="bg-white dark:bg-slate-900 border-2 border-rose-200 dark:border-rose-900/60 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-rose-100 dark:border-rose-900/40">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center font-bold text-lg">
                  👩
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    Female Staff Duty Hours
                  </h3>
                  <p className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold">
                    Policy for Female Employees
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-mono font-bold text-xs border border-rose-200 dark:border-rose-800">
                {settings.femaleExpectedWorkingHours}h Shift
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div className="col-span-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Expected Working Hours / Day
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.5"
                    name="femaleExpectedWorkingHours"
                    value={settings.femaleExpectedWorkingHours}
                    onChange={handleChange}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  />
                  <span className="absolute right-3.5 top-2.5 text-xs text-slate-400 font-bold">Hours</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Full-day compliance requirement for females (e.g. 7.0 hrs)</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Office Start Time (IN)
                </label>
                <input
                  type="time"
                  name="femaleOfficeStartTime"
                  value={settings.femaleOfficeStartTime}
                  onChange={handleChange}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Office End Time (OUT)
                </label>
                <input
                  type="time"
                  name="femaleOfficeEndTime"
                  value={settings.femaleOfficeEndTime}
                  onChange={handleChange}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Half-Day Threshold
                </label>
                <input
                  type="number"
                  step="0.5"
                  name="femaleHalfDayThresholdHours"
                  value={settings.femaleHalfDayThresholdHours}
                  onChange={handleChange}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
                <p className="text-[10px] text-slate-400 mt-1">Under this = Half-Day</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Overtime Threshold
                </label>
                <input
                  type="number"
                  step="0.5"
                  name="femaleOvertimeThresholdHours"
                  value={settings.femaleOvertimeThresholdHours}
                  onChange={handleChange}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
                <p className="text-[10px] text-slate-400 mt-1">Above this = Overtime</p>
              </div>
            </div>
          </div>
        </div>

        {/* General Grace Period & Debounce */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
            <Clock className="w-5 h-5 text-brand-600" />
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              Grace Period & Attendance Rules
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Late Grace Period (Minutes)
              </label>
              <input
                type="number"
                name="gracePeriodMinutes"
                value={settings.gracePeriodMinutes}
                onChange={handleChange}
                min="0"
                max="120"
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
              <p className="text-[11px] text-slate-400 mt-1">Clock-in allowed without penalty (e.g. 15 mins)</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                RFID Anti-Passback Debounce (Seconds)
              </label>
              <input
                type="number"
                name="scanCooldownSeconds"
                value={settings.scanCooldownSeconds}
                onChange={handleChange}
                min="5"
                max="300"
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
              <p className="text-[11px] text-slate-400 mt-1">Prevents accidental double punches (e.g. 60 seconds)</p>
            </div>
          </div>
        </div>

        {/* ESP32 RFID Reader Authentication */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
            <Cpu className="w-5 h-5 text-brand-600" />
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              ESP32 RFID Reader Authentication
            </h3>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Device Secret API Key (X-API-KEY)
            </label>
            <div className="relative">
              <Key className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                name="rfidApiKey"
                value={settings.rfidApiKey}
                onChange={handleChange}
                required
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-brand-600 dark:text-brand-400 focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Configure this exact key in your ESP32 Arduino firmware `config.h`
            </p>
          </div>
        </div>

        {/* ZKTeco MB360 Biometric Terminal Configuration */}
        <div className="bg-white dark:bg-slate-900 border border-indigo-200/80 dark:border-indigo-900/50 rounded-3xl p-6 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800/50">
                <Fingerprint className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                  ZKTeco MB360 Biometric Terminal
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                    RFID + Finger + Face
                  </span>
                </h3>
                <p className="text-xs text-slate-500">
                  Connect and sync attendance directly over LAN/Wi-Fi socket (port 4370), ADMS Cloud Server push, or USB flash drive.
                </p>
              </div>
            </div>

            {settings.zktecoLastSyncTime && (
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Last Synced</span>
                <span className="text-xs font-mono font-semibold text-slate-700 dark:text-slate-300">
                  {new Date(settings.zktecoLastSyncTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>
            )}
          </div>

          {/* Live Action Status Alert */}
          {zkStatus && (
            <div
              className={`p-3.5 rounded-2xl border text-xs font-medium flex items-center gap-2.5 ${
                zkStatus.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                  : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
              }`}
            >
              {zkStatus.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span className="leading-relaxed">{zkStatus.text}</span>
            </div>
          )}

          {/* Terminal Network Parameters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Device IP Address
              </label>
              <div className="relative">
                <Wifi className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  name="zktecoIp"
                  value={settings.zktecoIp || ''}
                  onChange={handleChange}
                  placeholder="e.g. 192.168.1.201"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">IP assigned to MB360 in router / LAN</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Device Port (TCP/UDP)
              </label>
              <div className="relative">
                <Server className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="number"
                  name="zktecoPort"
                  value={settings.zktecoPort || 4370}
                  onChange={handleChange}
                  placeholder="4370"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Standard ZKTeco communication port (4370)</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Comm Password / Key
              </label>
              <div className="relative">
                <Key className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="number"
                  name="zktecoCommKey"
                  value={settings.zktecoCommKey ?? 0}
                  onChange={handleChange}
                  placeholder="0"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">0 if no communication key is set on machine</p>
            </div>
          </div>

          {/* Auto-Sync Toggle */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60">
            <div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                Automatic Background Sync
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Polls the MB360 device every 5 minutes in background and records new punches automatically.
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                name="zktecoAutoSync"
                checked={!!settings.zktecoAutoSync}
                onChange={handleChange}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          {/* Hardware Operations Button Bar */}
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleTestZk}
              disabled={testingZk || syncingZk}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all flex items-center gap-2 border border-slate-200 dark:border-slate-700 disabled:opacity-50"
            >
              <Wifi className={`w-4 h-4 ${testingZk ? 'animate-pulse text-indigo-600' : ''}`} />
              {testingZk ? 'Testing Connection...' : '🔌 Test Connection'}
            </button>

            <button
              type="button"
              onClick={handleSyncZk}
              disabled={syncingZk || testingZk}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20 flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${syncingZk ? 'animate-spin' : ''}`} />
              {syncingZk ? 'Syncing Logs...' : '🔄 Sync Device Logs Now'}
            </button>

            {/* USB Log Import */}
            <label className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all flex items-center gap-2 border border-slate-200 dark:border-slate-700 cursor-pointer">
              <FileUp className="w-4 h-4 text-brand-600" />
              <span>{uploadingLog ? 'Importing File...' : '📁 Upload USB attlog.dat'}</span>
              <input
                type="file"
                accept=".dat,.txt"
                onChange={handleUploadAttlog}
                disabled={uploadingLog}
                className="hidden"
              />
            </label>
          </div>

          {/* Quick Setup Instructions & ADMS Push Guide */}
          <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 text-xs space-y-2">
            <span className="font-bold text-indigo-900 dark:text-indigo-300 block">
              💡 ZKTeco MB360 Setup Options:
            </span>
            <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
              <li>
                <strong>Option 1 (Network Sync):</strong> Connect MB360 to router via Wi-Fi or Ethernet cable. Check the IP assigned in device menu (<code>Comm. &gt; Network</code>), enter that IP above, and click <strong>Test Connection</strong>.
              </li>
              <li>
                <strong>Option 2 (Instant Cloud Push / ADMS):</strong> In MB360 menu, go to <code>Comm. &gt; Cloud Server Server (ADMS)</code>. Set <strong>Server Address:</strong> (This PC's IP, e.g. <code>192.168.1.118</code>), <strong>Server Port:</strong> <code>5000</code>. Device will automatically push punches in real-time as soon as scanned!
              </li>
              <li>
                <strong>Option 3 (Pen Drive / USB):</strong> Plug USB pendrive in MB360 &gt; USB Manager &gt; Download Attendance Data &gt; Click <strong>Upload USB attlog.dat</strong> button above.
              </li>
              <li>
                <strong>Staff Mapping:</strong> In Staff Management, edit any employee and enter their <strong>ZKTeco Enroll ID</strong> (User ID on the machine, e.g. <code>1</code>, <code>2</code>, or <code>1322</code>).
              </li>
            </ul>
          </div>
        </div>

        {/* Weekly Off Days */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
            <Calendar className="w-5 h-5 text-brand-600" />
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              Weekly Off Days
            </h3>
          </div>

          <div className="flex flex-wrap gap-2.5">
            {daysOfWeek.map((dayName, idx) => {
              const isSelected = (settings.weeklyHolidays || []).includes(idx);
              return (
                <button
                  type="button"
                  key={dayName}
                  onClick={() => handleWeeklyHolidayToggle(idx)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                    isSelected
                      ? 'bg-brand-600 text-white border-brand-600 shadow-md shadow-brand-600/30'
                      : 'bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-brand-500'
                  }`}
                >
                  {dayName}
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-slate-400">
            Selected days will be marked as "Weekend" and excluded from absent calculations.
          </p>
        </div>
      </form>

      {/* Holidays Management */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <Calendar className="w-5 h-5 text-brand-600" />
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Company & Public Holidays
              </h3>
              <p className="text-[11px] text-slate-500">
                Add, delete, or update holidays. Re-adding a previously deleted holiday works smoothly without database conflict.
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-mono font-bold">
            {holidays.length} Registered
          </span>
        </div>

        {/* Add Holiday Form */}
        <form onSubmit={handleAddHoliday} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <input
            type="text"
            placeholder="Holiday Name (e.g. Diwali)"
            value={newHoliday.name}
            onChange={(e) => setNewHoliday(prev => ({ ...prev, name: e.target.value }))}
            required
            className="px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none"
          />
          <input
            type="date"
            value={newHoliday.date}
            onChange={(e) => setNewHoliday(prev => ({ ...prev, date: e.target.value }))}
            required
            className="px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
          />
          <select
            value={newHoliday.type}
            onChange={(e) => setNewHoliday(prev => ({ ...prev, type: e.target.value }))}
            className="px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none"
          >
            <option value="National">National Holiday</option>
            <option value="Festival">Festival Holiday</option>
            <option value="Company">Company Holiday</option>
          </select>
          <button
            type="submit"
            disabled={holidayLoading}
            className="px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>{holidayLoading ? 'Saving...' : 'Add / Update Holiday'}</span>
          </button>
        </form>

        {/* Holidays List */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
          {holidays.length === 0 ? (
            <div className="col-span-3 py-6 text-center text-xs text-slate-400">
              No holidays added yet. Add public and company holidays above.
            </div>
          ) : (
            holidays.map((h) => (
              <div
                key={h._id || h.date}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 text-xs hover:border-brand-500/50 transition-all"
              >
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">{h.name}</p>
                  <p className="text-[10px] font-mono text-slate-500 mt-0.5">
                    {h.date} • <span className="font-semibold text-brand-600 dark:text-brand-400">{h.type}</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteHoliday(h)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                  title="Delete Holiday"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
