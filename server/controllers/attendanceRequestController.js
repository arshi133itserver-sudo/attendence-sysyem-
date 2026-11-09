const AttendanceRequest = require('../models/AttendanceRequest');
const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');
const Setting = require('../models/Setting');
const RawScanLog = require('../models/RawScanLog');
const AuditLog = require('../models/AuditLog');
const { recalculateAttendance, formatMinutes } = require('../services/attendanceCalculator');

function getLocalDateString(date = new Date()) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// 1. Staff Submits Selfie Attendance Request
exports.submitSelfieRequest = async (req, res) => {
  try {
    const { requestedType = 'IN', selfiePhoto, remarks = '', requestTime = new Date() } = req.body;

    if (!selfiePhoto) {
      return res.status(400).json({ success: false, message: 'Selfie photo is required to submit manual attendance.' });
    }

    // Resolve employee
    let employee = null;
    if (req.user?.employee) {
      if (typeof req.user.employee === 'object' && req.user.employee._id) {
        employee = req.user.employee;
      } else {
        employee = await Employee.findById(req.user.employee);
      }
    }

    if (!employee && req.body.employeeId) {
      const eid = req.body.employeeId;
      if (String(eid).match(/^[0-9a-fA-F]{24}$/)) {
        employee = await Employee.findById(eid);
      }
      if (!employee) {
        employee = await Employee.findOne({ employeeId: eid });
      }
    }

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee record not found for this account.' });
    }

    const snapTime = new Date(requestTime);
    const dateStr = getLocalDateString(snapTime);
    const cleanType = (requestedType || 'IN').toUpperCase();

    // Prevent duplicate pending requests of the same type within 5 minutes
    const recentPending = await AttendanceRequest.findOne({
      employee: employee._id,
      date: dateStr,
      requestedType: cleanType,
      status: 'Pending',
      createdAt: { $gte: new Date(Date.now() - 5 * 60 * 1000) }
    });

    if (recentPending) {
      return res.status(400).json({
        success: false,
        message: `A pending ${cleanType} selfie request has already been submitted. Please wait for Admin approval.`
      });
    }

    const newRequest = new AttendanceRequest({
      employee: employee._id,
      requestedType: cleanType,
      requestTime: snapTime,
      date: dateStr,
      selfiePhoto,
      remarks: remarks || `Selfie ${cleanType} request by ${employee.fullName}`,
      status: 'Pending'
    });

    await newRequest.save();

    // Log in RawScanLog for visibility
    await RawScanLog.create({
      cardUid: employee.rfidCardUid || 'SELFIE_MANUAL',
      employee: employee._id,
      deviceId: 'STAFF_SELFIE_APP',
      timestamp: snapTime,
      scanType: cleanType,
      status: 'SELFIE_PENDING',
      message: `Pending Selfie ${cleanType} request submitted by ${employee.fullName}`,
      rawPayload: { requestId: newRequest._id, remarks }
    });

    return res.status(201).json({
      success: true,
      message: `Selfie ${cleanType} attendance request submitted! It will be verified and approved by Admin.`,
      data: newRequest
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to submit selfie attendance request.', error: error.message });
  }
};

// 2. Admin: Get all Pending Selfie Requests
exports.getPendingRequests = async (req, res) => {
  try {
    const requests = await AttendanceRequest.find({ status: 'Pending' })
      .populate('employee', 'employeeId fullName department designation profilePhoto mobileNumber gender')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: requests.length,
      data: requests
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch pending requests.', error: error.message });
  }
};

// 3. Admin: Get All Selfie Requests (with status filter)
exports.getAllRequests = async (req, res) => {
  try {
    const { status, date, employeeId } = req.query;
    let query = {};

    if (status && status !== 'All') {
      query.status = status;
    }
    if (date) {
      query.date = date;
    }
    if (employeeId) {
      const emp = await Employee.findOne({ employeeId });
      if (emp) query.employee = emp._id;
    }

    const requests = await AttendanceRequest.find(query)
      .populate('employee', 'employeeId fullName department designation profilePhoto mobileNumber gender')
      .populate('reviewedBy', 'name email role')
      .sort({ createdAt: -1 })
      .limit(100);

    return res.status(200).json({
      success: true,
      count: requests.length,
      data: requests
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch requests.', error: error.message });
  }
};

// 4. Staff: Get My Submitted Requests
exports.getMyRequests = async (req, res) => {
  try {
    const employee = req.user?.employee;
    const employeeId = employee?._id || employee;
    if (!employeeId) {
      return res.status(400).json({ success: false, message: 'No employee account linked.' });
    }

    const requests = await AttendanceRequest.find({ employee: employeeId })
      .sort({ createdAt: -1 })
      .limit(30);

    return res.status(200).json({
      success: true,
      count: requests.length,
      data: requests
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch your requests.', error: error.message });
  }
};

// 5. Admin: Approve Selfie Attendance Request
exports.approveRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const request = await AttendanceRequest.findById(id).populate('employee');

    if (!request) {
      return res.status(404).json({ success: false, message: 'Selfie attendance request not found.' });
    }

    if (request.status !== 'Pending') {
      return res.status(400).json({ success: false, message: `Request is already ${request.status}.` });
    }

    const employee = request.employee;
    const snapTime = new Date(request.requestTime);
    const dateStr = request.date || getLocalDateString(snapTime);
    const cleanType = (request.requestedType || 'IN').toUpperCase();

    const setting = (await Setting.findOne()) || {};
    let attendance = await Attendance.findOne({ employee: employee._id, date: dateStr });

    if (!attendance) {
      attendance = new Attendance({
        employee: employee._id,
        date: dateStr,
        sessions: []
      });
    }

    const sessions = attendance.sessions;

    if (cleanType === 'IN') {
      sessions.push({
        inTime: snapTime,
        outTime: null,
        inDeviceId: 'SELFIE_VERIFIED',
        durationMinutes: 0
      });
    } else if (cleanType === 'OUT') {
      if (sessions.length > 0 && sessions[sessions.length - 1].outTime === null) {
        const lastSession = sessions[sessions.length - 1];
        lastSession.outTime = snapTime;
        lastSession.outDeviceId = 'SELFIE_VERIFIED';
        lastSession.durationMinutes = Math.max(0, Math.round((snapTime - lastSession.inTime) / 60000));
      } else {
        // Create completed session with standard 9am or single out
        const defaultInTime = new Date(`${dateStr}T09:00:00`);
        let actualIn = defaultInTime;
        if (snapTime < defaultInTime) actualIn = snapTime;
        sessions.push({
          inTime: actualIn,
          outTime: snapTime,
          inDeviceId: 'SELFIE_VERIFIED',
          outDeviceId: 'SELFIE_VERIFIED',
          durationMinutes: Math.max(0, Math.round((snapTime - actualIn) / 60000))
        });
      }
    }

    attendance.isManualCorrection = true;
    attendance.correctionReason = `Approved Selfie Attendance (${cleanType})`;
    attendance.correctedBy = req.user._id;

    attendance.auditHistory.push({
      modifiedAt: new Date(),
      modifiedBy: req.user._id,
      action: `SELFIE_APPROVED_${cleanType}`,
      reason: request.remarks || 'Selfie verified by Admin',
      snapshot: { type: cleanType, snapTime, requestId: request._id }
    });

    recalculateAttendance(attendance, setting, employee);
    await attendance.save();

    // Mark request as Approved
    request.status = 'Approved';
    request.reviewedBy = req.user._id;
    request.reviewedAt = new Date();
    await request.save();

    // Log raw scan
    await RawScanLog.create({
      cardUid: employee.rfidCardUid || 'SELFIE_VERIFIED',
      employee: employee._id,
      deviceId: 'SELFIE_APPROVED',
      timestamp: snapTime,
      scanType: cleanType,
      status: 'SUCCESS',
      message: `Selfie ${cleanType} approved by Admin for ${employee.fullName}`,
      rawPayload: { requestId: request._id }
    });

    await AuditLog.create({
      action: `SELFIE_ATTENDANCE_APPROVED`,
      entity: 'Attendance',
      entityId: attendance._id.toString(),
      performedBy: req.user._id,
      details: {
        employeeId: employee.employeeId,
        type: cleanType,
        snapTime,
        date: dateStr
      },
      reason: 'Selfie verified by Admin'
    });

    return res.status(200).json({
      success: true,
      message: `Selfie ${cleanType} attendance approved successfully for ${employee.fullName}!`,
      attendance,
      request
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to approve request.', error: error.message });
  }
};

// 6. Admin: Reject Selfie Attendance Request
exports.rejectRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason = 'Photo unclear or unrecognized' } = req.body;

    const request = await AttendanceRequest.findById(id).populate('employee');

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found.' });
    }

    if (request.status !== 'Pending') {
      return res.status(400).json({ success: false, message: `Request is already ${request.status}.` });
    }

    request.status = 'Rejected';
    request.rejectionReason = reason;
    request.reviewedBy = req.user._id;
    request.reviewedAt = new Date();
    await request.save();

    await AuditLog.create({
      action: `SELFIE_ATTENDANCE_REJECTED`,
      entity: 'AttendanceRequest',
      entityId: request._id.toString(),
      performedBy: req.user._id,
      details: {
        employeeId: request.employee?.employeeId,
        type: request.requestedType,
        reason
      },
      reason
    });

    return res.status(200).json({
      success: true,
      message: `Selfie request for ${request.employee?.fullName} rejected.`,
      request
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to reject request.', error: error.message });
  }
};
