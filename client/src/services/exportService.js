import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

/**
 * Format Indian Standard Time timestamp for export reports
 */
function getReportTimestamp() {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }).format(new Date());
}

/**
 * Generic Fallback Export data array to an Excel file with auto column widths
 */
export function exportToExcel(data, filename, sheetName = 'Attendance') {
  if (!data || data.length === 0) return;
  const ws = XLSX.utils.json_to_sheet(data);

  // Auto-calculate comfortable column widths
  const colWidths = Object.keys(data[0] || {}).map(key => {
    const maxLen = Math.max(
      key.length,
      ...data.map(row => (row[key] !== undefined && row[key] !== null ? String(row[key]).length : 0))
    );
    return { wch: Math.min(36, Math.max(12, maxLen + 3)) };
  });
  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

/**
 * Super Executive Date-Wise Daily Attendance Excel Report
 * Includes Company Header, Executive KPI Cards, Complete Data Table, and Totals
 */
export function exportDateWiseExcel(records = [], selectedDate = '', department = 'All') {
  const timestamp = getReportTimestamp();
  const deptLabel = department === 'All' ? 'All Departments' : department;

  // Calculate Executive KPIs
  const totalEmployees = records.length;
  let presentCount = 0;
  let absentCount = 0;
  let halfDayCount = 0;
  let lateCount = 0;
  let lateExitCount = 0;
  let earlyExitCount = 0;
  let totalDutyMinutes = 0;

  records.forEach(r => {
    const st = (r.status || '').toLowerCase();
    if (st.includes('present')) presentCount++;
    else if (st.includes('absent')) absentCount++;
    else if (st.includes('half')) halfDayCount++;

    if (r.isLate) lateCount++;
    if (r.isEarlyExit) earlyExitCount++;
    if (r.isLateExit === 'Yes' || r.isLateExit === true) lateExitCount++;

    // Calculate duty minutes if available
    if (r.totalWorkingMinutes) {
      totalDutyMinutes += Number(r.totalWorkingMinutes) || 0;
    } else if (r.totalWorkingHours) {
      const match = String(r.totalWorkingHours).match(/(\d+)\s*h(?:rs?)?\s*(?:(\d+)\s*m)?/i);
      if (match) {
        const h = parseInt(match[1], 10) || 0;
        const m = parseInt(match[2], 10) || 0;
        totalDutyMinutes += h * 60 + m;
      }
    }
  });

  const totalDutyHoursStr = `${Math.floor(totalDutyMinutes / 60)}h ${totalDutyMinutes % 60}m`;

  // Build Sheet Rows (AOA)
  const rows = [
    // 1. Company Banner
    ['ARSHI ENTERPRISES — SMART RFID ATTENDANCE SYSTEM'],
    // 2. Company Subtitle & Address
    ['Official Daily Employee Attendance Report | NH-31, Maranga, Purnia (Bihar) — Helpline: +91 7782808063'],
    // 3. Metadata
    [
      `Report Date: ${selectedDate}`,
      '',
      `Department: ${deptLabel}`,
      '',
      `Generated: ${timestamp}`,
      '',
      `System: Arshi Biometric Core v2.0`,
      '',
      `Total Staff Listed: ${totalEmployees}`
    ],
    [], // Blank Row 4

    // 5. Executive Summary Header
    ['📊 EXECUTIVE SUMMARY OVERVIEW'],
    // 6. Executive Summary KPIs
    [
      'Total Staff',
      totalEmployees,
      'Present Today',
      presentCount,
      'Absent',
      absentCount,
      'Half Day',
      halfDayCount,
      'Late Arrivals',
      lateCount,
      'Early Exits',
      earlyExitCount,
      'Total Duty Logged',
      totalDutyHoursStr
    ],
    [], // Blank Row 7

    // 8. Main Data Table Headers
    [
      'S.No',
      'Employee ID',
      'Staff Full Name',
      'Gender',
      'Department',
      'Designation',
      'Target Duty',
      'Attendance Status',
      'IN Time',
      'OUT Time',
      'Total Duty Hours',
      'Break Time',
      'Late Arrival',
      'Late By (Mins)',
      'Early Departure',
      'Late Checkout',
      'Overtime',
      'Punch Count',
      'Verification'
    ]
  ];

  // 9. Append Records
  records.forEach((r, idx) => {
    rows.push([
      idx + 1,
      r.employeeId || '--',
      r.fullName || '--',
      r.gender || 'Male',
      r.department || '--',
      r.designation || '--',
      `${r.expectedWorkingHours || 8}h`,
      r.status || 'Absent',
      r.inTime || '--:--',
      r.outTime || '--:--',
      r.totalWorkingHours || '0h 0m',
      r.breakDuration || '--',
      r.isLate ? 'YES (LATE)' : 'ON TIME',
      r.lateBy || '--',
      r.isEarlyExit === 'Yes' || r.isEarlyExit === true ? `YES (${r.earlyExitBy || ''})` : 'NO',
      r.isLateExit === 'Yes' || r.isLateExit === true ? `YES (+${r.lateExitBy || ''})` : 'NO',
      r.overtime || '--',
      r.sessionsCount || (r.inTime ? 1 : 0),
      r.isManualCorrection ? 'Manual Admin Edit' : 'RFID Smart Tap'
    ]);
  });

  // 10. Summary Totals Row at the bottom
  rows.push([]);
  rows.push([
    'TOTAL / SUMMARY',
    `Total: ${totalEmployees}`,
    '',
    '',
    '',
    '',
    '',
    `P: ${presentCount} | A: ${absentCount} | HD: ${halfDayCount}`,
    '',
    '',
    totalDutyHoursStr,
    '',
    `Late: ${lateCount}`,
    '',
    `Early: ${earlyExitCount}`,
    '',
    '',
    'Arshi Enterprises Verified'
  ]);

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Merges for Banners
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 17 } }, // Banner merged
    { s: { r: 1, c: 0 }, e: { r: 1, c: 17 } }, // Subtitle merged
    { s: { r: 4, c: 0 }, e: { r: 4, c: 17 } }  // Summary title merged
  ];

  // Professional Column Widths
  ws['!cols'] = [
    { wch: 6 },  // S.No
    { wch: 14 }, // Emp ID
    { wch: 26 }, // Full Name
    { wch: 10 }, // Gender
    { wch: 18 }, // Department
    { wch: 20 }, // Designation
    { wch: 12 }, // Target Duty
    { wch: 16 }, // Status
    { wch: 12 }, // IN Time
    { wch: 12 }, // OUT Time
    { wch: 16 }, // Total Duty
    { wch: 12 }, // Break
    { wch: 14 }, // Late Arrival
    { wch: 14 }, // Late By
    { wch: 16 }, // Early Exit
    { wch: 12 }, // Overtime
    { wch: 12 }, // Punches
    { wch: 20 }  // Verification
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `Daily_${selectedDate}`);
  XLSX.writeFile(wb, `Arshi_Attendance_${selectedDate}.xlsx`);
}

/**
 * Super Executive Monthly Employee Timesheet & Attendance Excel Report
 * Includes Company Banner, Profile Information, KPI Stats, and 31-Day Complete Matrix
 */
export function exportMonthlyExcel(employee, month, summary = {}, dailyRecords = []) {
  const timestamp = getReportTimestamp();

  // Sheet 1: Monthly Attendance Timesheet
  const rows = [
    // 1. Banner
    ['ARSHI ENTERPRISES — MONTHLY EMPLOYEE ATTENDANCE TIMESHEET'],
    ['Official Timesheet & Payroll Attendance Record | NH-31, Maranga, Purnia (Bihar) — Contact: +91 7782808063'],
    [],
    // 3. Employee Profile Info Box
    ['EMPLOYEE INFORMATION', '', '', '', 'ATTENDANCE SUMMARY & PAYROLL METRICS'],
    [
      'Employee ID:',
      employee.employeeId,
      '',
      '',
      'Total Calendar Days:',
      dailyRecords.length,
      'Total Working Days:',
      summary.totalWorkingDays || dailyRecords.length
    ],
    [
      'Full Name:',
      employee.fullName,
      '',
      '',
      'Present Days:',
      summary.presentDays || 0,
      'Absent Days:',
      summary.absentDays || 0
    ],
    [
      'Department:',
      employee.department,
      '',
      '',
      'Half Days:',
      summary.halfDays || 0,
      'Late Arrivals:',
      summary.lateArrivals || 0
    ],
    [
      'Designation:',
      employee.designation,
      '',
      '',
      'Total Duty Hours:',
      summary.totalWorkingHours || '0h 0m',
      'Average Daily Hours:',
      summary.averageWorkingHours || '0h 0m'
    ],
    [
      'Gender / Target:',
      `${employee.gender || 'Male'} (${employee.gender === 'Female' ? '7h Shift' : '8h Shift'})`,
      '',
      '',
      'Overtime Hours:',
      summary.overtimeHours || '0h 0m',
      'Attendance Score:',
      `${summary.attendancePercentage || 0}%`
    ],
    [
      'Report Month:',
      month,
      '',
      '',
      'Generated On:',
      timestamp,
      'Status:',
      summary.attendancePercentage >= 90 ? 'EXCELLENT' : (summary.attendancePercentage >= 75 ? 'GOOD' : 'NEEDS IMPROVEMENT')
    ],
    [], // Blank Row 11

    // 12. Main Timesheet Header
    ['📅 DAILY ATTENDANCE & PUNCH TIMESHEET'],
    [
      'Date',
      'Day',
      'Attendance Status',
      'IN Time',
      'OUT Time',
      'Working Hours',
      'Late IN',
      'Late OUT',
      'Early Exit',
      'Overtime',
      'Audit / Adjustment Notes'
    ]
  ];

  // 14. Append Daily Records
  dailyRecords.forEach(r => {
    rows.push([
      r.date,
      r.day,
      r.status,
      r.inTime || '--:--',
      r.outTime || '--:--',
      r.workingHours || '0h 0m',
      r.lateBy || '--',
      r.lateExitBy || (r.isLateExit ? 'YES' : '--'),
      r.earlyExitBy || r.earlyExit || '--',
      r.overtime || '--',
      r.isManual ? 'Manual Admin Adjustment' : 'RFID Terminal Scan'
    ]);
  });

  // Summary Row at Bottom
  rows.push([]);
  rows.push([
    'MONTH TOTALS',
    `${dailyRecords.length} Days`,
    `Present: ${summary.presentDays || 0} | Absent: ${summary.absentDays || 0}`,
    '',
    '',
    summary.totalWorkingHours || '0h 0m',
    `Late: ${summary.lateArrivals || 0}`,
    '',
    summary.overtimeHours || '0h 0m',
    'Certified by Arshi Enterprises HR'
  ]);

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Merges
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 9 } }, // Banner
    { s: { r: 1, c: 0 }, e: { r: 1, c: 9 } }, // Subtitle
    { s: { r: 3, c: 0 }, e: { r: 3, c: 2 } }, // Emp info title
    { s: { r: 3, c: 4 }, e: { r: 3, c: 8 } }, // Summary title
    { s: { r: 11, c: 0 }, e: { r: 11, c: 9 } } // Timesheet title
  ];

  // Column Widths
  ws['!cols'] = [
    { wch: 14 }, // Date
    { wch: 12 }, // Day
    { wch: 18 }, // Status
    { wch: 12 }, // IN Time
    { wch: 12 }, // OUT Time
    { wch: 16 }, // Working Hours
    { wch: 14 }, // Late By
    { wch: 14 }, // Early Exit
    { wch: 14 }, // Overtime
    { wch: 28 }  // Audit Notes
  ];

  // Sheet 2: Company HR Attendance Policy & Shift Timings Reference
  const policyRows = [
    ['ARSHI ENTERPRISES — ATTENDANCE & SHIFT POLICY REFERENCE'],
    ['Official Working Hours, Overtime, and Grace Period Rules'],
    [],
    ['Parameter', 'Male Staff', 'Female Staff', 'Policy Description'],
    ['Office Start Time', '09:00 AM', '09:30 AM', 'Standard morning punch-in time'],
    ['Office End Time', '06:00 PM', '05:30 PM', 'Standard evening punch-out time'],
    ['Standard Working Hours', '8.0 Hours', '7.0 Hours', 'Expected duty time per working day'],
    ['Grace Period Allowed', '15 Minutes', '15 Minutes', 'Arrival after grace period is marked as Late'],
    ['Half Day Threshold', '< 4.0 Hours', '< 3.5 Hours', 'Less than threshold counts as Half Day'],
    ['Overtime Qualification', '> 8.5 Hours', '> 7.5 Hours', 'Duty beyond threshold counts toward overtime'],
    [],
    ['Attendance Status Codes & Explanations:'],
    ['Status Code', 'Meaning', 'Impact on Salary'],
    ['Present', 'Staff completed full shift hours', 'Full Day Pay'],
    ['Late', 'Staff clocked in after grace cutoff', 'Late marked (3 lates = half day deduction option)'],
    ['Half Day', 'Duty between 4 to 8 hours', '0.5 Day Pay'],
    ['Absent', 'No punch recorded or < 2 hours', 'No Pay / Leave without pay'],
    ['On Leave', 'Pre-approved leave by admin', 'Paid / Casual leave according to policy'],
    ['Holiday / Weekend', 'Company holiday or Sunday', 'Paid Weekly Off']
  ];

  const wsPolicy = XLSX.utils.aoa_to_sheet(policyRows);
  wsPolicy['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } },
    { s: { r: 11, c: 0 }, e: { r: 11, c: 3 } }
  ];
  wsPolicy['!cols'] = [
    { wch: 24 },
    { wch: 16 },
    { wch: 16 },
    { wch: 50 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Monthly_Timesheet');
  XLSX.utils.book_append_sheet(wb, wsPolicy, 'Company_Policy_Rules');

  XLSX.writeFile(wb, `Monthly_Report_${employee.employeeId}_${month}.xlsx`);
}

/**
 * Export Date-Wise Attendance to formatted PDF
 */
export function exportDateWisePdf(data, date, department = 'All') {
  const doc = new jsPDF('landscape');

  // Header Branding
  doc.setFontSize(18);
  doc.setTextColor(21, 128, 61); // brand-700
  doc.text('ARSHI ENTERPRISES', 14, 18);

  doc.setFontSize(12);
  doc.setTextColor(51, 65, 85);
  doc.text('Smart RFID Employee Attendance Management System', 14, 25);

  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`Daily Attendance Report — Date: ${date} | Department: ${department}`, 14, 32);
  doc.text(`Generated on: ${getReportTimestamp()}`, 200, 32);

  // Table Columns
  const tableColumn = [
    'Emp ID',
    'Employee Name',
    'Department',
    'Status',
    'IN Time',
    'OUT Time',
    'Working Hours',
    'Break',
    'Late',
    'Early Exit',
    'Overtime'
  ];

  const tableRows = data.map(item => [
    item.employeeId,
    item.fullName,
    item.department,
    item.status,
    item.inTime,
    item.outTime,
    item.totalWorkingHours,
    item.breakDuration || '--',
    item.lateBy || '--',
    item.earlyExitBy || '--',
    item.overtime || '--'
  ]);

  doc.autoTable({
    startY: 38,
    head: [tableColumn],
    body: tableRows,
    theme: 'grid',
    styles: {
      fontSize: 9,
      cellPadding: 3
    },
    headStyles: {
      fillColor: [22, 163, 74], // brand-600
      textColor: [255, 255, 255],
      fontStyle: 'bold'
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    }
  });

  doc.save(`Arshi_Attendance_Report_${date}.pdf`);
}

/**
 * Export Monthly Employee Report to formatted PDF
 */
export function exportMonthlyPdf(employee, month, summary, dailyRecords) {
  const doc = new jsPDF('portrait');

  // Company Header
  doc.setFontSize(18);
  doc.setTextColor(21, 128, 61);
  doc.text('ARSHI ENTERPRISES', 14, 18);

  doc.setFontSize(12);
  doc.setTextColor(51, 65, 85);
  doc.text('Monthly Employee Attendance & Timesheet Report', 14, 25);

  // Employee & Summary Details Box
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(`Employee: ${employee.fullName} (${employee.employeeId})`, 14, 34);
  doc.text(`Department: ${employee.department} | Designation: ${employee.designation}`, 14, 40);
  doc.text(`Month: ${month} | Attendance: ${summary.attendancePercentage}%`, 14, 46);

  // Summary Metrics Bar
  doc.setTextColor(71, 85, 105);
  doc.text(
    `Working Days: ${summary.totalWorkingDays} | Present: ${summary.presentDays} | Absent: ${summary.absentDays} | Half: ${summary.halfDays} | Late: ${summary.lateArrivals}`,
    14,
    53
  );
  doc.text(
    `Total Hours: ${summary.totalWorkingHours} | Avg Hours/Day: ${summary.averageWorkingHours} | Overtime: ${summary.overtimeHours}`,
    14,
    59
  );

  const tableColumn = ['Date', 'Day', 'Status', 'IN Time', 'OUT Time', 'Working Hours', 'Late', 'Overtime'];
  const tableRows = dailyRecords.map(r => [
    r.date,
    r.day,
    r.status,
    r.inTime,
    r.outTime,
    r.workingHours,
    r.lateBy,
    r.overtime
  ]);

  doc.autoTable({
    startY: 65,
    head: [tableColumn],
    body: tableRows,
    theme: 'striped',
    styles: {
      fontSize: 8,
      cellPadding: 2.5
    },
    headStyles: {
      fillColor: [22, 163, 74],
      textColor: [255, 255, 255],
      fontStyle: 'bold'
    }
  });

  doc.save(`Monthly_Report_${employee.employeeId}_${month}.pdf`);
}
