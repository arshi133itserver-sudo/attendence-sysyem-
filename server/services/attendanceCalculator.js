/**
 * Attendance Calculator Service for Arshi Enterprises
 * Calculates sessions, working minutes, breaks, late arrivals, early exits, and overtime.
 */

/**
 * Parse "HH:mm" time string into a Date object on the specified date string (YYYY-MM-DD) locked to IST (+05:30)
 */
function parseTimeToDate(dateStr, timeStr) {
  // Ensure formatted time string "HH:mm"
  const [h, m] = timeStr.split(':').map(v => String(v).padStart(2, '0'));
  return new Date(`${dateStr}T${h}:${m}:00+05:30`);
}

/**
 * Re-calculate totals and statuses for an attendance document given the settings
 * @param {Object} attendanceDoc - The Mongoose attendance document or plain object
 * @param {Object} settings - System attendance settings
 */
function recalculateAttendance(attendanceDoc, settings, employee = null) {
  const {
    officeStartTime = '09:00',
    officeEndTime = '18:00',
    gracePeriodMinutes = 15,
    expectedWorkingHours = 8,
    halfDayThresholdHours = 4,
    overtimeThresholdHours = 8.5,
    // Male specific
    maleExpectedWorkingHours = 8,
    maleOfficeStartTime = '09:00',
    maleOfficeEndTime = '18:00',
    maleHalfDayThresholdHours = 4,
    maleOvertimeThresholdHours = 8.5,
    // Female specific
    femaleExpectedWorkingHours = 7,
    femaleOfficeStartTime = '09:30',
    femaleOfficeEndTime = '17:30',
    femaleHalfDayThresholdHours = 3.5,
    femaleOvertimeThresholdHours = 7.5
  } = settings || {};

  // Resolve employee gender & optional custom duty hours
  const emp = employee || attendanceDoc.employee;
  const gender = (emp && emp.gender) ? emp.gender : (attendanceDoc.employeeGender || 'Male');
  const customHours = (emp && emp.customWorkingHours) ? Number(emp.customWorkingHours) : null;

  let targetExpectedHours = expectedWorkingHours;
  let targetOfficeStart = officeStartTime;
  let targetOfficeEnd = officeEndTime;
  let targetHalfDayHours = halfDayThresholdHours;
  let targetOvertimeThreshold = overtimeThresholdHours;

  if (gender === 'Female') {
    targetExpectedHours = customHours || femaleExpectedWorkingHours || 7;
    targetOfficeStart = femaleOfficeStartTime || '09:30';
    targetOfficeEnd = femaleOfficeEndTime || '17:30';
    targetHalfDayHours = femaleHalfDayThresholdHours || (targetExpectedHours / 2) || 3.5;
    targetOvertimeThreshold = femaleOvertimeThresholdHours || (targetExpectedHours + 0.5) || 7.5;
  } else {
    targetExpectedHours = customHours || maleExpectedWorkingHours || expectedWorkingHours || 8;
    targetOfficeStart = maleOfficeStartTime || officeStartTime || '09:00';
    targetOfficeEnd = maleOfficeEndTime || officeEndTime || '18:00';
    targetHalfDayHours = maleHalfDayThresholdHours || halfDayThresholdHours || 4;
    targetOvertimeThreshold = maleOvertimeThresholdHours || overtimeThresholdHours || 8.5;
  }

  // Persist resolved duty hours & gender
  attendanceDoc.expectedWorkingHours = targetExpectedHours;
  attendanceDoc.employeeGender = gender;

  let totalWorkingMinutes = 0;
  let breakMinutes = 0;
  let firstInTime = null;
  let lastOutTime = null;

  const sessions = attendanceDoc.sessions || [];

  for (let i = 0; i < sessions.length; i++) {
    const session = sessions[i];

    if (!firstInTime && session.inTime) {
      firstInTime = new Date(session.inTime);
    }

    if (session.outTime) {
      let outD = new Date(session.outTime);
      const inD = new Date(session.inTime);

      // Smart detection: If outTime <= inTime on the same date and outTime was entered in 12-hr format (e.g. 06:00 instead of 18:00)
      if (outD <= inD) {
        const potentialOut = new Date(outD.getTime() + 12 * 60 * 60 * 1000);
        if (potentialOut > inD && (potentialOut.getTime() - inD.getTime()) <= 16 * 60 * 60 * 1000) {
          outD = potentialOut;
          session.outTime = potentialOut;
        }
      }

      const duration = Math.max(0, Math.round((outD.getTime() - inD.getTime()) / 60000));
      session.durationMinutes = duration;
      totalWorkingMinutes += duration;
      lastOutTime = outD;
    } else {
      session.durationMinutes = 0;
    }

    // Calculate break between this session's outTime and next session's inTime
    if (i > 0 && sessions[i - 1].outTime && session.inTime) {
      const prevOut = new Date(sessions[i - 1].outTime);
      const currIn = new Date(session.inTime);
      const gap = Math.max(0, Math.round((currIn.getTime() - prevOut.getTime()) / 60000));
      breakMinutes += gap;
    }
  }

  attendanceDoc.firstInTime = firstInTime;
  attendanceDoc.lastOutTime = lastOutTime;
  attendanceDoc.totalWorkingMinutes = totalWorkingMinutes;
  attendanceDoc.breakMinutes = breakMinutes;

  // Calculate Early Arrival or Late Arrival using targetOfficeStart
  if (firstInTime) {
    const scheduledStart = parseTimeToDate(attendanceDoc.date, targetOfficeStart);
    const graceCutoff = new Date(scheduledStart.getTime() + gracePeriodMinutes * 60000);

    if (firstInTime < scheduledStart) {
      attendanceDoc.isEarlyIn = true;
      attendanceDoc.earlyByMinutes = Math.max(0, Math.round((scheduledStart.getTime() - firstInTime.getTime()) / 60000));
      attendanceDoc.isLate = false;
      attendanceDoc.lateByMinutes = 0;
    } else if (firstInTime > graceCutoff) {
      attendanceDoc.isLate = true;
      attendanceDoc.lateByMinutes = Math.max(0, Math.round((firstInTime.getTime() - scheduledStart.getTime()) / 60000));
      attendanceDoc.isEarlyIn = false;
      attendanceDoc.earlyByMinutes = 0;
    } else {
      // On time (between scheduledStart and graceCutoff)
      attendanceDoc.isLate = false;
      attendanceDoc.lateByMinutes = 0;
      attendanceDoc.isEarlyIn = false;
      attendanceDoc.earlyByMinutes = 0;
    }
  } else {
    attendanceDoc.isLate = false;
    attendanceDoc.lateByMinutes = 0;
    attendanceDoc.isEarlyIn = false;
    attendanceDoc.earlyByMinutes = 0;
  }

  // Calculate Early Exit or Late Checkout using gender-specific targetOfficeEnd
  if (lastOutTime) {
    const scheduledEnd = parseTimeToDate(attendanceDoc.date, targetOfficeEnd);
    if (lastOutTime < scheduledEnd) {
      attendanceDoc.isEarlyExit = true;
      attendanceDoc.earlyExitMinutes = Math.max(0, Math.round((scheduledEnd.getTime() - lastOutTime.getTime()) / 60000));
      attendanceDoc.isLateExit = false;
      attendanceDoc.lateExitMinutes = 0;
    } else if (lastOutTime > scheduledEnd) {
      attendanceDoc.isLateExit = true;
      attendanceDoc.lateExitMinutes = Math.max(0, Math.round((lastOutTime.getTime() - scheduledEnd.getTime()) / 60000));
      attendanceDoc.isEarlyExit = false;
      attendanceDoc.earlyExitMinutes = 0;
    } else {
      attendanceDoc.isEarlyExit = false;
      attendanceDoc.earlyExitMinutes = 0;
      attendanceDoc.isLateExit = false;
      attendanceDoc.lateExitMinutes = 0;
    }
  } else {
    attendanceDoc.isEarlyExit = false;
    attendanceDoc.earlyExitMinutes = 0;
    attendanceDoc.isLateExit = false;
    attendanceDoc.lateExitMinutes = 0;
  }

  // Overtime Calculation using gender-specific targetOvertimeThreshold and targetExpectedHours
  const overtimeThresholdMinutes = targetOvertimeThreshold * 60;
  if (totalWorkingMinutes > overtimeThresholdMinutes) {
    attendanceDoc.isOvertime = true;
    attendanceDoc.overtimeMinutes = Math.round(totalWorkingMinutes - (targetExpectedHours * 60));
  } else {
    attendanceDoc.isOvertime = false;
    attendanceDoc.overtimeMinutes = 0;
  }

  // Determine overall status using gender-specific targetHalfDayHours
  const halfDayMinutes = targetHalfDayHours * 60;
  if (totalWorkingMinutes === 0) {
    if (attendanceDoc.status === 'Holiday' || attendanceDoc.status === 'Weekend' || attendanceDoc.status === 'Absent') {
      // Preserve explicit Holiday / Weekend / Absent status
    } else {
      attendanceDoc.status = attendanceDoc.isLate ? 'Late' : 'Present';
    }
  } else if (totalWorkingMinutes < halfDayMinutes) {
    attendanceDoc.status = 'Half-Day';
  } else if (attendanceDoc.isLate) {
    attendanceDoc.status = 'Late';
  } else {
    attendanceDoc.status = 'Present';
  }

  return attendanceDoc;
}

/**
 * Format minutes into readable "Xh Ym" string
 */
function formatMinutes(minutes) {
  if (!minutes || minutes <= 0) return '0h 00m';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${h}h ${m < 10 ? '0' : ''}${m}m`;
}

module.exports = {
  parseTimeToDate,
  recalculateAttendance,
  formatMinutes
};
