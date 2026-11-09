const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Employee = require('../models/Employee');

// Generate JWT Token
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role, email: user.email },
    process.env.JWT_SECRET || 'arshi_jwt_secret_key_2026_super_secure',
    { expiresIn: '7d' }
  );
};

// Login User (supports Email or Employee ID as identifier)
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'User ID / Email and password are required.' });
    }

    const identifier = String(email).trim();
    let user = await User.findOne({ email: identifier.toLowerCase() }).populate('employee');

    // If not found by email, check if identifier is an Employee ID (e.g. ARS-001)
    if (!user) {
      const emp = await Employee.findOne({ employeeId: identifier.toUpperCase() });
      if (emp) {
        user = await User.findOne({ employee: emp._id }).populate('employee');
      }
    }

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid User ID/Email or password.' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'This account has been deactivated.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid password. Please check your credentials.' });
    }

    const token = generateToken(user);

    return res.status(200).json({
      success: true,
      message: 'Logged in successfully.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        employee: user.employee
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Login failed.', error: error.message });
  }
};

// Get current profile
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate({
      path: 'employee',
      populate: { path: 'department' }
    });

    return res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        employee: user.employee
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch user profile.', error: error.message });
  }
};
