import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { rfidApi } from '../services/api';
import { speakStaffGreeting, getTimeGreeting } from '../services/greetingService';
import {
  CreditCard,
  Clock,
  CheckCircle,
  AlertCircle,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Lock,
  X,
  Shield,
  Sparkles,
  Wifi,
  UserCheck
} from 'lucide-react';

export default function KioskMode() {
  const navigate = useNavigate();

  // Clock state
  const [currentTime, setCurrentTime] = useState(new Date());

  // Kiosk UI states
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [scanResult, setScanResult] = useState(null); // { status, scanType, employee, message, ... }
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioUnlocked, setAudioUnlocked] = useState(false);

  // Exit PIN Modal
  const [exitModalOpen, setExitModalOpen] = useState(false);
  const [exitPin, setExitPin] = useState('');
  const [pinError, setPinError] = useState('');

  // USB RFID Reader Keyboard Wedge Buffers
  const keyBuffer = useRef('');
  const lastKeyTime = useRef(0);

  // Auto-dismiss scan popup back to idle clock after 3.5 seconds
  useEffect(() => {
    if (!scanResult) return;
    const timer = setTimeout(() => {
      setScanResult(null);
    }, 3500);
    return () => clearTimeout(timer);
  }, [scanResult]);

  // Live Digital Clock
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Web Audio Context for Chimes / Beeps
  const playTone = (type = 'IN') => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;
      if (type === 'IN') {
        osc.frequency.setValueAtTime(587.33, now); // D5
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (type === 'OUT') {
        osc.frequency.setValueAtTime(880, now); // A5
        osc.frequency.exponentialRampToValueAtTime(587.33, now + 0.14); // D5
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
      } else {
        // Error tone
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
      }
    } catch (_) {}
  };

  // Process RFID Card Punch
  const handleCardScan = async (rawCardUid) => {
    const cleanUid = String(rawCardUid).trim().toUpperCase();
    if (!cleanUid || cleanUid.length < 4 || isProcessing) return;

    setIsProcessing(true);

    try {
      const scanTimestamp = new Date().toISOString();
      const res = await rfidApi.simulateScan(cleanUid, 'TABLET_KIOSK_READER', scanTimestamp);

      if (res.status === 'SUCCESS') {
        playTone(res.scanType);

        // Fallback display time strictly in Indian Standard Time (IST - Asia/Kolkata)
        const punchFormatter = new Intl.DateTimeFormat('en-US', {
          timeZone: 'Asia/Kolkata',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
        const pParts = punchFormatter.formatToParts(new Date());
        const pHour = pParts.find(p => p.type === 'hour')?.value || '12';
        const pMin = pParts.find(p => p.type === 'minute')?.value || '00';
        const pPeriod = (pParts.find(p => p.type === 'dayPeriod')?.value || 'PM').toUpperCase();
        const istPunchTime = res.time || `${pHour}:${pMin} ${pPeriod}`;

        const punchDate = res.date || new Intl.DateTimeFormat('en-IN', {
          timeZone: 'Asia/Kolkata',
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        }).format(new Date());

        if (soundEnabled) {
          speakStaffGreeting(res.employee?.name || 'Staff Member', res.scanType, {
            customSpokenText: res.spokenGreeting,
            time: istPunchTime,
            totalHours: res.totalWorkingHours
          });
        }

        setScanResult({
          status: 'SUCCESS',
          scanType: res.scanType,
          employee: res.employee,
          time: istPunchTime,
          date: punchDate,
          totalWorkingHours: res.totalWorkingHours,
          message: res.message,
          greeting: res.greeting
        });
      } else if (res.status === 'DUPLICATE_DEBOUNCED') {
        playTone('ERROR');
        setScanResult({
          status: 'DEBOUNCE',
          scanType: 'WARNING',
          message: res.message || 'Card scanned recently. Please wait.'
        });
      } else {
        playTone('ERROR');
        setScanResult({
          status: 'ERROR',
          scanType: 'ERROR',
          message: res.message || `Card ${cleanUid} not registered in system.`
        });
      }
    } catch (err) {
      playTone('ERROR');
      setScanResult({
        status: 'ERROR',
        scanType: 'ERROR',
        message: err.message || 'Connection error. Please try again.'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Global USB RFID Reader Listener (Keyboard Wedge via OTG)
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      // Don't capture when typing in the exit PIN modal input
      if (exitModalOpen) return;

      const now = Date.now();
      if (now - lastKeyTime.current > 300) {
        keyBuffer.current = '';
      }
      lastKeyTime.current = now;

      if (e.key === 'Enter') {
        const scanned = keyBuffer.current.trim();
        if (scanned.length >= 4) {
          e.preventDefault();
          handleCardScan(scanned);
        }
        keyBuffer.current = '';
      } else if (e.key.length === 1) {
        keyBuffer.current += e.key;
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [exitModalOpen, isProcessing, soundEnabled]);

  // Fullscreen Handler
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Exit Kiosk Handler (PIN Protected: default '1234' or 'admin123')
  const handleExitPinSubmit = (e) => {
    e.preventDefault();
    if (exitPin === '1234' || exitPin === 'admin123') {
      navigate('/dashboard');
    } else {
      setPinError('Incorrect PIN. (Default: 1234)');
    }
  };

  // Unlock Tablet Audio on first tap (browser autoplay policy)
  const handleUserInteraction = () => {
    if (!audioUnlocked) {
      setAudioUnlocked(true);
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          ctx.resume();
        }
      } catch (_) {}
    }
  };

  // Formatted Time Strings (Locked strictly to Indian Standard Time - Asia/Kolkata)
  const istFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
  const timeParts = istFormatter.formatToParts(currentTime);
  const hourPart = timeParts.find(p => p.type === 'hour')?.value || '12';
  const minutePart = timeParts.find(p => p.type === 'minute')?.value || '00';
  const dayPeriodPart = (timeParts.find(p => p.type === 'dayPeriod')?.value || 'PM').toUpperCase();

  const timeSeconds = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    second: '2-digit'
  }).format(currentTime);

  const dateFormatted = currentTime.toLocaleDateString('en-US', {
    timeZone: 'Asia/Kolkata',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div
      onClick={handleUserInteraction}
      className="relative min-h-screen w-full bg-slate-950 text-white flex flex-col justify-between overflow-hidden select-none font-sans"
    >
      {/* Background Ambience / Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-indigo-950/40 via-slate-950 to-slate-950 pointer-events-none" />
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-brand-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header Bar */}
      <header className="relative z-10 p-6 flex items-center justify-between border-b border-slate-800/60 bg-slate-900/30 backdrop-blur-md">
        {/* Company Branding */}
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-rose-600 flex items-center justify-center shadow-lg shadow-brand-600/20 border border-brand-400/30">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              ARSHI ENTERPRISES
              <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-brand-500/20 text-brand-400 border border-brand-500/30">
                GATE TERMINAL
              </span>
            </h1>
            <p className="text-[11px] font-medium text-slate-400">
              A Complete Security Solution • Smart RFID Attendance
            </p>
          </div>
        </div>

        {/* Live Status & Top Controls */}
        <div className="flex items-center gap-3">
          {/* Live Indian Date Badge in Header */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-700/80 text-slate-300 text-xs font-mono font-bold">
            <Clock className="w-3.5 h-3.5 text-brand-400" />
            <span>{dateFormatted}</span>
          </div>

          {/* Scanner Live Status Badge */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-950/50 border border-emerald-800/60 text-emerald-300 text-xs font-mono font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>RFID SCANNER READY</span>
          </div>

          {/* Audio Mute/Unmute */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 text-slate-300 transition-all"
            title={soundEnabled ? 'Voice Greeting Enabled' : 'Voice Greeting Muted'}
          >
            {soundEnabled ? <Volume2 className="w-5 h-5 text-emerald-400" /> : <VolumeX className="w-5 h-5 text-slate-500" />}
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 text-slate-300 transition-all"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
          </button>

          {/* Admin Exit Button */}
          <button
            onClick={() => {
              setExitPin('');
              setPinError('');
              setExitModalOpen(true);
            }}
            className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 text-slate-300 transition-all flex items-center gap-1.5"
            title="Exit Kiosk Mode (Admin Only)"
          >
            <Lock className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-bold text-slate-300 hidden sm:inline">Admin Exit</span>
          </button>
        </div>
      </header>

      {/* Main Center Display */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center p-6 text-center max-w-4xl mx-auto w-full">
        {scanResult ? (
          /* ============================================================ */
          /* PUNCH RESULT POPUP CARD                                      */
          /* ============================================================ */
          <div
            onClick={() => setScanResult(null)}
            className="w-full max-w-lg bg-slate-900/90 backdrop-blur-2xl border-2 rounded-3xl p-8 shadow-2xl animate-in zoom-in-95 duration-200 space-y-6 border-brand-500/40 cursor-pointer select-none"
            title="Click to dismiss immediately"
          >
            {scanResult.status === 'SUCCESS' ? (
              <>
                {/* Employee Photo / Avatar */}
                <div className="relative mx-auto w-32 h-32">
                  {scanResult.employee?.photo ? (
                    <img
                      src={scanResult.employee.photo}
                      alt={scanResult.employee.name}
                      className="w-32 h-32 rounded-full object-cover border-4 border-emerald-500 shadow-xl shadow-emerald-500/20"
                    />
                  ) : (
                    <div className="w-32 h-32 rounded-full bg-gradient-to-tr from-brand-600 to-indigo-600 border-4 border-emerald-500 flex items-center justify-center text-3xl font-black text-white shadow-xl shadow-emerald-500/20">
                      {scanResult.employee?.name ? scanResult.employee.name.charAt(0).toUpperCase() : 'A'}
                    </div>
                  )}

                  {/* Punch Type Badge */}
                  <div
                    className={`absolute -bottom-2 -right-2 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider shadow-lg flex items-center gap-1 ${
                      scanResult.scanType === 'IN'
                        ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/40'
                        : 'bg-indigo-500 text-white shadow-indigo-500/40'
                    }`}
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>{scanResult.scanType === 'IN' ? 'CLOCK IN' : 'CLOCK OUT'}</span>
                  </div>
                </div>

                {/* Name & Details */}
                <div>
                  <h2 className="text-3xl font-black text-white tracking-tight">
                    {scanResult.employee?.name}
                  </h2>
                  <p className="text-sm font-semibold text-brand-400 mt-1">
                    {scanResult.employee?.designation} • {scanResult.employee?.department}
                  </p>
                  <p className="text-xs font-mono text-slate-400 mt-0.5">
                    ID: {scanResult.employee?.id}
                  </p>
                </div>

                {/* Greeting / Punch Info Box */}
                <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/80 space-y-2">
                  <p className="text-sm font-medium text-slate-200">
                    {scanResult.greeting || scanResult.message}
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-2.5 text-xs font-mono font-bold pt-1">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-900/80 border border-slate-700 text-slate-300">
                      📅 Date: {scanResult.date}
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-900/80 border border-slate-700 text-brand-300">
                      ⏰ Time: {scanResult.time}
                    </span>
                    {scanResult.isEarlyIn && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-950/70 border border-emerald-600 text-emerald-300">
                        🟢 Early (-{scanResult.earlyByMinutes}m)
                      </span>
                    )}
                    {scanResult.isLate && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-950/70 border border-amber-600 text-amber-300">
                        ⚠️ Late (+{scanResult.lateByMinutes}m)
                      </span>
                    )}
                    {scanResult.totalWorkingHours && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-950/70 border border-emerald-700 text-emerald-400">
                        ⚡ Duty: {scanResult.totalWorkingHours}
                      </span>
                    )}
                  </div>
                </div>

                {/* Auto-Dismiss Countdown Bar & Hint */}
                <div className="space-y-1.5">
                  <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-emerald-500 h-full rounded-full animate-[progress_3.5s_linear]" />
                  </div>
                  <p className="text-[11px] font-mono text-slate-500">
                    Returning to clock in 3 seconds (or tap anywhere)
                  </p>
                </div>
              </>
            ) : (
              /* Error / Debounce Alert */
              <div className="py-6 space-y-4">
                <div className="w-20 h-20 rounded-full bg-rose-500/20 text-rose-400 border-2 border-rose-500/40 mx-auto flex items-center justify-center">
                  <AlertCircle className="w-10 h-10" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-rose-400">
                    {scanResult.status === 'DEBOUNCE' ? 'Card Scanned Recently' : 'Access Denied'}
                  </h3>
                  <p className="text-sm text-slate-300 mt-2 max-w-sm mx-auto leading-relaxed">
                    {scanResult.message}
                  </p>
                </div>
                <div className="pt-2 text-xs font-mono text-slate-500">
                  Returning to clock in 3 seconds...
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ============================================================ */
          /* IDLE KIOSK STATE (BIG CLOCK & RFID TAP RADAR)                */
          /* ============================================================ */
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Big Live Digital Clock */}
            <div className="space-y-2">
              <div className="inline-flex items-baseline gap-2 font-mono font-black tracking-tight drop-shadow-2xl">
                <span className="text-6xl sm:text-8xl md:text-9xl text-white">
                  {hourPart}:{minutePart}
                </span>
                <span className="text-2xl sm:text-4xl text-slate-500 font-bold">
                  :{timeSeconds}
                </span>
                <span className="text-2xl sm:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-400 to-rose-400">
                  {dayPeriodPart}
                </span>
              </div>
              <p className="text-base sm:text-xl font-medium text-slate-400 tracking-wide">
                {dateFormatted}
              </p>
            </div>

            {/* Glowing RFID Radar Animation */}
            <div className="relative py-4 flex flex-col items-center">
              <div className="relative w-36 h-36 sm:w-44 sm:h-44 rounded-full flex items-center justify-center">
                {/* Radar Waves */}
                <div className="absolute inset-0 rounded-full bg-brand-500/10 animate-ping duration-1000" />
                <div className="absolute -inset-3 rounded-full border border-brand-500/20 animate-pulse" />
                <div className="absolute -inset-8 rounded-full border border-indigo-500/10" />

                {/* Center Circle with RFID Card */}
                <div className="relative z-10 w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-gradient-to-br from-slate-900 to-indigo-950 border-2 border-brand-500/40 shadow-2xl shadow-brand-500/20 flex flex-col items-center justify-center gap-2">
                  <CreditCard className="w-10 h-10 sm:w-12 sm:h-12 text-brand-400 animate-bounce" />
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-300">
                    TAP CARD
                  </span>
                </div>
              </div>

              {/* Text Instructions */}
              <div className="mt-4 space-y-1">
                <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                  Please Tap Your RFID Card
                </h3>
                <p className="text-xs sm:text-sm text-slate-400">
                  Hold card close to USB scanner to record entry or checkout
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Footer Info Bar */}
      <footer className="relative z-10 p-4 border-t border-slate-800/60 bg-slate-900/20 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-500">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>Arshi Smart Biometrics Engine Active</span>
        </div>
        <div className="font-mono text-slate-400">
          NH-31, Maranga, Purnia (Bihar) • Helpline: 7782808063
        </div>
      </footer>

      {/* Exit Admin PIN Modal */}
      {exitModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 w-full max-w-sm space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Lock className="w-4 h-4 text-brand-400" />
                Exit Kiosk Mode
              </h3>
              <button
                onClick={() => setExitModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Enter Admin Security PIN to exit Kiosk and return to Dashboard.
            </p>

            <form onSubmit={handleExitPinSubmit} className="space-y-4">
              <div>
                <input
                  type="password"
                  autoFocus
                  placeholder="Enter PIN (Default: 1234)"
                  value={exitPin}
                  onChange={(e) => {
                    setExitPin(e.target.value);
                    setPinError('');
                  }}
                  className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono text-center text-lg tracking-widest focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
                {pinError && <p className="text-xs text-rose-400 mt-1.5 font-medium">{pinError}</p>}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setExitModalOpen(false)}
                  className="w-1/2 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs shadow-md shadow-brand-600/30"
                >
                  Verify & Exit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
