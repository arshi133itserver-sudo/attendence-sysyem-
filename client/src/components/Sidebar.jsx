import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  FileSpreadsheet,
  Cpu,
  Settings,
  ShieldCheck,
  UserCheck,
  Tablet
} from 'lucide-react';

export default function Sidebar({ isOpen, onClose }) {
  const { isAdmin, isStaff } = useAuth();

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard, role: 'all' },
    { name: 'Employees', path: '/employees', icon: Users, role: 'admin' },
    { name: 'Date Attendance', path: '/date-wise', icon: CalendarCheck, role: 'all' },
    { name: 'Monthly Reports', path: '/monthly', icon: FileSpreadsheet, role: 'all' },
    ...(isStaff ? [{ name: 'My Attendance', path: '/my-attendance', icon: UserCheck, role: 'staff' }] : []),
    { name: 'Raw RFID Scans', path: '/raw-scans', icon: Cpu, role: 'admin' },
    { name: 'Tablet Gate Kiosk', path: '/kiosk', icon: Tablet, role: 'all' },
    { name: 'Settings', path: '/settings', icon: Settings, role: 'admin' }
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 w-64 bg-slate-900 text-white z-50 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Company Header */}
        <div className="h-16 px-6 flex items-center gap-3 border-b border-slate-800 bg-slate-950/60">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-emerald-400 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-brand-500/30">
            A
          </div>
          <div>
            <h1 className="font-extrabold text-sm tracking-wider uppercase text-white leading-tight">
              ARSHI
            </h1>
            <p className="text-[10px] uppercase tracking-widest text-brand-400 font-bold">
              ENTERPRISES
            </p>
          </div>
        </div>

        {/* System Sub-tag */}
        <div className="px-6 py-3 border-b border-slate-800/60 bg-slate-900/50">
          <p className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-brand-400" />
            <span>Smart RFID Attendance</span>
          </p>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            if (item.role === 'admin' && !isAdmin) return null;
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                end={item.path === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Device Info & Version Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40 text-[11px] text-slate-400">
          <div className="flex items-center justify-between mb-1">
            <span className="font-medium text-slate-500">Node.js + ESP32</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-500/20 text-brand-400 font-mono font-bold">
              v1.0 Pro
            </span>
          </div>
          <p className="text-[10px] text-slate-500 truncate">RC522 13.56MHz SPI Interface</p>
        </div>
      </aside>
    </>
  );
}
