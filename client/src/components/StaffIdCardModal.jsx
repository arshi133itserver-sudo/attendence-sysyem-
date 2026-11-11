import React, { useState } from 'react';
import {
  X,
  Printer,
  CreditCard,
  Phone,
  Mail,
  Building,
  Calendar,
  ShieldCheck,
  QrCode,
  Sparkles,
  Layers,
  User,
  Radio,
  CheckCircle2,
  Users
} from 'lucide-react';

export default function StaffIdCardModal({
  isOpen,
  onClose,
  employee, // if null, show all employees
  allEmployees = []
}) {
  const [viewSide, setViewSide] = useState('both'); // 'front' | 'back' | 'both'
  const [selectedDept, setSelectedDept] = useState('All');

  if (!isOpen) return null;

  // If a single employee was passed, use that; otherwise list all active employees
  const employeesToRender = employee
    ? [employee]
    : allEmployees.filter(e => {
        if (e.status !== 'Active') return false;
        if (selectedDept !== 'All' && e.department !== selectedDept) return false;
        return true;
      });

  const departments = ['All', ...new Set(allEmployees.map(e => e.department).filter(Boolean))];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-md animate-fade-in overflow-y-auto">
      {/* Print CSS Injection */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-id-card-sheet, #printable-id-card-sheet * {
            visibility: visible !important;
          }
          #printable-id-card-sheet {
            position: absolute !important;
            display: block !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 8mm !important;
            background: white !important;
          }
          .no-print {
            display: none !important;
          }
          .id-card-print-item {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            box-shadow: none !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden my-auto no-print">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-600 to-red-600 text-white flex items-center justify-center shadow-md shadow-rose-500/20">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base sm:text-lg text-slate-900 dark:text-white flex items-center gap-2">
                <span>{employee ? `Arshi Enterprises ID Card — ${employee.fullName}` : 'All Staff ID Cards (Batch Print)'}</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                  {employeesToRender.length} {employeesToRender.length === 1 ? 'Card' : 'Cards'}
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Official Security & Identity Card (Purnia Head Office Format)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!employee && (
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-brand-500 outline-none"
              >
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d === 'All' ? 'All Departments' : d}
                  </option>
                ))}
              </select>
            )}

            {employee && (
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs">
                <button
                  onClick={() => setViewSide('front')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                    viewSide === 'front' ? 'bg-white dark:bg-slate-900 text-rose-600 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  Front
                </button>
                <button
                  onClick={() => setViewSide('back')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                    viewSide === 'back' ? 'bg-white dark:bg-slate-900 text-rose-600 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  Back
                </button>
                <button
                  onClick={() => setViewSide('both')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                    viewSide === 'both' ? 'bg-white dark:bg-slate-900 text-rose-600 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  Both
                </button>
              </div>
            )}

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-bold shadow-md shadow-red-600/20 transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>Print {employee ? 'ID Card' : 'All Cards'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-200/60 dark:bg-slate-950/60">
          
          {employeesToRender.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <Users className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p className="font-bold">No active employees found in selected department.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 justify-items-center">
              {employeesToRender.map((emp) => (
                <React.Fragment key={emp._id}>
                  {(viewSide === 'front' || viewSide === 'both' || !employee) && (
                    <OfficialArshiIdCardFront emp={emp} />
                  )}
                  {(viewSide === 'back' || viewSide === 'both' || !employee) && (
                    <OfficialArshiIdCardBack emp={emp} />
                  )}
                </React.Fragment>
              ))}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="p-3.5 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between text-[11px] text-slate-500">
          <span>
            💡 <strong>Printing Tip:</strong> Standard PVC Card Size (CR80). Select "Background Graphics: ON" in print dialog.
          </span>
          <span className="font-mono text-slate-600 dark:text-slate-400 font-bold">
            Arshi Enterprises • Security Solutions
          </span>
        </div>
      </div>

      {/* Hidden container targeted specifically by browser @media print */}
      <div id="printable-id-card-sheet" className="hidden">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px', padding: '5px' }}>
          {employeesToRender.map((emp) => (
            <React.Fragment key={emp._id}>
              <div className="id-card-print-item">
                <OfficialArshiIdCardFront emp={emp} isPrint />
              </div>
              <div className="id-card-print-item">
                <OfficialArshiIdCardBack emp={emp} isPrint />
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>

    </div>
  );
}

/**
 * EXACT Physical Arshi Enterprises ID Card Front Design
 * Matches the official Purnia Head Office ID Card sample (A to Z layout)
 */
function OfficialArshiIdCardFront({ emp, isPrint = false }) {
  const photo = emp.profilePhoto || '';
  const rawFullName = emp.fullName || 'EMPLOYEE NAME';

  // Extract potential alias in parentheses e.g. "CHETAN Kr. (UDIT)" -> mainName: "CHETAN Kr.", alias: "(UDIT)"
  let mainName = rawFullName.toUpperCase();
  let alias = '';
  const parenMatch = rawFullName.match(/^(.*?)\s*(\(.*?\))\s*$/);
  if (parenMatch) {
    mainName = parenMatch[1].toUpperCase().trim();
    alias = parenMatch[2].toUpperCase().trim();
  }

  const id = emp.employeeId || 'AE1304';
  const dept = emp.department || 'Sales & Marketing';
  const designation = emp.designation || 'Marketing Manager';
  const bloodGroup = emp.bloodGroup || 'O+';
  const mobile = emp.mobileNumber ? emp.mobileNumber.replace(/^\+91\s*/, '') : '9934602288';

  // Issue date & Valid Upto
  let issueDateStr = '01.08.2025';
  let validUptoStr = '31.07.2026';

  if (emp.joiningDate) {
    const jd = new Date(emp.joiningDate);
    const dd = String(jd.getDate()).padStart(2, '0');
    const mm = String(jd.getMonth() + 1).padStart(2, '0');
    const yyyy = jd.getFullYear();
    issueDateStr = `${dd}.${mm}.${yyyy}`;

    const vd = new Date(jd);
    vd.setFullYear(vd.getFullYear() + 1);
    const vdd = String(vd.getDate()).padStart(2, '0');
    const vmm = String(vd.getMonth() + 1).padStart(2, '0');
    const vyyyy = vd.getFullYear();
    validUptoStr = `${vdd}.${vmm}.${vyyyy}`;
  }

  return (
    <div
      className="relative w-[340px] h-[520px] rounded-[22px] overflow-hidden bg-white text-slate-900 border border-slate-300 shadow-2xl flex flex-col justify-between select-none font-sans"
      style={{
        boxShadow: isPrint ? 'none' : '0 18px 40px -10px rgba(0, 0, 0, 0.45)'
      }}
    >
      {/* Background Waves along Right Edge */}
      <svg
        className="absolute top-0 right-0 h-full w-28 pointer-events-none z-0"
        viewBox="0 0 100 520"
        fill="none"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="cyanWave" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#7dd3fc" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#38bdf8" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#0284c7" stopOpacity="0.95" />
          </linearGradient>
          <linearGradient id="goldWave" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="40%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
        </defs>

        {/* Outer Cyan Wave */}
        <path
          d="M 40 0 C 75 100, 15 220, 55 340 C 75 400, 90 470, 100 520 L 100 0 Z"
          fill="url(#cyanWave)"
        />

        {/* Inner Golden Ribbon */}
        <path
          d="M 28 0 C 60 100, 5 220, 42 340 C 58 400, 75 470, 85 520 C 78 470, 60 400, 44 340 C 8 220, 60 100, 30 0 Z"
          fill="url(#goldWave)"
        />
      </svg>

      {/* Middle-Left: Red Circular Emblem Ring with Blue Sports Car & Arshi GPS Shield */}
      <div className="absolute left-[-22px] top-[215px] w-36 h-36 rounded-full border-[11px] border-[#d8232a] bg-white z-10 flex items-center justify-center shadow-sm">
        <div className="relative w-full h-full flex items-center justify-center">
          {/* Glass Safety Dome Arc */}
          <div className="absolute inset-1.5 rounded-full border-t border-l border-slate-300/80 bg-gradient-to-tr from-transparent via-sky-100/30 to-blue-200/40 pointer-events-none" />

          {/* Blue 3D Sportscar SVG */}
          <svg className="w-16 h-10 ml-1" viewBox="0 0 120 60" fill="none">
            <defs>
              <linearGradient id="carBodyGrad" x1="0%" y1="0%" x2="100%" y2="50%">
                <stop offset="0%" stopColor="#1e3a8a" />
                <stop offset="40%" stopColor="#2563eb" />
                <stop offset="100%" stopColor="#1d4ed8" />
              </linearGradient>
            </defs>
            <path
              d="M 12 42 C 16 34, 25 28, 40 24 C 55 20, 85 20, 100 28 C 110 33, 115 38, 118 42 L 115 47 L 10 47 Z"
              fill="url(#carBodyGrad)"
            />
            <path
              d="M 45 25 C 55 21, 75 21, 88 27 L 85 34 L 40 34 Z"
              fill="#bae6fd"
              opacity="0.9"
            />
            <polygon points="12,42 18,39 20,43" fill="#fef08a" />
            <circle cx="28" cy="47" r="8" fill="#0f172a" stroke="#94a3b8" strokeWidth="2" />
            <circle cx="28" cy="47" r="4" fill="#cbd5e1" />
            <circle cx="95" cy="47" r="8" fill="#0f172a" stroke="#94a3b8" strokeWidth="2" />
            <circle cx="95" cy="47" r="4" fill="#cbd5e1" />
          </svg>

          {/* Golden Shield with "Arshi GPS" */}
          <div className="absolute right-1 top-6 w-11 h-14 bg-gradient-to-b from-amber-300 via-amber-400 to-amber-600 rounded-b-2xl border-2 border-amber-200 shadow-md flex flex-col items-center justify-center p-0.5">
            <div className="w-full bg-[#111827] rounded-t-sm py-0.5 text-center">
              <span className="text-[7.5px] font-black text-amber-300 uppercase tracking-tighter block leading-none">
                Arshi
              </span>
            </div>
            <div className="flex-1 flex items-center justify-center">
              <span className="text-[9px] font-black text-[#111827] uppercase tracking-tighter leading-none">
                GPS
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom-Left Red Curve Accent */}
      <div className="absolute left-0 bottom-0 w-28 h-28 pointer-events-none z-0">
        <svg className="w-full h-full" viewBox="0 0 100 100" fill="none">
          <path
            d="M 0 35 C 30 40, 55 70, 45 100 L 0 100 Z"
            fill="#d8232a"
          />
        </svg>
      </div>

      {/* 1. Header (Top Left) */}
      <div className="pt-4 pl-4 pr-2 text-left relative z-10">
        <h1
          className="text-[25px] font-black tracking-tight leading-none text-[#d8232a]"
          style={{ fontFamily: "'Arial Black', 'Trebuchet MS', system-ui, sans-serif" }}
        >
          Arshi Enterprises
        </h1>
        <p className="text-[11px] font-black tracking-tight text-[#102a5c] mt-0.5">
          A complete Security Solution
        </p>
      </div>

      {/* 2. Upper Content: Primary Info on Left, Employee Photo on Right */}
      <div className="px-4 pt-2.5 pb-1 flex items-start justify-between gap-2 relative z-10">
        {/* Left Info: Name, Alias, Phone, Designation */}
        <div className="flex-1 pr-1 space-y-0.5 pt-0.5">
          <h2 className="text-[21px] font-black text-[#102a5c] tracking-tight leading-tight uppercase break-words">
            {mainName}
          </h2>
          {alias && (
            <p className="text-[13.5px] font-black text-[#102a5c] leading-tight">
              {alias}
            </p>
          )}
          <p className="text-[15.5px] font-black text-[#102a5c] tracking-normal pt-0.5">
            {mobile}
          </p>
          <p className="text-[14px] font-black text-[#102a5c] leading-tight pt-0.5">
            {designation}
          </p>
        </div>

        {/* Right Photo */}
        <div className="w-[125px] h-[155px] rounded-2xl overflow-hidden border-2 border-slate-200/90 shadow-md shrink-0 bg-slate-100 flex items-center justify-center relative z-10">
          {photo ? (
            <img src={photo} alt={rawFullName} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-tr from-slate-700 via-slate-800 to-slate-900 text-white flex flex-col items-center justify-center">
              <User className="w-12 h-12 text-slate-300 mb-1" />
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">{rawFullName.slice(0, 10)}</span>
            </div>
          )}
        </div>
      </div>

      {/* 3. Middle Section: Details Table & App Icon / QR */}
      <div className="pl-32 pr-4 pt-1 pb-1 relative z-10">
        <div className="space-y-1.5 text-[11.5px] font-bold text-[#102a5c]">
          <div className="grid grid-cols-[82px_12px_1fr] items-center bg-[#f0f6fd]/80 px-2 py-0.5 rounded-md">
            <span className="font-extrabold text-[#102a5c]">Employee Id</span>
            <span className="text-center font-black">:</span>
            <span className="font-black font-mono text-[#102a5c] truncate">{id}</span>
          </div>

          <div className="grid grid-cols-[82px_12px_1fr] items-center bg-[#f0f6fd]/80 px-2 py-0.5 rounded-md">
            <span className="font-extrabold text-[#102a5c]">Department</span>
            <span className="text-center font-black">:</span>
            <span className="font-bold text-[#102a5c] truncate">{dept}</span>
          </div>

          <div className="grid grid-cols-[82px_12px_1fr] items-center bg-[#f0f6fd]/80 px-2 py-0.5 rounded-md">
            <span className="font-extrabold text-[#102a5c]">Issue Date</span>
            <span className="text-center font-black">:</span>
            <span className="font-bold font-mono text-[#102a5c]">{issueDateStr}</span>
          </div>

          <div className="grid grid-cols-[82px_12px_1fr] items-center bg-[#f0f6fd]/80 px-2 py-0.5 rounded-md">
            <span className="font-extrabold text-[#102a5c]">Valid Upto</span>
            <span className="text-center font-black">:</span>
            <span className="font-bold font-mono text-[#102a5c]">{validUptoStr}</span>
          </div>

          <div className="grid grid-cols-[82px_12px_1fr] items-center bg-[#f0f6fd]/80 px-2 py-0.5 rounded-md">
            <span className="font-extrabold text-[#102a5c]">Blood Group</span>
            <span className="text-center font-black">:</span>
            <span className="font-black text-[#102a5c]">{bloodGroup}</span>
          </div>
        </div>

        {/* CarOnline App icon & QR Code row */}
        <div className="pt-2 flex items-center justify-end gap-3">
          {/* CarOnline App Icon */}
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-b from-[#22c55e] to-[#15803d] p-0.5 shadow-md flex items-center justify-center">
              <div className="w-full h-full rounded-[10px] bg-gradient-to-tr from-[#0284c7] via-[#0ea5e9] to-[#38bdf8] flex items-center justify-center p-1">
                {/* Red Car Icon */}
                <svg className="w-5 h-4" viewBox="0 0 24 16" fill="none">
                  <path
                    d="M3 11 C4 8, 7 6, 12 6 C17 6, 20 8, 21 11 L 22 13 L 2 13 Z"
                    fill="#ef4444"
                  />
                  <circle cx="6" cy="13" r="2.5" fill="#0f172a" stroke="#fff" strokeWidth="1" />
                  <circle cx="18" cy="13" r="2.5" fill="#0f172a" stroke="#fff" strokeWidth="1" />
                </svg>
              </div>
            </div>
            <span className="text-[8px] font-black text-[#102a5c] tracking-tight mt-0.5">
              CarOnline
            </span>
          </div>

          {/* QR Code */}
          <div className="w-11 h-11 border border-slate-300 p-0.5 bg-white rounded shadow-sm flex items-center justify-center">
            <svg className="w-full h-full" viewBox="0 0 24 24" fill="none">
              <rect x="2" y="2" width="6" height="6" fill="#102a5c" />
              <rect x="16" y="2" width="6" height="6" fill="#102a5c" />
              <rect x="2" y="16" width="6" height="6" fill="#102a5c" />
              <rect x="4" y="4" width="2" height="2" fill="white" />
              <rect x="18" y="4" width="2" height="2" fill="white" />
              <rect x="4" y="18" width="2" height="2" fill="white" />
              <rect x="10" y="2" width="2" height="4" fill="#102a5c" />
              <rect x="10" y="8" width="4" height="2" fill="#102a5c" />
              <rect x="12" y="12" width="3" height="3" fill="#102a5c" />
              <rect x="16" y="14" width="4" height="2" fill="#102a5c" />
              <rect x="10" y="18" width="3" height="4" fill="#102a5c" />
              <rect x="15" y="18" width="4" height="4" fill="#102a5c" />
            </svg>
          </div>
        </div>
      </div>

      {/* 4. Bottom Footer: Phone Numbers & Purnia Headquarters Address */}
      <div className="relative z-10 pb-3 pt-1.5 px-4 text-center">
        <p className="text-[15px] font-black text-[#102a5c] tracking-tight leading-tight">
          7782808063, 9199059257
        </p>
        <div className="text-[9.5px] font-black text-[#102a5c] tracking-tight mt-0.5 leading-tight">
          <p>Near- Brajesh Automobiles Mahindra Showroom</p>
          <p>NH-31, Maranga, Purnia- 854303</p>
        </div>
      </div>
    </div>
  );
}

/**
 * ID Card Back Side Design (Regulations & Helpline)
 */
function OfficialArshiIdCardBack({ emp, isPrint = false }) {
  const name = emp.fullName || 'Employee';
  const id = emp.employeeId || 'AE1322';

  return (
    <div
      className="relative w-[340px] h-[520px] rounded-[22px] overflow-hidden bg-white text-slate-900 border border-slate-300 shadow-2xl flex flex-col justify-between p-5 select-none font-sans"
      style={{
        boxShadow: isPrint ? 'none' : '0 18px 40px -10px rgba(0, 0, 0, 0.45)'
      }}
    >
      {/* Top Slot */}
      <div className="w-full flex justify-center pb-2">
        <div className="w-11 h-2.5 rounded-full bg-slate-200 border border-slate-300 shadow-inner" />
      </div>

      {/* Header */}
      <div className="text-center pb-2 border-b border-slate-200">
        <h3 className="text-[15px] font-black tracking-tight text-[#d3202f]">
          Arshi Enterprises
        </h3>
        <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
          Instructions & Emergency Contact
        </p>
      </div>

      {/* Terms of use */}
      <div className="space-y-2 text-[10px] text-slate-700 leading-relaxed my-auto">
        <div className="flex items-start gap-1.5">
          <span className="text-red-600 font-bold">•</span>
          <span>This card is personal and property of <strong>Arshi Enterprises</strong>.</span>
        </div>
        <div className="flex items-start gap-1.5">
          <span className="text-red-600 font-bold">•</span>
          <span>Staff must scan this card at the RFID Reader during every Entry and Checkout.</span>
        </div>
        <div className="flex items-start gap-1.5">
          <span className="text-red-600 font-bold">•</span>
          <span>In case of loss or damage, report immediately to Admin / HR office.</span>
        </div>
        <div className="flex items-start gap-1.5">
          <span className="text-red-600 font-bold">•</span>
          <span>This identity badge must be surrendered upon separation from the firm.</span>
        </div>
      </div>

      {/* Return address */}
      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-center space-y-0.5">
        <p className="text-[8px] font-black uppercase tracking-wider text-slate-400">
          IF FOUND, PLEASE RETURN TO:
        </p>
        <p className="text-[10px] font-bold text-slate-900">
          Arshi Enterprises Headquarters
        </p>
        <p className="text-[8px] font-medium text-slate-600">
          Near- Brajesh Automobiles Mahindra Showroom
        </p>
        <p className="text-[8px] font-medium text-slate-600">
          NH-31, Maranga, Purnia- 854303
        </p>
        <p className="text-[9px] font-mono font-bold text-red-600 mt-1">
          Helpline: 7782808063, 9199059257
        </p>
      </div>

      {/* Signature & Seal */}
      <div className="pt-2 border-t border-slate-200 flex items-end justify-between">
        <div className="w-16 h-8 border border-dashed border-slate-300 rounded flex items-center justify-center text-[7px] font-mono text-slate-400 uppercase">
          SEAL
        </div>

        <div className="text-right">
          <div className="h-5 font-serif italic text-xs text-slate-800 font-bold pr-2">
            Arshi Auth.
          </div>
          <div className="w-24 border-t border-slate-400" />
          <span className="text-[7.5px] uppercase tracking-wider font-bold text-slate-500 block mt-0.5">
            Authorized Signatory
          </span>
        </div>
      </div>
    </div>
  );
}
