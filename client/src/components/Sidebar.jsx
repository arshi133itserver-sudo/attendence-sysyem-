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
  Tablet,
  X,
  CreditCard,
  User
} from 'lucide-react';

export default function Sidebar({ isOpen, onClose }) {
  const { user, isAdmin, isStaff } = useAuth();

  const navItems = isAdmin
    ? [
        { name: 'Dashboard', path: '/', icon: LayoutDashboard },
        { name: 'Employees', path: '/employees', icon: Users },
        { name: 'Date Attendance', path: '/date-wise', icon: CalendarCheck },
        { name: 'Monthly Reports', path: '/monthly', icon: FileSpreadsheet },
        { name: 'Raw RFID Scans', path: '/raw-scans', icon: Cpu },
        { name: 'Tablet Gate Kiosk', path: '/kiosk', icon: Tablet },
        { name: 'Settings', path: '/settings', icon: Settings }
      ]
    : [
        { name: 'My Attendance Portal', path: '/my-attendance', icon: UserCheck }
      ];

  const employee = user?.employee || {};

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 w-64 bg-slate-900 text-white z-50 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Company Header with Mobile Close Button */}
        <div className="h-16 px-6 flex items-center justify-between border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
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

          {/* Close button for mobile */}
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            title="Close Menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* System Sub-tag / Role Badge */}
        <div className="px-6 py-3 border-b border-slate-800/60 bg-slate-900/50 flex items-center justify-between">
          <p className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-brand-400" />
            <span>Smart Attendance</span>
          </p>
          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
            isAdmin ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
          }`}>
            {isAdmin ? 'Admin' : 'Staff'}
          </span>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
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
                      ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30 font-bold'
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

        {/* Staff Profile Quick Card in Sidebar (for staff view) */}
        {!isAdmin && (
          <div className="p-4 mx-3 mb-3 rounded-2xl bg-slate-800/70 border border-slate-700/60 text-xs">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                {(employee.fullName || user?.name || 'S').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="font-bold text-white truncate text-xs">{employee.fullName || user?.name}</p>
                <p className="text-[10px] text-slate-400 truncate">{employee.designation || 'Staff Employee'}</p>
              </div>
            </div>
            <div className="text-[10px] text-slate-400 space-y-1 pt-1.5 border-t border-slate-700/50">
              <p className="flex items-center justify-between">
                <span>Emp ID:</span>
                <span className="font-mono font-bold text-slate-200">{employee.employeeId || 'ARS-001'}</span>
              </p>
              {employee.department && (
                <p className="flex items-center justify-between">
                  <span>Dept:</span>
                  <span className="text-slate-200 font-medium">{employee.department}</span>
                </p>
              )}
            </div>
          </div>
        )}

        {/* Device Info & Version Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40 text-[11px] text-slate-400">
          <div className="flex items-center justify-between mb-1">
            <span className="font-medium text-slate-500">Arshi Attendance</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-500/20 text-brand-400 font-mono font-bold">
              v1.0 Pro
            </span>
          </div>
        </div>
      </aside>
    </>
  );
}
