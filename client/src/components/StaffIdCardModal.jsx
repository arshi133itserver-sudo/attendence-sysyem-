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
 */
function OfficialArshiIdCardFront({ emp, isPrint = false }) {
  const photo = emp.profilePhoto || '';
  const name = (emp.fullName || 'EMPLOYEE').toUpperCase();
  const id = emp.employeeId || 'AE1322';
  const dept = emp.department || 'Back Office';
  const designation = emp.designation || 'Staff';
  const rfid = emp.rfidCardUid || '0007377834';
  const mobile = emp.mobileNumber ? emp.mobileNumber.replace(/^\+91\s*/, '') : '9297779222';

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
      className="relative w-[310px] h-[495px] rounded-[24px] overflow-hidden bg-white text-slate-900 border border-slate-300 shadow-2xl flex flex-col justify-between select-none font-sans"
      style={{
        boxShadow: isPrint ? 'none' : '0 15px 35px -10px rgba(0, 0, 0, 0.45)'
      }}
    >
      {/* Top Lanyard Oval Slot */}
      <div className="w-full flex justify-center pt-2">
        <div className="w-11 h-2.5 rounded-full bg-slate-200/90 border border-slate-300/80 shadow-inner" />
      </div>

      {/* Header: Arshi Enterprises */}
      <div className="text-center pt-1 px-4">
        <h1
          className="text-[23px] font-black tracking-tight leading-none"
          style={{ color: '#d3202f', fontFamily: 'system-ui, -apple-system, sans-serif' }}
        >
          Arshi Enterprises
        </h1>
        <p
          className="text-[10px] font-bold tracking-tight text-[#1b3a6b] mt-0.5"
        >
          A complete Security Solution
        </p>
      </div>

      {/* Upper Content: Name/Phone/Role on Left, Staff Photo on Right */}
      <div className="px-4 pt-2 pb-1 flex items-start justify-between gap-2">
        <div className="flex-1 pr-1 pt-1 space-y-1">
          {/* Name in large bold navy font */}
          <h2 className="text-[20px] font-black text-[#1e2a52] uppercase tracking-wide leading-tight break-words">
            {name}
          </h2>
          {/* Mobile number */}
          <p className="text-[13px] font-black text-[#1e293b] tracking-normal">
            {mobile}
          </p>
          {/* Designation */}
          <p className="text-[13px] font-black text-[#1e293b] capitalize tracking-tight">
            {designation}
          </p>
        </div>

        {/* Staff Portrait Photo */}
        <div className="w-[105px] h-[125px] rounded-2xl overflow-hidden border border-slate-300 shadow-sm shrink-0 bg-slate-100 flex items-center justify-center">
          {photo ? (
            <img src={photo} alt={name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-tr from-slate-700 to-slate-900 text-white font-black text-3xl flex items-center justify-center">
              {name.charAt(0)}
            </div>
          )}
        </div>
      </div>

      {/* Middle Section: Circular Arshi GPS Emblem on Left, Aligned Table on Right */}
      <div className="px-3 flex items-center justify-between gap-1 relative my-auto">
        {/* Left: Circular Crimson Emblem with Car & Arshi GPS Shield */}
        <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
          {/* Crimson Arc Graphic */}
          <div
            className="absolute inset-0 rounded-full border-[7px] border-l-transparent border-t-[#a81926] border-r-[#a81926] border-b-[#a81926]"
            style={{ transform: 'rotate(-45deg)' }}
          />

          {/* Center 3D Car & Shield Graphics */}
          <div className="relative z-10 flex flex-col items-center justify-center">
            {/* Blue Sportscar SVG representation */}
            <svg className="w-14 h-8" viewBox="0 0 100 50" fill="none">
              <path
                d="M10 35 L20 25 L40 20 L70 20 L85 28 L95 35 L90 40 L10 40 Z"
                fill="#1e40af"
              />
              <path
                d="M38 22 L65 22 L75 28 L35 28 Z"
                fill="#93c5fd"
              />
              <circle cx="25" cy="40" r="7" fill="#111827" stroke="#60a5fa" strokeWidth="2" />
              <circle cx="78" cy="40" r="7" fill="#111827" stroke="#60a5fa" strokeWidth="2" />
            </svg>

            {/* Gold Shield with Arshi GPS text */}
            <div className="relative -mt-2 bg-gradient-to-b from-amber-300 via-amber-400 to-amber-600 border border-amber-200 px-2.5 py-0.5 rounded-b-xl shadow-md text-center">
              <span className="text-[8px] font-black text-slate-950 uppercase tracking-tighter block leading-none">
                Arshi
              </span>
              <span className="text-[8px] font-black text-red-700 uppercase tracking-tighter block leading-none">
                GPS
              </span>
            </div>
          </div>
        </div>

        {/* Right: Data Field Table with perfectly aligned colons */}
        <div className="flex-1 text-[11px] font-bold text-[#0f172a] space-y-1 pl-1">
          <div className="grid grid-cols-[82px_10px_1fr] items-center">
            <span className="text-[#1e293b]">Employee Id</span>
            <span className="text-center font-bold">:</span>
            <span className="font-extrabold font-mono text-[#0f172a] truncate">{id}</span>
          </div>

          <div className="grid grid-cols-[82px_10px_1fr] items-center">
            <span className="text-[#1e293b]">Department</span>
            <span className="text-center font-bold">:</span>
            <span className="font-bold truncate">{dept}</span>
          </div>

          <div className="grid grid-cols-[82px_10px_1fr] items-center">
            <span className="text-[#1e293b]">Issue Date</span>
            <span className="text-center font-bold">:</span>
            <span className="font-mono">{issueDateStr}</span>
          </div>

          <div className="grid grid-cols-[82px_10px_1fr] items-center">
            <span className="text-[#1e293b]">Valid Upto</span>
            <span className="text-center font-bold">:</span>
            <span className="font-mono">{validUptoStr}</span>
          </div>

          <div className="grid grid-cols-[82px_10px_1fr] items-center">
            <span className="text-[#1e293b]">Blood Group</span>
            <span className="text-center font-bold">:</span>
            <span className="font-bold text-red-600">B+</span>
          </div>

          {rfid && rfid !== 'UNASSIGNED' && (
            <div className="grid grid-cols-[82px_10px_1fr] items-center">
              <span className="text-[#1e293b]">RFID Card</span>
              <span className="text-center font-bold">:</span>
              <span className="font-mono font-bold text-emerald-700 truncate">{rfid}</span>
            </div>
          )}
        </div>
      </div>

      {/* Lower Right Branding & QR Code Strip */}
      <div className="px-4 py-1 flex items-center justify-end gap-3">
        {/* CarOnline App Logo Emblem */}
        <div className="flex flex-col items-center">
          <div className="w-8 h-8 rounded-full border border-red-500 bg-gradient-to-tr from-sky-400 via-blue-600 to-indigo-700 flex items-center justify-center shadow-sm">
            <div className="w-4 h-4 rounded-full border border-white/60 bg-red-600 flex items-center justify-center">
              <span className="text-[7px] text-white font-black">C</span>
            </div>
          </div>
          <span className="text-[7px] font-black text-slate-700 uppercase tracking-tighter mt-0.5">
            CarOnline
          </span>
        </div>

        {/* Real High-Contrast Vector QR Code */}
        <div className="w-10 h-10 border border-slate-300 p-0.5 bg-white rounded shadow-sm flex items-center justify-center">
          <svg className="w-full h-full" viewBox="0 0 24 24" fill="none">
            <rect x="2" y="2" width="6" height="6" fill="#0f172a" />
            <rect x="16" y="2" width="6" height="6" fill="#0f172a" />
            <rect x="2" y="16" width="6" height="6" fill="#0f172a" />
            <rect x="4" y="4" width="2" height="2" fill="white" />
            <rect x="18" y="4" width="2" height="2" fill="white" />
            <rect x="4" y="18" width="2" height="2" fill="white" />
            <rect x="10" y="2" width="2" height="4" fill="#0f172a" />
            <rect x="10" y="8" width="4" height="2" fill="#0f172a" />
            <rect x="12" y="12" width="3" height="3" fill="#0f172a" />
            <rect x="16" y="14" width="4" height="2" fill="#0f172a" />
            <rect x="10" y="18" width="3" height="4" fill="#0f172a" />
            <rect x="15" y="18" width="4" height="4" fill="#0f172a" />
          </svg>
        </div>
      </div>

      {/* Bottom Footer with Contact & Address */}
      <div className="relative bg-gradient-to-b from-white via-slate-50 to-blue-50/70 border-t border-slate-200/80 pt-1.5 pb-2.5 px-3 text-center overflow-hidden">
        {/* Right Corner Blue & Gold Accent Swooshes */}
        <div className="absolute right-0 bottom-0 w-16 h-full pointer-events-none">
          <div className="w-full h-full bg-gradient-to-l from-blue-600/30 via-sky-400/20 to-transparent" />
          <div className="absolute right-0 bottom-0 w-4 h-full bg-blue-600/90" />
          <div className="absolute right-4 bottom-0 w-1.5 h-full bg-amber-400" />
        </div>

        {/* Contact numbers */}
        <p className="text-[13px] font-black text-[#0f172a] tracking-tight relative z-10 leading-tight">
          7782808063, 9199059257
        </p>

        {/* Purnia Address */}
        <div className="text-[8px] font-bold text-[#1e293b] tracking-tight mt-0.5 leading-tight relative z-10">
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
      className="relative w-[310px] h-[495px] rounded-[24px] overflow-hidden bg-white text-slate-900 border border-slate-300 shadow-2xl flex flex-col justify-between p-4 select-none font-sans"
      style={{
        boxShadow: isPrint ? 'none' : '0 15px 35px -10px rgba(0, 0, 0, 0.45)'
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
