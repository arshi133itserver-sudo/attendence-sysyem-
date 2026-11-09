import React, { useState, useEffect, useRef } from 'react';
import { dashboardApi, attendanceApi, rfidApi, attendanceRequestApi } from '../services/api';
import StatsCard from '../components/StatsCard';
import GreetingPopup from '../components/GreetingPopup';
import VoiceSettingsModal from '../components/VoiceSettingsModal';
import AdminSelfieApprovalsModal from '../components/AdminSelfieApprovalsModal';
import {
  speakStaffGreeting,
  isVoiceGreetingEnabled,
  setVoiceGreetingEnabled
} from '../services/greetingService';
import {
  Users,
  UserCheck,
  UserX,
  Briefcase,
  Clock,
  AlertTriangle,
  LogOut,
  Calendar,
  Radio,
  Plus,
  RefreshCw,
  ChevronRight,
  TrendingUp,
  CreditCard,
  CheckCircle,
  Volume2,
  Sparkles,
  Zap,
  Sliders,
  Heart,
  Camera,
  Bell
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

// Web Audio API Synthesizer for hardware chimes
function playPunchTone(type = 'IN') {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    if (type === 'IN') {
      // 1 high pleasant chime
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } else if (type === 'OUT') {
      // 2 quick cheerful chimes
      [0, 0.15].forEach((delay, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(idx === 0 ? 660 : 880, ctx.currentTime + delay);
        gain.gain.setValueAtTime(0.25, ctx.currentTime + delay);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + delay + 0.18);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + 0.18);
      });
    } else {
      // Error buzz
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(260, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    }
  } catch (e) {
    // Audio context may require initial interaction
  }
}

export default function Dashboard({ onOpenSimulator, onOpenAttendanceModal }) {
  const [stats, setStats] = useState(null);
  const [charts, setCharts] = useState(null);
  const [todayAttendance, setTodayAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [punchInput, setPunchInput] = useState('');
  const [punching, setPunching] = useState(false);
  const [lastPunchAlert, setLastPunchAlert] = useState(null);
  const [greetingModalData, setGreetingModalData] = useState(null);
  const [voiceGreetingActive, setVoiceGreetingActive] = useState(isVoiceGreetingEnabled());
  const [isVoiceSettingsOpen, setIsVoiceSettingsOpen] = useState(false);
  const [selfieApprovalsOpen, setSelfieApprovalsOpen] = useState(false);
  const [pendingSelfieCount, setPendingSelfieCount] = useState(0);
  const punchInputRef = useRef(null);
  const lastProcessedScanId = useRef(null);

  // Buffer for USB RFID card reader hardware (acts like keyboard wedge)
  const keyBuffer = useRef('');
  const lastKeyTime = useRef(Date.now());

  const fetchData = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const [dashRes, todayRes, pendingRes] = await Promise.all([
        dashboardApi.getStats(),
        attendanceApi.getToday(),
        attendanceRequestApi.getPending().catch(() => ({ success: false, count: 0 }))
      ]);

      if (pendingRes && pendingRes.success) {
        setPendingSelfieCount(pendingRes.count || 0);
      }

      if (dashRes.success) {
        setStats(dashRes.stats);
        setCharts(dashRes.charts);
      }
      if (todayRes.success) {
        setTodayAttendance(todayRes.data);

        // Real-time voice greeting when an RFID card is scanned on hardware reader (ESP32/USB)
        if (todayRes.latestScan && todayRes.latestScan.id) {
          if (!lastProcessedScanId.current) {
            // First page load: remember latest scan so we don't speak stale history
            lastProcessedScanId.current = todayRes.latestScan.id;
          } else if (lastProcessedScanId.current !== todayRes.latestScan.id) {
            // New scan event detected from RFID reader!
            lastProcessedScanId.current = todayRes.latestScan.id;
            const scan = todayRes.latestScan;

            playPunchTone(scan.scanType);
            speakStaffGreeting(scan.employee?.name || 'Staff Member', scan.scanType, {
              customSpokenText: scan.spokenGreeting,
              time: scan.time
            });

            setGreetingModalData({
              scanType: scan.scanType,
              employee: scan.employee,
              time: scan.time,
              spokenGreeting: scan.spokenGreeting,
              message: scan.message
            });
          }
        }
      }
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  // Perform card punch (IN or OUT)
  const handleQuickPunch = async (cardUid) => {
    const uid = (cardUid || punchInput).toUpperCase().trim();
    if (!uid) return;

    setPunching(true);
    try {
      const res = await rfidApi.simulateScan(uid, 'DASHBOARD_LIVE_SCANNER');

      if (res.status === 'SUCCESS') {
        if (res.rawLogId) {
          lastProcessedScanId.current = res.rawLogId;
        }

        playPunchTone(res.scanType);

        // Voice greeting and animated popup for entering/exiting staff
        speakStaffGreeting(res.employee?.name || 'Staff Member', res.scanType, {
          customSpokenText: res.spokenGreeting,
          time: res.time,
          totalHours: res.totalWorkingHours
        });
        setGreetingModalData(res);

        setLastPunchAlert({
          type: res.scanType,
          status: 'SUCCESS',
          message: res.message,
          employee: res.employee?.name || 'Employee',
          employeeId: res.employee?.id || '',
          time: res.time,
          totalWorkingHours: res.totalWorkingHours
        });
      } else if (res.status === 'DUPLICATE_DEBOUNCED') {
        playPunchTone('ERROR');
        setLastPunchAlert({
          type: 'DEBOUNCE',
          status: 'WARNING',
          message: res.message
        });
      } else {
        playPunchTone('ERROR');
        setLastPunchAlert({
          type: 'ERROR',
          status: 'ERROR',
          message: res.message || 'Unrecognized Card UID'
        });
      }

      setPunchInput('');
      // Instant silent refresh
      await fetchData(true);
    } catch (err) {
      playPunchTone('ERROR');
      setLastPunchAlert({
        type: 'ERROR',
        status: 'ERROR',
        message: err.message
      });
    } finally {
      setPunching(false);
      // Auto-hide alert after 7 seconds
      setTimeout(() => {
        setLastPunchAlert(null);
      }, 7000);
    }
  };

  useEffect(() => {
    fetchData();

    // Fast Real-Time Polling: Automatically poll every 2.5 seconds!
    // So whenever ESP32 or reader punches, this page updates automatically without clicking!
    const pollInterval = setInterval(() => {
      fetchData(true);
    }, 2500);

    // Global USB RFID card reader listener (Key Wedge)
    // Most USB RFID readers send digits in rapid succession ending with Enter.
    const handleGlobalKeyDown = (e) => {
      // If user is currently typing in a normal text input (like search or modal), ignore
      const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
      if (activeTag === 'textarea') return;

      const now = Date.now();
      // If gap between keystrokes is more than 300ms, reset buffer
      if (now - lastKeyTime.current > 300) {
        keyBuffer.current = '';
      }
      lastKeyTime.current = now;

      if (e.key === 'Enter') {
        const scannedUid = keyBuffer.current.trim();
        if (scannedUid.length >= 4) {
          e.preventDefault();
          handleQuickPunch(scannedUid);
        }
        keyBuffer.current = '';
      } else if (e.key.length === 1) {
        keyBuffer.current += e.key;
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Banner / Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Live Attendance Dashboard
            </h1>
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-[11px] font-bold border border-emerald-200 dark:border-emerald-800">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              Live Sync (2s)
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time biometric monitoring & RFID gate activity for Arshi Enterprises
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Voice Greeting Toggle */}
          <button
            onClick={() => {
              const nextState = !voiceGreetingActive;
              setVoiceGreetingEnabled(nextState);
              setVoiceGreetingActive(nextState);
              if (nextState) {
                speakStaffGreeting('System', 'IN', { customSpokenText: 'Voice greeting is enabled.' });
              }
            }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-all shadow-sm ${
              voiceGreetingActive
                ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300'
                : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'
            }`}
            title={voiceGreetingActive ? 'Staff Voice Greeting Active (Click to Mute)' : 'Staff Voice Greeting Muted (Click to Enable)'}
          >
            <Volume2 className={`w-3.5 h-3.5 ${voiceGreetingActive ? 'text-emerald-500 animate-pulse' : 'text-slate-400'}`} />
            <span>{voiceGreetingActive ? 'Voice: ON' : 'Voice: OFF'}</span>
          </button>

          {/* Voice Customizer Button */}
          <button
            onClick={() => setIsVoiceSettingsOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-pink-200 dark:border-pink-900/60 bg-pink-50 dark:bg-pink-950/40 text-pink-700 dark:text-pink-300 hover:bg-pink-100 dark:hover:bg-pink-900/40 text-xs font-bold transition-all shadow-sm"
            title="Aawaz Ki Meethas Aur Model Customize Karein (Natural Human Voice)"
          >
            <Sliders className="w-3.5 h-3.5 text-pink-500" />
            <span className="hidden sm:inline">Voice Tune</span>
            <span className="sm:hidden">Tune</span>
          </button>

          {/* Selfie Attendance Approvals Button */}
          <button
            onClick={() => setSelfieApprovalsOpen(true)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-sm border ${
              pendingSelfieCount > 0
                ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-400 dark:border-amber-600 text-amber-700 dark:text-amber-300 animate-pulse'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
            }`}
            title={pendingSelfieCount > 0 ? `${pendingSelfieCount} Selfie Attendance Requests Waiting for Approval` : 'Selfie Attendance Approvals'}
          >
            <div className="relative">
              <Camera className="w-3.5 h-3.5 text-indigo-500" />
              {pendingSelfieCount > 0 && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full animate-ping" />
              )}
            </div>
            <span>Selfie Approvals</span>
            {pendingSelfieCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white font-mono text-[10px] font-black">
                {pendingSelfieCount}
              </span>
            )}
          </button>

          <button
            onClick={() => fetchData(false)}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shadow-sm"
            title="Refresh Dashboard"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={onOpenSimulator}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-lg shadow-brand-600/30 transition-all"
          >
            <Radio className="w-4 h-4 animate-pulse" />
            <span>Virtual Reader</span>
          </button>

          <button
            onClick={() => onOpenAttendanceModal()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-bold transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Manual Entry</span>
          </button>
        </div>
      </div>

      {/* Real-time Punch Alert Toast Banner */}
      {lastPunchAlert && (
        <div
          className={`p-4 rounded-2xl border text-xs shadow-lg animate-fade-in flex items-center justify-between gap-3 ${
            lastPunchAlert.type === 'IN'
              ? 'bg-emerald-500 text-white border-emerald-600 shadow-emerald-500/20'
              : lastPunchAlert.type === 'OUT'
              ? 'bg-blue-600 text-white border-blue-700 shadow-blue-500/20'
              : lastPunchAlert.status === 'WARNING'
              ? 'bg-amber-500 text-white border-amber-600 shadow-amber-500/20'
              : 'bg-rose-600 text-white border-rose-700 shadow-rose-500/20'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center font-bold">
              {lastPunchAlert.type === 'IN' ? (
                <CheckCircle className="w-5 h-5 text-white" />
              ) : lastPunchAlert.type === 'OUT' ? (
                <LogOut className="w-5 h-5 text-white" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-white" />
              )}
            </div>
            <div>
              <p className="font-extrabold text-sm tracking-wide">
                {lastPunchAlert.type === 'IN'
                  ? `🟢 CLOCKED IN: ${lastPunchAlert.employee} (${lastPunchAlert.employeeId})`
                  : lastPunchAlert.type === 'OUT'
                  ? `🔵 CLOCKED OUT: ${lastPunchAlert.employee} (${lastPunchAlert.employeeId})`
                  : lastPunchAlert.message}
              </p>
              <p className="text-[11px] opacity-90 mt-0.5">
                {lastPunchAlert.message}
                {lastPunchAlert.totalWorkingHours ? ` • Total Hours: ${lastPunchAlert.totalWorkingHours}` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={() => setLastPunchAlert(null)}
            className="px-2.5 py-1 rounded-lg bg-black/20 hover:bg-black/40 text-white text-xs font-bold transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Quick Punch Bar Directly on Dashboard */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-950 to-brand-950 border border-brand-500/30 rounded-3xl p-4 shadow-xl text-white">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="w-10 h-10 rounded-2xl bg-brand-500/20 border border-brand-500/40 text-brand-400 flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5 animate-pulse text-brand-400" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <span>Instant Card Punch</span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                  Ready
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Tap card on USB or ESP32 reader to punch IN / OUT automatically
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto justify-start md:justify-end">
            {/* Manual UID Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleQuickPunch();
              }}
              className="flex items-center gap-1.5"
            >
              <input
                ref={punchInputRef}
                type="text"
                placeholder="Scan or enter Card UID..."
                value={punchInput}
                onChange={(e) => setPunchInput(e.target.value.toUpperCase())}
                className="w-48 sm:w-56 px-3.5 py-2 rounded-xl bg-slate-800/90 border border-slate-700 text-xs font-mono font-bold uppercase text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <button
                type="submit"
                disabled={punching || !punchInput.trim()}
                className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs shadow-md shadow-brand-600/30 transition-all disabled:opacity-50"
              >
                {punching ? '...' : 'Punch'}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* 8 Primary KPI Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard
          title="Total Employees"
          value={stats?.totalEmployees || 0}
          subtext="Active staff roster"
          icon={Users}
          color="blue"
        />
        <StatsCard
          title="Present Today"
          value={stats?.presentToday || 0}
          subtext={`Attendance rate: ${stats?.totalEmployees ? Math.round(((stats.presentToday || 0) / stats.totalEmployees) * 100) : 0}%`}
          icon={UserCheck}
          color="brand"
        />
        <StatsCard
          title="Currently Working"
          value={stats?.currentlyWorking || 0}
          subtext="Checked in right now"
          icon={Briefcase}
          color="indigo"
        />
        <StatsCard
          title="Absent Today"
          value={stats?.absentToday || 0}
          subtext="Not checked in yet"
          icon={UserX}
          color="rose"
        />
        <StatsCard
          title="Late Arrivals"
          value={stats?.lateArrivals || 0}
          subtext="Clocked after grace cutoff"
          icon={Clock}
          color="amber"
        />
        <StatsCard
          title="Early Departures"
          value={stats?.earlyDepartures || 0}
          subtext="Clocked out before 06:00 PM"
          icon={LogOut}
          color="purple"
        />
        <StatsCard
          title="Total Hours Today"
          value={stats?.totalWorkingHoursFormatted || '0h 00m'}
          subtext="Aggregated workplace hours"
          icon={Clock}
          color="brand"
        />
        <StatsCard
          title="Monthly Attendance"
          value={`${stats?.monthlyAttendancePercentage || 0}%`}
          subtext="Overall monthly compliance"
          icon={TrendingUp}
          color="blue"
        />
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 7-Day Attendance Trend */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Weekly Attendance Trend
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Present, Late, and Total Working Hours for the last 7 days
              </p>
            </div>
            <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              Last 7 Days
            </span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts?.weeklyTrend || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px'
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="present" name="Present" fill="#16a34a" radius={[6, 6, 0, 0]} />
                <Bar dataKey="late" name="Late Arrivals" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                <Bar dataKey="absent" name="Absent" fill="#ef4444" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Department Distribution */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col">
          <div className="mb-4">
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              Department Attendance
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Present vs Total headcount by team
            </p>
          </div>

          <div className="space-y-4 flex-1 flex flex-col justify-center">
            {(charts?.departmentDistribution || []).map((dept) => (
              <div key={dept.department} className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-700 dark:text-slate-300">{dept.department}</span>
                  <span className="font-mono text-slate-500 dark:text-slate-400">
                    {dept.present}/{dept.total} ({dept.attendanceRate}%)
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-brand-600 transition-all duration-500"
                    style={{ width: `${dept.attendanceRate}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Real-Time Today Attendance Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              Today's Live Attendance Feed
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Live punch activity & working status for all registered staff
            </p>
          </div>
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-xs font-bold border border-emerald-200 dark:border-emerald-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            <span>Live Auto-Sync</span>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase tracking-wider text-[10px] font-bold">
                <th className="pb-3 pl-1">Employee</th>
                <th className="pb-3">Status</th>
                <th className="pb-3">First IN</th>
                <th className="pb-3">Last OUT</th>
                <th className="pb-3">Worked</th>
                <th className="pb-3 text-right pr-1">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              {todayAttendance.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-6 text-center text-slate-400">
                    No active employees registered yet.
                  </td>
                </tr>
              ) : (
                todayAttendance.map((row) => (
                  <tr key={row.employee._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 pl-1">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white font-bold flex items-center justify-center text-xs overflow-hidden">
                          {row.employee.profilePhoto ? (
                            <img src={row.employee.profilePhoto} alt="" className="w-full h-full object-cover" />
                          ) : (
                            row.employee.fullName.charAt(0)
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">
                            {row.employee.fullName}
                          </p>
                          <p className="text-[10px] text-slate-500 font-mono">
                            {row.employee.employeeId} • {row.employee.department} • UID: {row.employee.rfidCardUid || 'None'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3">
                      {row.isWorkingNow ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 font-bold text-[10px] border border-indigo-200 dark:border-indigo-800 animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                          Working Now
                        </span>
                      ) : row.status === 'Present' || row.status === 'Late' ? (
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                          row.isLate
                            ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                            : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                        }`}>
                          {row.isLate ? 'Late' : 'Present'}
                        </span>
                      ) : row.status === 'Half-Day' ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400 text-[10px] font-bold border border-purple-200 dark:border-purple-800">
                          Half-Day
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px] font-bold">
                          Absent
                        </span>
                      )}
                    </td>
                    <td className="py-3 font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                      {row.firstInTime
                        ? new Date(row.firstInTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                        : '--:--'}
                    </td>
                    <td className="py-3 font-mono text-blue-600 dark:text-blue-400 font-bold">
                      {row.lastOutTime
                        ? new Date(row.lastOutTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                        : '--:--'}
                    </td>
                    <td className="py-3 font-mono font-bold text-slate-900 dark:text-white">
                      {row.totalWorkingHoursFormatted}
                    </td>
                    <td className="py-3 text-right pr-1">
                      <button
                        onClick={() => handleQuickPunch(row.employee.rfidCardUid)}
                        className={`px-3 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                          row.isWorkingNow
                            ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-100'
                            : 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100'
                        }`}
                      >
                        {row.isWorkingNow ? 'Punch OUT' : 'Punch IN'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      {/* Interactive Floating Greeting Card with Audio */}
      <GreetingPopup
        greetingData={greetingModalData}
        onClose={() => setGreetingModalData(null)}
      />

      {/* Human & Sweet Voice Customizer Modal */}
      <VoiceSettingsModal
        isOpen={isVoiceSettingsOpen}
        onClose={() => setIsVoiceSettingsOpen(false)}
      />

      {/* Admin Selfie Attendance Approvals Modal */}
      <AdminSelfieApprovalsModal
        isOpen={selfieApprovalsOpen}
        onClose={() => setSelfieApprovalsOpen(false)}
        onActionSuccess={() => fetchData(true)}
      />
    </div>
  );
}
