const Setting = require('../models/Setting');
const Holiday = require('../models/Holiday');
const Department = require('../models/Department');
const AuditLog = require('../models/AuditLog');

// Get current system settings
exports.getSettings = async (req, res) => {
  try {
    let setting = await Setting.findOne();
    if (!setting) {
      setting = await Setting.create({
        companyName: 'Arshi Enterprises',
        officeStartTime: '09:00',
        officeEndTime: '18:00',
        gracePeriodMinutes: 15,
        expectedWorkingHours: 8,
        halfDayThresholdHours: 4,
        overtimeThresholdHours: 8.5,
        // Male specific
        maleExpectedWorkingHours: 8,
        maleOfficeStartTime: '09:00',
        maleOfficeEndTime: '18:00',
        maleHalfDayThresholdHours: 4,
        maleOvertimeThresholdHours: 8.5,
        // Female specific
        femaleExpectedWorkingHours: 7,
        femaleOfficeStartTime: '09:30',
        femaleOfficeEndTime: '17:30',
        femaleHalfDayThresholdHours: 3.5,
        femaleOvertimeThresholdHours: 7.5,
        weeklyHolidays: [0], // Sunday
        scanCooldownSeconds: 60,
        breakDurationMinutes: 60,
        rfidApiKey: process.env.RFID_API_KEY || 'ARSHI_RFID_SECRET_KEY_2026'
      });
    } else {
      // Ensure defaults if newly added fields are missing
      let modified = false;
      if (setting.maleExpectedWorkingHours === undefined) {
        setting.maleExpectedWorkingHours = setting.expectedWorkingHours || 8;
        setting.maleOfficeStartTime = setting.officeStartTime || '09:00';
        setting.maleOfficeEndTime = setting.officeEndTime || '18:00';
        setting.maleHalfDayThresholdHours = setting.halfDayThresholdHours || 4;
        setting.maleOvertimeThresholdHours = setting.overtimeThresholdHours || 8.5;
        modified = true;
      }
      if (setting.femaleExpectedWorkingHours === undefined) {
        setting.femaleExpectedWorkingHours = 7;
        setting.femaleOfficeStartTime = '09:30';
        setting.femaleOfficeEndTime = '17:30';
        setting.femaleHalfDayThresholdHours = 3.5;
        setting.femaleOvertimeThresholdHours = 7.5;
        modified = true;
      }
      if (modified) await setting.save();
    }

    const holidays = await Holiday.find().sort({ date: 1 });
    const departments = await Department.find().sort({ name: 1 });

    return res.status(200).json({
      success: true,
      data: {
        settings: setting,
        holidays,
        departments
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch settings.', error: error.message });
  }
};

// Update attendance configuration settings
exports.updateSettings = async (req, res) => {
  try {
    const {
      companyName,
      officeStartTime,
      officeEndTime,
      gracePeriodMinutes,
      expectedWorkingHours,
      halfDayThresholdHours,
      overtimeThresholdHours,
      // Male specific
      maleExpectedWorkingHours,
      maleOfficeStartTime,
      maleOfficeEndTime,
      maleHalfDayThresholdHours,
      maleOvertimeThresholdHours,
      // Female specific
      femaleExpectedWorkingHours,
      femaleOfficeStartTime,
      femaleOfficeEndTime,
      femaleHalfDayThresholdHours,
      femaleOvertimeThresholdHours,
      weeklyHolidays,
      scanCooldownSeconds,
      breakDurationMinutes,
      rfidApiKey,
      zktecoIp,
      zktecoPort,
      zktecoCommKey,
      zktecoAutoSync
    } = req.body;

    let setting = await Setting.findOne();
    if (!setting) {
      setting = new Setting();
    }

    if (companyName) setting.companyName = companyName;
    if (officeStartTime) setting.officeStartTime = officeStartTime;
    if (officeEndTime) setting.officeEndTime = officeEndTime;
    if (gracePeriodMinutes !== undefined) setting.gracePeriodMinutes = Number(gracePeriodMinutes);
    if (expectedWorkingHours !== undefined) setting.expectedWorkingHours = Number(expectedWorkingHours);
    if (halfDayThresholdHours !== undefined) setting.halfDayThresholdHours = Number(halfDayThresholdHours);
    if (overtimeThresholdHours !== undefined) setting.overtimeThresholdHours = Number(overtimeThresholdHours);

    // Male duty hour configs
    if (maleExpectedWorkingHours !== undefined) setting.maleExpectedWorkingHours = Number(maleExpectedWorkingHours);
    if (maleOfficeStartTime) setting.maleOfficeStartTime = maleOfficeStartTime;
    if (maleOfficeEndTime) setting.maleOfficeEndTime = maleOfficeEndTime;
    if (maleHalfDayThresholdHours !== undefined) setting.maleHalfDayThresholdHours = Number(maleHalfDayThresholdHours);
    if (maleOvertimeThresholdHours !== undefined) setting.maleOvertimeThresholdHours = Number(maleOvertimeThresholdHours);

    // Female duty hour configs
    if (femaleExpectedWorkingHours !== undefined) setting.femaleExpectedWorkingHours = Number(femaleExpectedWorkingHours);
    if (femaleOfficeStartTime) setting.femaleOfficeStartTime = femaleOfficeStartTime;
    if (femaleOfficeEndTime) setting.femaleOfficeEndTime = femaleOfficeEndTime;
    if (femaleHalfDayThresholdHours !== undefined) setting.femaleHalfDayThresholdHours = Number(femaleHalfDayThresholdHours);
    if (femaleOvertimeThresholdHours !== undefined) setting.femaleOvertimeThresholdHours = Number(femaleOvertimeThresholdHours);

    if (Array.isArray(weeklyHolidays)) setting.weeklyHolidays = weeklyHolidays;
    if (scanCooldownSeconds !== undefined) setting.scanCooldownSeconds = Number(scanCooldownSeconds);
    if (breakDurationMinutes !== undefined) setting.breakDurationMinutes = Number(breakDurationMinutes);
    if (rfidApiKey) setting.rfidApiKey = rfidApiKey;
    if (zktecoIp !== undefined) setting.zktecoIp = zktecoIp.trim();
    if (zktecoPort !== undefined) setting.zktecoPort = Number(zktecoPort);
    if (zktecoCommKey !== undefined) setting.zktecoCommKey = Number(zktecoCommKey);
    if (zktecoAutoSync !== undefined) setting.zktecoAutoSync = Boolean(zktecoAutoSync);

    await setting.save();

    await AuditLog.create({
      action: 'UPDATE_SETTINGS',
      entity: 'Setting',
      entityId: setting._id.toString(),
      performedBy: req.user ? req.user._id : null,
      details: req.body,
      reason: 'Admin updated attendance configuration & gender duty hours'
    });

    return res.status(200).json({
      success: true,
      message: 'Attendance settings & gender duty hours updated successfully.',
      data: setting
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update settings.', error: error.message });
  }
};

// Add or Update Holiday (Upsert ensures re-adding deleted/existing dates works seamlessly)
exports.addHoliday = async (req, res) => {
  try {
    const { name, date, type, description } = req.body;
    if (!name || !date) {
      return res.status(400).json({ success: false, message: 'Holiday name and date are required.' });
    }

    const cleanDate = date.trim();
    const cleanName = name.trim();

    // Check if holiday exists for this date - if so, update it without throwing error!
    let holiday = await Holiday.findOne({ date: cleanDate });
    if (holiday) {
      holiday.name = cleanName;
      holiday.type = type || holiday.type || 'Company';
      holiday.description = description !== undefined ? description : holiday.description;
      await holiday.save();
      return res.status(200).json({
        success: true,
        message: `Holiday for ${cleanDate} updated successfully.`,
        data: holiday
      });
    }

    holiday = await Holiday.create({
      name: cleanName,
      date: cleanDate,
      type: type || 'Company',
      description: description || ''
    });

    return res.status(201).json({ success: true, message: 'Holiday added successfully.', data: holiday });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to add holiday.', error: error.message });
  }
};

// Delete Holiday
exports.deleteHoliday = async (req, res) => {
  try {
    const { id } = req.params;
    let deleted = null;

    if (id && id.match(/^[0-9a-fA-F]{24}$/)) {
      deleted = await Holiday.findByIdAndDelete(id);
    }
    
    // Fallback: also delete by date or name if ID not matched
    if (!deleted) {
      deleted = await Holiday.findOneAndDelete({ $or: [{ date: id }, { name: id }] });
    }

    return res.status(200).json({
      success: true,
      message: 'Holiday deleted successfully.',
      data: deleted
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to delete holiday.', error: error.message });
  }
};

// Add Department
exports.addDepartment = async (req, res) => {
  try {
    const { name, code, description } = req.body;
    if (!name || !code) {
      return res.status(400).json({ success: false, message: 'Department name and code are required.' });
    }

    const dept = await Department.create({ name, code: code.toUpperCase(), description });
    return res.status(201).json({ success: true, message: 'Department added.', data: dept });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to add department.', error: error.message });
  }
};

// Delete Department
exports.deleteDepartment = async (req, res) => {
  try {
    await Department.findByIdAndDelete(req.params.id);
    return res.status(200).json({ success: true, message: 'Department deleted.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to delete department.', error: error.message });
  }
};
