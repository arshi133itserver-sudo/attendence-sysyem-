const Employee = require('../models/Employee');
const RfidCard = require('../models/RfidCard');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const bcrypt = require('bcryptjs');

// Get all employees with optional filters
exports.getEmployees = async (req, res) => {
  try {
    const { search, department, status, gender, page, limit } = req.query;
    let query = {};

    if (status && status !== 'All' && status !== 'undefined' && status !== 'null') {
      query.status = status;
    }

    if (department && department !== 'All' && department !== 'undefined' && department !== 'null') {
      query.department = department;
    }

    if (gender && gender !== 'All' && gender !== 'undefined' && gender !== 'null') {
      query.gender = gender;
    }

    if (search) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { fullName: searchRegex },
        { employeeId: searchRegex },
        { email: searchRegex },
        { mobileNumber: searchRegex },
        { rfidCardUid: searchRegex },
        { designation: searchRegex }
      ];
    }

    const employees = await Employee.find(query).sort({ employeeId: 1 });
    const total = await Employee.countDocuments(query);

    // Map user portal login accounts
    const userAccounts = await User.find({ employee: { $in: employees.map(e => e._id) } });
    const userMap = new Map();
    userAccounts.forEach(u => userMap.set(u.employee.toString(), u));

    const dataWithAccounts = employees.map(emp => {
      const u = userMap.get(emp._id.toString());
      return {
        ...emp.toObject(),
        hasLoginAccount: !!u,
        loginEmail: u ? u.email : emp.email
      };
    });

    return res.status(200).json({
      success: true,
      count: dataWithAccounts.length,
      total,
      data: dataWithAccounts
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve employees.', error: error.message });
  }
};

// Generate next available Employee ID (e.g. ARS-001, ARS-002)
exports.getNextEmployeeId = async (req, res) => {
  try {
    const lastEmployee = await Employee.findOne({ employeeId: /^ARS-\d+$/ }).sort({ employeeId: -1 });
    let nextNumber = 1;

    if (lastEmployee && lastEmployee.employeeId) {
      const parts = lastEmployee.employeeId.split('-');
      if (parts.length === 2) {
        const num = parseInt(parts[1], 10);
        if (!isNaN(num)) {
          nextNumber = num + 1;
        }
      }
    }

    const nextId = `ARS-${String(nextNumber).padStart(3, '0')}`;
    return res.status(200).json({ success: true, nextId });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to generate ID.', error: error.message });
  }
};

// Get single employee by ID
exports.getEmployeeById = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found.' });
    }

    return res.status(200).json({ success: true, data: employee });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch employee.', error: error.message });
  }
};

// Create new employee
exports.createEmployee = async (req, res) => {
  try {
    const {
      employeeId,
      fullName,
      email,
      mobileNumber,
      department,
      designation,
      joiningDate,
      salary,
      gender,
      customWorkingHours,
      rfidCardUid,
      biometricEnrollId,
      status,
      profilePhoto
    } = req.body;

    if (!fullName || !email || !mobileNumber || !department || !designation) {
      return res.status(400).json({ success: false, message: 'Please provide all required employee fields.' });
    }

    // Auto-generate employeeId if not given
    let finalEmpId = employeeId;
    if (!finalEmpId) {
      const count = await Employee.countDocuments();
      finalEmpId = `ARS-${String(count + 1).padStart(3, '0')}`;
    }

    // Check duplicate employeeId
    const existingId = await Employee.findOne({ employeeId: finalEmpId.toUpperCase().trim() });
    if (existingId) {
      return res.status(400).json({ success: false, message: `Employee ID ${finalEmpId} is already in use.` });
    }

    // Check duplicate email
    const existingEmail = await Employee.findOne({ email: email.toLowerCase().trim() });
    if (existingEmail) {
      return res.status(400).json({ success: false, message: `Email ${email} is already registered.` });
    }

    // Check duplicate RFID UID if provided
    let cleanUid = rfidCardUid ? rfidCardUid.toUpperCase().trim() : null;
    if (cleanUid) {
      const existingCard = await RfidCard.findOne({ cardUid: cleanUid });
      if (existingCard && existingCard.status === 'Active' && existingCard.employee) {
        return res.status(400).json({
          success: false,
          message: `RFID Card UID "${cleanUid}" is already assigned to another active employee.`
        });
      }
    }

    const newEmployee = new Employee({
      employeeId: finalEmpId.toUpperCase().trim(),
      fullName: fullName.trim(),
      email: email.toLowerCase().trim(),
      mobileNumber: mobileNumber.trim(),
      department: department.trim(),
      designation: designation.trim(),
      joiningDate: joiningDate || Date.now(),
      salary: salary ? Number(salary) : 0,
      gender: gender === 'Female' ? 'Female' : 'Male',
      customWorkingHours: customWorkingHours ? Number(customWorkingHours) : null,
      rfidCardUid: cleanUid,
      biometricEnrollId: biometricEnrollId ? String(biometricEnrollId).trim() : null,
      status: status || 'Active',
      profilePhoto: profilePhoto || ''
    });

    await newEmployee.save();

    // Register or update RfidCard record
    if (cleanUid) {
      await RfidCard.findOneAndUpdate(
        { cardUid: cleanUid },
        {
          cardUid: cleanUid,
          employee: newEmployee._id,
          status: 'Active',
          assignedAt: new Date(),
          remarks: `Assigned to ${newEmployee.fullName} (${newEmployee.employeeId})`
        },
        { upsert: true, new: true }
      );
    }

    // Optionally create Portal User Account
    if (req.body.password || req.body.createPortalAccount) {
      try {
        const staffPassword = req.body.password || 'staff123';
        const hashedPassword = await bcrypt.hash(staffPassword, 10);
        await User.findOneAndUpdate(
          { employee: newEmployee._id },
          {
            name: newEmployee.fullName,
            email: (req.body.loginEmail || newEmployee.email).toLowerCase().trim(),
            password: hashedPassword,
            role: 'staff',
            employee: newEmployee._id,
            isActive: true
          },
          { upsert: true, new: true }
        );
      } catch (err) {
        console.error('Failed to auto-create user account:', err.message);
      }
    }

    // Create Audit Log
    await AuditLog.create({
      action: 'CREATE_EMPLOYEE',
      entity: 'Employee',
      entityId: newEmployee._id.toString(),
      performedBy: req.user ? req.user._id : null,
      details: { employeeId: newEmployee.employeeId, fullName: newEmployee.fullName, rfidCardUid: cleanUid },
      reason: 'New employee registered'
    });

    return res.status(201).json({
      success: true,
      message: 'Employee registered successfully.',
      data: newEmployee
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to create employee.', error: error.message });
  }
};

// Update employee
exports.updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      fullName,
      email,
      mobileNumber,
      department,
      designation,
      joiningDate,
      salary,
      gender,
      customWorkingHours,
      rfidCardUid,
      biometricEnrollId,
      status,
      profilePhoto
    } = req.body;

    const employee = await Employee.findById(id);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found.' });
    }

    // Check email collision
    if (email && email.toLowerCase().trim() !== employee.email) {
      const existing = await Employee.findOne({ email: email.toLowerCase().trim(), _id: { $ne: id } });
      if (existing) {
        return res.status(400).json({ success: false, message: `Email ${email} is already used by another employee.` });
      }
      employee.email = email.toLowerCase().trim();
    }

    const oldUid = employee.rfidCardUid;
    const newUid = rfidCardUid ? rfidCardUid.toUpperCase().trim() : null;

    // Check RFID collision if changed
    if (newUid && newUid !== oldUid) {
      const existingCard = await RfidCard.findOne({
        cardUid: newUid,
        status: 'Active',
        employee: { $ne: employee._id }
      });
      if (existingCard && existingCard.employee) {
        return res.status(400).json({
          success: false,
          message: `RFID Card UID "${newUid}" is already assigned to another active employee.`
        });
      }

      // If old card existed, release it
      if (oldUid) {
        await RfidCard.findOneAndUpdate(
          { cardUid: oldUid },
          { status: 'Deactivated', deactivatedAt: new Date(), remarks: `Replaced by ${newUid}` }
        );
      }

      // Assign new card
      await RfidCard.findOneAndUpdate(
        { cardUid: newUid },
        {
          cardUid: newUid,
          employee: employee._id,
          status: 'Active',
          assignedAt: new Date(),
          remarks: `Assigned to ${employee.fullName} (${employee.employeeId})`
        },
        { upsert: true }
      );

      employee.rfidCardUid = newUid;
    } else if (newUid === null && oldUid) {
      // Deactivated card
      await RfidCard.findOneAndUpdate(
        { cardUid: oldUid },
        { status: 'Deactivated', deactivatedAt: new Date(), remarks: 'Unassigned from employee' }
      );
      employee.rfidCardUid = null;
    }

    if (fullName) employee.fullName = fullName.trim();
    if (mobileNumber) employee.mobileNumber = mobileNumber.trim();
    if (department) employee.department = department.trim();
    if (designation) employee.designation = designation.trim();
    if (joiningDate) employee.joiningDate = joiningDate;
    if (salary !== undefined) employee.salary = Number(salary);
    if (gender) employee.gender = gender;
    if (customWorkingHours !== undefined) employee.customWorkingHours = customWorkingHours ? Number(customWorkingHours) : null;
    if (biometricEnrollId !== undefined) employee.biometricEnrollId = biometricEnrollId ? String(biometricEnrollId).trim() : null;
    if (status) employee.status = status;
    if (profilePhoto !== undefined) employee.profilePhoto = profilePhoto;

    await employee.save();

    await AuditLog.create({
      action: 'UPDATE_EMPLOYEE',
      entity: 'Employee',
      entityId: employee._id.toString(),
      performedBy: req.user ? req.user._id : null,
      details: { changes: req.body },
      reason: 'Employee details updated'
    });

    return res.status(200).json({
      success: true,
      message: 'Employee updated successfully.',
      data: employee
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update employee.', error: error.message });
  }
};

// Delete or Archive employee
exports.deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const employee = await Employee.findById(id);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found.' });
    }

    // Deactivate associated RFID card
    if (employee.rfidCardUid) {
      await RfidCard.findOneAndUpdate(
        { cardUid: employee.rfidCardUid },
        { status: 'Deactivated', deactivatedAt: new Date(), remarks: `Employee ${employee.employeeId} deleted` }
      );
    }

    await Employee.findByIdAndDelete(id);

    await AuditLog.create({
      action: 'DELETE_EMPLOYEE',
      entity: 'Employee',
      entityId: id,
      performedBy: req.user ? req.user._id : null,
      details: { employeeId: employee.employeeId, fullName: employee.fullName },
      reason: 'Employee record deleted'
    });

    return res.status(200).json({
      success: true,
      message: `Employee ${employee.fullName} (${employee.employeeId}) removed successfully.`
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to delete employee.', error: error.message });
  }
};

// Configure or Reset Staff Portal Login Credentials
exports.createOrUpdateAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const { password, loginEmail } = req.body;

    const employee = await Employee.findById(id);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found.' });
    }

    if (!password || String(password).length < 4) {
      return res.status(400).json({ success: false, message: 'Password must be at least 4 characters long.' });
    }

    const emailToUse = (loginEmail || employee.email).toLowerCase().trim();
    const hashedPassword = await bcrypt.hash(password, 10);

    let user = await User.findOne({ employee: employee._id });
    if (user) {
      user.password = hashedPassword;
      user.email = emailToUse;
      user.name = employee.fullName;
      user.isActive = true;
      await user.save();
    } else {
      // Check if email already used by another user
      const existing = await User.findOne({ email: emailToUse });
      if (existing) {
        return res.status(400).json({ success: false, message: `Email "${emailToUse}" is already in use by another user account.` });
      }

      user = await User.create({
        name: employee.fullName,
        email: emailToUse,
        password: hashedPassword,
        role: 'staff',
        employee: employee._id,
        isActive: true
      });
    }

    return res.status(200).json({
      success: true,
      message: `Staff login account for ${employee.fullName} configured successfully.`,
      account: {
        userId: employee.employeeId,
        email: user.email,
        name: user.name
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to configure staff account.', error: error.message });
  }
};
