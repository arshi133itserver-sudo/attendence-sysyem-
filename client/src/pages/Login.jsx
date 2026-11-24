import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Lock, Mail, ArrowRight, AlertCircle, Sparkles } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await login(email, password);
      if (user.role === 'staff') {
        navigate('/my-attendance');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full flex flex-col justify-center sm:items-center p-0 sm:p-4 bg-gradient-to-br from-slate-900 via-slate-950 to-emerald-950">
      <div className="w-full sm:max-w-md min-h-[100dvh] sm:min-h-0 bg-white dark:bg-slate-900/95 sm:border sm:border-slate-200 dark:sm:border-slate-800 sm:rounded-3xl shadow-2xl px-6 py-8 sm:p-8 backdrop-blur-xl flex flex-col justify-between sm:justify-center transition-all">
        
        {/* Top Header & Logo Branding */}
        <div className="text-center pt-4 sm:pt-0 mb-6 sm:mb-8">
          <img
            src="/arshi_logo.png"
            alt="Arshi Enterprises Logo"
            className="w-18 h-18 sm:w-16 sm:h-16 mx-auto rounded-2xl shadow-xl shadow-emerald-500/30 mb-3 sm:mb-4 object-cover border border-emerald-500/30"
            onError={(e) => {
              e.target.style.display = 'none';
              if (e.target.nextElementSibling) {
                e.target.nextElementSibling.style.display = 'flex';
              }
            }}
          />
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-brand-600 to-emerald-400 items-center justify-center text-white font-black text-2xl shadow-xl shadow-brand-500/30 mb-4 hidden">
            A
          </div>
          <h2 className="text-2xl sm:text-2xl font-black tracking-wider text-slate-900 dark:text-white uppercase">
            ARSHI ENTERPRISES
          </h2>
          <p className="text-[11px] sm:text-xs text-brand-600 dark:text-brand-400 font-bold uppercase tracking-widest mt-1">
            Smart RFID Attendance System
          </p>
        </div>

        {/* Center Form Section */}
        <div className="flex-1 sm:flex-none flex flex-col justify-center">
          {error && (
            <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Employee ID / Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  required
                  placeholder="e.g. ARS-001 or your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  required
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-3 active:scale-[0.98]"
            >
              <span>{loading ? 'Authenticating...' : 'Sign In to Portal'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Bottom Footer Security Badge */}
        <div className="pt-6 sm:mt-8 sm:pt-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-center gap-2 text-slate-400 dark:text-slate-500 text-[11px] pb-4 sm:pb-0">
          <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>Encrypted Session • Official Staff & Admin Portal</span>
        </div>
      </div>
    </div>
  );
}
