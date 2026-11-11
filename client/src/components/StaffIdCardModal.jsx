import React, { useState } from 'react';
import {
  X,
  Printer,
  CreditCard,
  Users
} from 'lucide-react';
import {
  ID_CAR_LOGO,
  ID_CARONLINE_LOGO,
  ID_QR_CODE,
  ID_DEFAULT_PHOTO
} from '../assets/idCardAssets';

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
        <div className="p-6 overflow-y-auto flex-1 bg-slate-200/70 dark:bg-slate-950/70">
          
          {employeesToRender.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <Users className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p className="font-bold">No active employees found in selected department.</p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-8 justify-center items-center">
              {employeesToRender.map((emp) => (
                <div key={emp._id} className="flex flex-wrap gap-4 justify-center items-center">
                  {(viewSide === 'front' || viewSide === 'both' || !employee) && (
                    <OfficialArshiIdCardFront emp={emp} />
                  )}
                  {(viewSide === 'back' || viewSide === 'both' || !employee) && (
                    <OfficialArshiIdCardBack emp={emp} />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="p-3.5 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between text-[11px] text-slate-500">
          <span>
            💡 <strong>Printing Tip:</strong> Standard PVC Card Size (CR80, 54mm × 86mm). Turn on "Background Graphics" in the print settings.
          </span>
          <span className="font-mono text-slate-600 dark:text-slate-400 font-bold">
            Arshi Enterprises • Security Solutions
          </span>
        </div>
      </div>

      {/* Hidden container targeted specifically by browser @media print */}
      <div id="printable-id-card-sheet" className="hidden">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'center', padding: '5px' }}>
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
 * Matches the official Purnia Head Office ID Card template 100% pixel-perfect (A to Z)
 */
export function OfficialArshiIdCardFront({ emp, isPrint = false }) {
  const photo = emp.profilePhoto || ID_DEFAULT_PHOTO;
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

  const gradId = `bl_${id.replace(/[^a-zA-Z0-9]/g, '_')}`;
  const bgId = `bg_${id.replace(/[^a-zA-Z0-9]/g, '_')}`;

  return (
    <div
      style={{
        position: 'relative',
        width: '300px',
        height: '400px',
        background: '#fff',
        overflow: 'hidden',
        boxShadow: isPrint ? 'none' : '0 4px 15px rgba(0,0,0,0.3)',
        WebkitPrintColorAdjust: 'exact',
        printColorAdjust: 'exact',
        fontFamily: 'Arial, Helvetica, sans-serif',
        borderRadius: isPrint ? '0px' : '8px',
        boxSizing: 'border-box'
      }}
    >
      {/* Background SVG Decor */}
      <svg
        width="300"
        height="400"
        viewBox="0 0 300 400"
        style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none' }}
      >
        <defs>
          <linearGradient id={bgId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff" />
            <stop offset="1" stopColor="#f1f1f1" />
          </linearGradient>
          <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#2aa6d8" />
            <stop offset="1" stopColor="#0b78b5" />
          </linearGradient>
        </defs>
        <rect width="300" height="400" fill={`url(#${bgId})`} />
        <path d="M300 300 C282 330 278 365 286 400 L300 400Z" fill={`url(#${gradId})`} />
        <path d="M290 290 C270 325 266 365 272 400 L278 400 C272 365 276 325 296 292Z" fill="#f6dd8f" />
        <circle cx="47" cy="277" r="89" fill="#e3000f" />
        <polygon points="63,405 -9,346 118.5,330" fill="#e3000f" />
        <circle cx="47" cy="277" r="70" fill="#fff" />
      </svg>

      {/* Header Logo */}
      <div
        style={{
          position: 'absolute',
          top: '8px',
          left: 0,
          right: 0,
          textAlign: 'center',
          zIndex: 1
        }}
      >
        <h1
          style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontSize: '23px',
            color: '#c8102e',
            fontWeight: 'bold',
            lineHeight: 1.1,
            margin: 0
          }}
        >
          Arshi Enterprises
        </h1>
        <p
          style={{
            fontSize: '8px',
            color: '#222',
            fontFamily: 'Georgia, serif',
            fontWeight: 'bold',
            margin: 0
          }}
        >
          A complete Security Solution
        </p>
      </div>

      {/* Info Block (Left) */}
      <div
        style={{
          position: 'absolute',
          top: '88px',
          left: 0,
          width: '155px',
          textAlign: 'center',
          color: '#0b2a6f',
          zIndex: 1
        }}
      >
        <div style={{ fontSize: '22px', fontWeight: 'bold', lineHeight: 1.1 }}>
          {mainName}
        </div>
        {alias && (
          <div style={{ fontSize: '13px', fontWeight: 'bold', marginTop: '2px' }}>
            {alias}
          </div>
        )}
        <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#0b2a6f', marginTop: '8px' }}>
          {mobile}
        </div>
        <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#222', marginTop: '3px' }}>
          {designation}
        </div>
      </div>

      {/* Photo (Right) */}
      <img
        src={photo}
        alt={rawFullName}
        style={{
          position: 'absolute',
          top: '55px',
          left: '155px',
          width: '145px',
          height: '158px',
          objectFit: 'cover',
          zIndex: 1
        }}
      />

      {/* Car Logo inside circle */}
      <img
        src={ID_CAR_LOGO}
        alt="Arshi GPS"
        style={{
          position: 'absolute',
          left: '9px',
          top: '238px',
          width: '97px',
          height: '66px',
          mixBlendMode: 'multiply',
          zIndex: 1
        }}
      />

      {/* Details Table */}
      <table
        style={{
          position: 'absolute',
          top: '222px',
          left: '147px',
          width: '153px',
          borderCollapse: 'collapse',
          fontSize: '8px',
          fontWeight: 'bold',
          color: '#0b2a6f',
          zIndex: 1
        }}
      >
        <tbody>
          <tr>
            <td style={{ textAlign: 'right', paddingRight: '3px', whiteSpace: 'nowrap', padding: '2.2px 0' }}>Employee Id</td>
            <td style={{ width: '8px', textAlign: 'center', padding: '2.2px 0' }}>:</td>
            <td style={{ paddingLeft: '3px', whiteSpace: 'nowrap', padding: '2.2px 0' }}>{id}</td>
          </tr>
          <tr>
            <td style={{ textAlign: 'right', paddingRight: '3px', whiteSpace: 'nowrap', padding: '2.2px 0' }}>Department</td>
            <td style={{ width: '8px', textAlign: 'center', padding: '2.2px 0' }}>:</td>
            <td style={{ paddingLeft: '3px', whiteSpace: 'nowrap', padding: '2.2px 0' }}>{dept}</td>
          </tr>
          <tr>
            <td style={{ textAlign: 'right', paddingRight: '3px', whiteSpace: 'nowrap', padding: '2.2px 0' }}>Issue Date</td>
            <td style={{ width: '8px', textAlign: 'center', padding: '2.2px 0' }}>:</td>
            <td style={{ paddingLeft: '3px', whiteSpace: 'nowrap', padding: '2.2px 0' }}>{issueDateStr}</td>
          </tr>
          <tr>
            <td style={{ textAlign: 'right', paddingRight: '3px', whiteSpace: 'nowrap', padding: '2.2px 0' }}>Valid Upto</td>
            <td style={{ width: '8px', textAlign: 'center', padding: '2.2px 0' }}>:</td>
            <td style={{ paddingLeft: '3px', whiteSpace: 'nowrap', padding: '2.2px 0' }}>{validUptoStr}</td>
          </tr>
          <tr>
            <td style={{ textAlign: 'right', paddingRight: '3px', whiteSpace: 'nowrap', padding: '2.2px 0' }}>Blood Group</td>
            <td style={{ width: '8px', textAlign: 'center', padding: '2.2px 0' }}>:</td>
            <td style={{ paddingLeft: '3px', whiteSpace: 'nowrap', padding: '2.2px 0' }}>{bloodGroup}</td>
          </tr>
        </tbody>
      </table>

      {/* CarOnline & QR code */}
      <img
        src={ID_CARONLINE_LOGO}
        alt="CarOnline"
        style={{
          position: 'absolute',
          left: '171px',
          top: '301px',
          width: '42px',
          zIndex: 1
        }}
      />
      <img
        src={ID_QR_CODE}
        alt="QR Code"
        style={{
          position: 'absolute',
          left: '224px',
          top: '301px',
          width: '44px',
          zIndex: 1
        }}
      />

      {/* Footer */}
      <div
        style={{
          position: 'absolute',
          top: '358px',
          left: '118px',
          width: '175px',
          textAlign: 'center',
          color: '#0b2a6f',
          fontWeight: 'bold',
          zIndex: 1
        }}
      >
        <div style={{ fontSize: '14.5px', whiteSpace: 'nowrap', marginLeft: '-6px' }}>
          7782808063, 9199059257
        </div>
        <div style={{ fontSize: '7px', lineHeight: 1.25, marginTop: '2px', whiteSpace: 'nowrap' }}>
          Near- Brajesh Automobiles Mahindra Showroom<br />
          NH-31,Maranga, Purnia- 854303
        </div>
      </div>
    </div>
  );
}

/**
 * ID Card Back Side Design (Matching 300px × 400px PVC Card Format)
 */
export function OfficialArshiIdCardBack({ emp, isPrint = false }) {
  return (
    <div
      style={{
        position: 'relative',
        width: '300px',
        height: '400px',
        background: '#fff',
        overflow: 'hidden',
        boxShadow: isPrint ? 'none' : '0 4px 15px rgba(0,0,0,0.3)',
        WebkitPrintColorAdjust: 'exact',
        printColorAdjust: 'exact',
        fontFamily: 'Arial, Helvetica, sans-serif',
        borderRadius: isPrint ? '0px' : '8px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        boxSizing: 'border-box'
      }}
    >
      {/* Top Header */}
      <div style={{ textAlign: 'center', borderBottom: '1.5px solid #0b2a6f', paddingBottom: '6px' }}>
        <h3 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: '18px', color: '#c8102e', fontWeight: 'bold', margin: 0 }}>
          Arshi Enterprises
        </h3>
        <p style={{ fontSize: '7.5px', color: '#222', fontFamily: 'Georgia, serif', fontWeight: 'bold', margin: '2px 0 0 0' }}>
          A complete Security Solution
        </p>
      </div>

      {/* Rules & Instructions */}
      <div style={{ fontSize: '8.5px', color: '#1e293b', lineHeight: 1.45, margin: '6px 0' }}>
        <div style={{ fontWeight: 'bold', color: '#0b2a6f', marginBottom: '4px', textTransform: 'uppercase', fontSize: '8px', letterSpacing: '0.5px' }}>
          Cardholder Instructions:
        </div>
        <ul style={{ margin: 0, paddingLeft: '14px' }}>
          <li style={{ marginBottom: '3px' }}>This Identity Card is the personal property of <strong>Arshi Enterprises</strong>.</li>
          <li style={{ marginBottom: '3px' }}>Staff must scan this card at the RFID terminal for each Entry and Checkout.</li>
          <li style={{ marginBottom: '3px' }}>Loss or damage of this badge must be immediately reported to Administration.</li>
          <li>This card must be surrendered upon separation from the company.</li>
        </ul>
      </div>

      {/* Emergency & Address Box */}
      <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '6px 8px', textAlign: 'center' }}>
        <div style={{ fontSize: '7px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          IF FOUND, PLEASE RETURN TO:
        </div>
        <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#0b2a6f', marginTop: '2px' }}>
          Arshi Enterprises Head Office
        </div>
        <div style={{ fontSize: '7px', color: '#334155', lineHeight: 1.3 }}>
          Near- Brajesh Automobiles Mahindra Showroom<br />
          NH-31, Maranga, Purnia- 854303 (Bihar)
        </div>
        <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#c8102e', marginTop: '4px' }}>
          Helpline: 7782808063, 9199059257
        </div>
      </div>

      {/* Signature & Seal Footer */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: '6px' }}>
        <div style={{ border: '1px dashed #94a3b8', borderRadius: '4px', width: '55px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '7px', color: '#94a3b8', fontWeight: 'bold' }}>
          SEAL
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: "Georgia, serif", fontStyle: 'italic', fontSize: '10px', color: '#0b2a6f', fontWeight: 'bold', paddingRight: '4px' }}>
            Authorized
          </div>
          <div style={{ width: '85px', borderTop: '1px solid #475569', marginTop: '2px' }} />
          <span style={{ fontSize: '7px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase', display: 'block', marginTop: '1px' }}>
            Authorized Signatory
          </span>
        </div>
      </div>
    </div>
  );
}
