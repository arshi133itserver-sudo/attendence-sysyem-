import React, { useEffect, useState } from 'react';
import { CheckCircle2, Clock, Volume2, X, Sparkles, LogIn, LogOut, ShieldCheck, HeartHandshake } from 'lucide-react';

export default function GreetingPopup({ greetingData, onClose }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (greetingData) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        if (onClose) setTimeout(onClose, 400);
      }, 5500);

      return () => clearTimeout(timer);
    }
  }, [greetingData]);

  if (!greetingData) return null;

  const isIN = greetingData.scanType === 'IN';
  const name = greetingData.employee?.name || greetingData.employeeName || 'Staff Member';
  const id = greetingData.employee?.id || greetingData.employeeId || '';
  const dept = greetingData.employee?.department || '';
  const time = greetingData.time || '';
  const photo = greetingData.employee?.photo || '';
  const hours = greetingData.totalWorkingHours || '';

  return (
    <div
      className={`fixed top-6 right-6 z-50 max-w-md w-full transition-all duration-500 ease-out transform ${
        visible ? 'translate-y-0 opacity-100 scale-100' : '-translate-y-6 opacity-0 scale-95 pointer-events-none'
      }`}
    >
      <div className={`rounded-3xl p-5 shadow-2xl backdrop-blur-xl border-2 text-white overflow-hidden relative ${
        isIN
          ? 'bg-gradient-to-br from-emerald-900/95 via-slate-900/95 to-slate-950/95 border-emerald-500/50 shadow-emerald-950/50'
          : 'bg-gradient-to-br from-blue-900/95 via-slate-900/95 to-slate-950/95 border-blue-500/50 shadow-blue-950/50'
      }`}>
        {/* Glow ambient circle */}
        <div className={`absolute -right-10 -bottom-10 w-40 h-40 rounded-full blur-3xl opacity-30 ${
          isIN ? 'bg-emerald-400' : 'bg-blue-400'
        }`} />

        <div className="flex items-start justify-between gap-3 relative z-10">
          <div className="flex items-center gap-3.5">
            {/* Avatar / Photo with Glowing Ring */}
            <div className="relative shrink-0">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-xl overflow-hidden border-2 shadow-lg ${
                isIN
                  ? 'border-emerald-400 bg-emerald-950/80 text-emerald-300'
                  : 'border-blue-400 bg-blue-950/80 text-blue-300'
              }`}>
                {photo ? (
                  <img src={photo} alt={name} className="w-full h-full object-cover" />
                ) : (
                  name.charAt(0)
                )}
              </div>
              <span className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] text-white shadow ${
                isIN ? 'bg-emerald-500' : 'bg-blue-500'
              }`}>
                {isIN ? <LogIn className="w-3 h-3" /> : <LogOut className="w-3 h-3" />}
              </span>
            </div>

            <div>
              {/* Header Badge */}
              <div className="flex items-center gap-1.5 mb-1">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                  isIN
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                }`}>
                  <Sparkles className="w-3 h-3 animate-pulse" />
                  {isIN ? 'Welcome • Entry Marked' : 'Checkout Successful • Clocked OUT'}
                </span>
                <span className="flex items-center gap-1 text-[11px] text-slate-300 font-mono">
                  <Clock className="w-3 h-3" /> {time}
                </span>
              </div>

              {/* Staff Name Greeting */}
              <h4 className="text-lg font-black text-white tracking-tight flex items-center gap-1.5">
                {name}
              </h4>
              <p className="text-xs text-slate-300 font-medium">
                {id} {dept ? `• ${dept}` : ''}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              setVisible(false);
              if (onClose) setTimeout(onClose, 300);
            }}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Greeting Banner Body */}
        <div className="mt-3.5 pt-3 border-t border-white/10 flex items-center justify-between text-xs relative z-10">
          <div className="flex items-center gap-2 text-slate-200 font-medium">
            <Volume2 className="w-4 h-4 text-brand-400 animate-pulse shrink-0" />
            <span className="italic">
              {greetingData.spokenGreeting || greetingData.greeting || (isIN ? `Welcome to Arshi Enterprises, ${name}!` : `Have a great evening, ${name}!`)}
            </span>
          </div>

          {hours && (
            <span className="shrink-0 font-mono font-bold text-xs px-2 py-0.5 rounded-lg bg-white/10 text-white ml-2">
              {hours}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
