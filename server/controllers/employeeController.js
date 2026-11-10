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

    // Security Check: If staff, strictly ONLY return their own employee profile!
    if (req.user && req.user.role === 'staff') {
      const staffEmpId = req.user.employee?._id || req.user.employee;
      query._id = staffEmpId;
    } else {
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
    // Security Check: If staff user, they can strictly ONLY view their own profile!
    if (req.user && req.user.role === 'staff') {
      const staffEmpId = String(req.user.employee?._id || req.user.employee);
      if (String(req.params.id) !== staffEmpId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You can only view your own employee details.'
        });
      }
    }

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
      dob,
      bloodGroup,
      emergencyContact,
      address,
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
      dob: dob || null,
      bloodGroup: bloodGroup ? String(bloodGroup).trim() : '',
      emergencyContact: emergencyContact ? String(emergencyContact).trim() : '',
      address: address ? String(address).trim() : '',
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
      dob,
      bloodGroup,
      emergencyContact,
      address,
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
    if (dob !== undefined) employee.dob = dob || null;
    if (bloodGroup !== undefined) employee.bloodGroup = bloodGroup ? String(bloodGroup).trim() : '';
    if (emergencyContact !== undefined) employee.emergencyContact = emergencyContact ? String(emergencyContact).trim() : '';
    if (address !== undefined) employee.address = address ? String(address).trim() : '';
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

// Helper to extract image URL from HTML (Blogger post, WordPress, webpage)
function extractImageFromWebpage(html, baseUrl) {
  // 1. OpenGraph or Twitter Card meta image
  const ogRegex = /<meta[^>]+(?:property|name)=["'](?:og:image|og:image:url|twitter:image)["'][^>]+content=["']([^"']+)["']/i;
  const ogRegexReverse = /<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:image|og:image:url|twitter:image)["']/i;
  const ogMatch = html.match(ogRegex) || html.match(ogRegexReverse);
  if (ogMatch && ogMatch[1] && !ogMatch[1].includes('b-logo') && !ogMatch[1].includes('favicon')) {
    return ogMatch[1].trim();
  }

  // 2. <link rel="image_src" href="...">
  const linkRegex = /<link[^>]+rel=["']image_src["'][^>]+href=["']([^"']+)["']/i;
  const linkMatch = html.match(linkRegex);
  if (linkMatch && linkMatch[1]) {
    return linkMatch[1].trim();
  }

  // 3. Blogger / Blogspot specific image patterns in post body
  const bloggerPattern = /https?:\/\/(?:[0-9]\.bp\.blogspot\.com|blogger\.googleusercontent\.com|lh[0-9]+\.googleusercontent\.com)\/[^"'<>\s]+/i;
  const bloggerMatch = html.match(bloggerPattern);
  if (bloggerMatch && bloggerMatch[0]) {
    return bloggerMatch[0].trim();
  }

  // 4. First valid <img> tag in the page
  const imgRegex = /<img[^>]+src=["']([^"']+)["']/gi;
  let match;
  while ((match = imgRegex.exec(html)) !== null) {
    const src = match[1].trim();
    if (src.includes('1x1') || src.includes('favicon') || src.includes('avatar') || src.includes('icon') || src.includes('emoji')) {
      continue;
    }
    if (src.match(/\.(png|jpe?g|webp|gif)/i) || src.includes('googleusercontent') || src.includes('blogspot')) {
      return src.startsWith('http') ? src : new URL(src, baseUrl).href;
    }
  }

  return null;
}

// Helper to upgrade Blogger / Google Photos thumbnail resolution to /s1600/
function upgradeBloggerImageUrl(imgUrl) {
  if (imgUrl.includes('bp.blogspot.com') || imgUrl.includes('blogger.googleusercontent.com') || imgUrl.includes('googleusercontent.com')) {
    // Replace /s72-c/, /s150/, /s200/, /s320/, /s400/, /s640/ with /s1600/
    imgUrl = imgUrl.replace(/\/s(72-c|[0-9]{2,4})\//, '/s1600/');
    // Replace /w\d+-h\d+/ with /s1600/
    imgUrl = imgUrl.replace(/\/w[0-9]+-h[0-9]+[^/]*\//, '/s1600/');
  }
  return imgUrl;
}

// Fetch and convert image from web URL (supports Blogger, Blogspot, Google Drive, Dropbox, and direct image links)
exports.fetchPhotoFromUrl = async (req, res) => {
  try {
    let { url } = req.body;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ success: false, message: 'Image URL or Blogger link is required.' });
    }

    url = url.trim();

    // 1. Resolve Google Drive share links
    const gDriveMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (gDriveMatch && gDriveMatch[1]) {
      const fileId = gDriveMatch[1];
      url = `https://lh3.googleusercontent.com/d/${fileId}`;
    }

    // 2. Resolve Dropbox links
    if (url.includes('dropbox.com')) {
      url = url.replace('?dl=0', '?raw=1').replace('&dl=0', '&raw=1');
      if (!url.includes('raw=1')) {
        url += (url.includes('?') ? '&' : '?') + 'raw=1';
      }
    }

    // 3. Upgrade direct Blogger / Blogspot image links to high resolution
    url = upgradeBloggerImageUrl(url);

    const standardHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,image/*,*/*;q=0.8'
    };

    // 4. Fetch the remote resource
    let response = await fetch(url, {
      headers: standardHeaders,
      signal: AbortSignal.timeout(12000)
    });

    if (!response.ok) {
      return res.status(400).json({
        success: false,
        message: `Failed to fetch URL (HTTP ${response.status}: ${response.statusText}). Please verify the link is publicly accessible.`
      });
    }

    let contentType = response.headers.get('content-type') || '';
    let isBloggerExtracted = false;

    // 5. If response is HTML (e.g. Blogger / Blogspot post or webpage), extract the image from it
    if (contentType.includes('text/html') || contentType.includes('application/xhtml')) {
      const htmlText = await response.text();
      const extractedImageUrl = extractImageFromWebpage(htmlText, url);

      if (!extractedImageUrl) {
        return res.status(400).json({
          success: false,
          message: 'No photo could be found on this Blogger page. Please ensure the blog post contains a picture or paste the direct image link.'
        });
      }

      // Upgrade resolution of extracted image
      const highResImageUrl = upgradeBloggerImageUrl(extractedImageUrl);

      // Fetch the extracted image
      response = await fetch(highResImageUrl, {
        headers: standardHeaders,
        signal: AbortSignal.timeout(12000)
      });

      if (!response.ok) {
        return res.status(400).json({
          success: false,
          message: `Failed to download extracted Blogger image (${response.status}).`
        });
      }

      contentType = response.headers.get('content-type') || 'image/jpeg';
      url = highResImageUrl;
      isBloggerExtracted = true;
    }

    if (!contentType.startsWith('image/') && !contentType.includes('octet-stream')) {
      return res.status(400).json({
        success: false,
        message: `The provided URL returned '${contentType}', not an image. Please provide a direct image or Blogger link.`
      });
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Limit image size to 5MB
    if (buffer.length > 5 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        message: 'The image exceeds 5MB. Please choose a smaller photo.'
      });
    }

    const mime = contentType.startsWith('image/') ? contentType.split(';')[0] : 'image/jpeg';
    const base64Data = `data:${mime};base64,${buffer.toString('base64')}`;

    return res.status(200).json({
      success: true,
      message: isBloggerExtracted
        ? 'Photo successfully extracted and fetched from Blogger!'
        : 'Photo successfully fetched from URL!',
      photoData: base64Data,
      resolvedUrl: url,
      isBlogger: isBloggerExtracted || url.includes('blogspot') || url.includes('blogger')
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error fetching photo from URL: ' + error.message
    });
  }
};
