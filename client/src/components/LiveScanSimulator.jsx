import React, { useState, useEffect } from 'react';
import { rfidApi, employeeApi } from '../services/api';
import { Radio, X, CheckCircle, AlertTriangle, XCircle, Clock, Volume2, Sparkles } from 'lucide-react';
import { speakStaffGreeting } from '../services/greetingService';

// Web Audio API Synthesizer to play authentic hardware buzzer beeps
function playBuzzerSound(type = 'success', count = 1) {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    for (let i = 0; i < count; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type === 'error' ? 'sawtooth' : 'sine';
      osc.frequency.setValueAtTime(type === 'error' ? 300 : (type === 'out' ? 950 : 800), ctx.currentTime + i * 0.2);

      gain.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.2);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.2 + 0.15);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + i * 0.2);
      osc.stop(ctx.currentTime + i * 0.2 + 0.15);
    }
  } catch (e) {
    // Audio might be blocked if no user interaction yet
  }
}

export default function LiveScanSimulator({ isOpen, onClose, onScanComplete }) {
  const [cardUid, setCardUid] = useState('');
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastResponse, setLastResponse] = useState(null);
  const [lcdLine1, setLcdLine1] = useState('ARSHI ENTERPRISES');
  const [lcdLine2, setLcdLine2] = useState('READY TO SCAN...');
  const [activeLed, setActiveLed] = useState('idle'); // 'green', 'blue', 'red', 'idle'

  useEffect(() => {
    if (isOpen) {
      employeeApi.getAll({ status: 'Active' }).then((res) => {
        if (res.success && res.data) {
          setEmployees(res.data.filter(e => e.rfidCardUid));
        }
      }).catch(() => {});
    }
  }, [isOpen]);

  const handleScan = async (uidToScan) => {
    const targetUid = (uidToScan || cardUid).toUpperCase().trim();
    if (!targetUid) return;

    setLoading(true);
    setLcdLine1('READING CARD...');
    setLcdLine2(targetUid);

    try {
      const res = await rfidApi.simulateScan(targetUid, 'WEB_SIMULATOR_GATE_01');
      setLastResponse(res);

      if (res.status === 'SUCCESS') {
        if (res.scanType === 'IN') {
          setActiveLed('green');
          playBuzzerSound('success', 1);
          setLcdLine1(`IN: ${res.employee.name.slice(0, 12)}`);
          setLcdLine2(`TIME: ${res.time}`);
        } else {
          setActiveLed('blue');
          playBuzzerSound('out', 2);
          setLcdLine1(`OUT: ${res.employee.name.slice(0, 12)}`);
          setLcdLine2(`HRS: ${res.totalWorkingHours}`);
        }

        // Voice Greeting for staff
        speakStaffGreeting(res.employee?.name || 'Staff Member', res.scanType, {
          customSpokenText: res.spokenGreeting
        });
      } else if (res.status === 'DUPLICATE_DEBOUNCED') {
        setActiveLed('red');
        playBuzzerSound('error', 2);
        setLcdLine1('COOLDOWN ACTIVE');
        setLcdLine2('WAIT 60 SECONDS');
      } else {
        setActiveLed('red');
        playBuzzerSound('error', 3);
        setLcdLine1('ACCESS DENIED');
        setLcdLine2('CARD NOT FOUND');
      }

      if (onScanComplete) {
        onScanComplete(res);
      }
    } catch (err) {
      setActiveLed('red');
      playBuzzerSound('error', 3);
      setLcdLine1('SCAN FAILED');
      setLcdLine2(err.message.slice(0, 16));
      setLastResponse({
        success: false,
        status: 'ERROR',
        message: err.message
      });
    } finally {
      setLoading(false);
      setTimeout(() => {
        setActiveLed('idle');
      }, 3000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-500/10 text-brand-600 flex items-center justify-center border border-brand-500/20">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                ESP32 + RC522 RFID Simulator
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tap cards to trigger live hardware buzzer & attendance events
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Virtual Hardware Display & LEDs */}
        <div className="p-6 space-y-6">
          <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 shadow-inner flex flex-col items-center">
            {/* LED Status Bar */}
            <div className="w-full flex items-center justify-between mb-4 px-2">
              <div className="flex items-center gap-4">
                {/* Green LED (Clock IN) */}
                <div className="flex items-center gap-1.5">
                  <span
                    className={`w-3.5 h-3.5 rounded-full transition-all duration-300 ${
                      activeLed === 'green'
                        ? 'bg-emerald-400 shadow-[0_0_12px_#34d399]'
                        : 'bg-emerald-950 border border-emerald-800'
                    }`}
                  />
                  <span className="text-[10px] uppercase font-mono font-bold text-emerald-500">IN</span>
                </div>
                {/* Blue LED (Clock OUT) */}
                <div className="flex items-center gap-1.5">
                  <span
                    className={`w-3.5 h-3.5 rounded-full transition-all duration-300 ${
                      activeLed === 'blue'
                        ? 'bg-blue-400 shadow-[0_0_12px_#60a5fa]'
                        : 'bg-blue-950 border border-blue-800'
                    }`}
                  />
                  <span className="text-[10px] uppercase font-mono font-bold text-blue-500">OUT</span>
                </div>
                {/* Red LED (Error / Debounce) */}
                <div className="flex items-center gap-1.5">
                  <span
                    className={`w-3.5 h-3.5 rounded-full transition-all duration-300 ${
                      activeLed === 'red'
                        ? 'bg-rose-500 shadow-[0_0_12px_#f43f5e]'
                        : 'bg-rose-950 border border-rose-800'
                    }`}
                  />
                  <span className="text-[10px] uppercase font-mono font-bold text-rose-500">REJECT</span>
                </div>
              </div>

              <div className="flex items-center gap-1 text-[11px] font-mono text-slate-500">
                <Volume2 className="w-3.5 h-3.5" />
                <span>Buzzer Sync</span>
              </div>
            </div>

            {/* Virtual 16x2 I2C OLED/LCD Screen */}
            <div className="w-full bg-[#0a192f] border-2 border-emerald-500/40 rounded-xl p-4 font-mono text-emerald-400 shadow-[inset_0_2px_8px_rgba(0,0,0,0.8)]">
              <div className="text-xs uppercase tracking-wider font-semibold border-b border-emerald-500/20 pb-1 mb-1 truncate">
                {lcdLine1}
              </div>
              <div className="text-sm font-bold tracking-widest truncate">
                {lcdLine2}
              </div>
            </div>
          </div>

          {/* Quick-Tap Registered Employee Cards */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              Tap An Employee Card (Quick Scan):
            </label>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
              {employees.map((emp) => (
                <button
                  key={emp._id}
                  onClick={() => {
                    setCardUid(emp.rfidCardUid);
                    handleScan(emp.rfidCardUid);
                  }}
                  disabled={loading}
                  className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-brand-500 dark:hover:border-brand-500 bg-slate-50 dark:bg-slate-800/40 hover:bg-brand-50 dark:hover:bg-brand-950/30 text-left transition-all group disabled:opacity-50"
                >
                  <div className="w-8 h-8 rounded-lg bg-brand-600 text-white flex items-center justify-center font-bold text-xs shrink-0 group-hover:scale-105 transition-transform">
                    {emp.fullName.charAt(0)}
                  </div>
                  <div className="truncate">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {emp.fullName}
                    </p>
                    <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                      UID: {emp.rfidCardUid}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Manual UID Input */}
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Or Enter Any Custom RFID UID:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. 73A2B19F or UNKNOWN99"
                value={cardUid}
                onChange={(e) => setCardUid(e.target.value.toUpperCase())}
                className="flex-1 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold uppercase focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 dark:text-white"
              />
              <button
                onClick={() => handleScan(cardUid)}
                disabled={loading || !cardUid.trim()}
                className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-md shadow-brand-600/30 transition-all disabled:opacity-50 flex items-center gap-1.5"
              >
                {loading ? 'Scanning...' : 'Scan Now'}
              </button>
            </div>
          </div>

          {/* Result Alert */}
          {lastResponse && (
            <div
              className={`p-4 rounded-2xl border text-xs flex items-start gap-3 animate-fade-in ${
                lastResponse.status === 'SUCCESS'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                  : lastResponse.status === 'DUPLICATE_DEBOUNCED'
                  ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300'
                  : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
              }`}
            >
              {lastResponse.status === 'SUCCESS' ? (
                <CheckCircle className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              ) : lastResponse.status === 'DUPLICATE_DEBOUNCED' ? (
                <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400" />
              ) : (
                <XCircle className="w-5 h-5 shrink-0 text-rose-600 dark:text-rose-400" />
              )}
              <div className="flex-1">
                <p className="font-bold">{lastResponse.message}</p>
                {lastResponse.employee && (
                  <p className="mt-1 text-[11px] opacity-90">
                    Employee: {lastResponse.employee.name} ({lastResponse.employee.id}) •{' '}
                    {lastResponse.employee.department}
                  </p>
                )}
                {lastResponse.totalWorkingHours && (
                  <p className="mt-0.5 text-[11px] font-mono">
                    Total Hours Today: {lastResponse.totalWorkingHours}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
