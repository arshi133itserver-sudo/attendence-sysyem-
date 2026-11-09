import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

/**
 * Export data array to an Excel file (.xlsx)
 */
export function exportToExcel(data, filename, sheetName = 'Attendance') {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${filename}.xlsx`);
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
  doc.text(`Generated on: ${new Date().toLocaleString('en-US')}`, 200, 32);

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
