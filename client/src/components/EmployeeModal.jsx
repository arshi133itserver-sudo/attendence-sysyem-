import React, { useState, useEffect } from 'react';
import { employeeApi, settingsApi } from '../services/api';
import { X, UserPlus, CreditCard, AlertCircle, Key, Lock, Upload, Camera, Trash2, Image, Fingerprint } from 'lucide-react';

function compressAndConvertImage(file, maxWidth = 350, maxHeight = 350, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new window.Image();
      img.src = event.target.result;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}

export default function EmployeeModal({ isOpen, onClose, employeeToEdit, onSaved }) {
  const [formData, setFormData] = useState({
    employeeId: '',
    fullName: '',
    email: '',
    mobileNumber: '',
    department: '',
    designation: '',
    gender: 'Male',
    dob: '',
    bloodGroup: '',
    emergencyContact: '',
    address: '',
    customWorkingHours: '',
    joiningDate: new Date().toISOString().split('T')[0],
    salary: 0,
    rfidCardUid: '',
    biometricEnrollId: '',
    status: 'Active',
    profilePhoto: ''
  });

  const [departments, setDepartments] = useState([
    'Engineering',
    'Operations',
    'Human Resources',
    'Marketing & Sales',
    'Accounts & Finance'
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createAccount, setCreateAccount] = useState(true);
  const [loginPassword, setLoginPassword] = useState('staff1234');

  useEffect(() => {
    if (isOpen) {
      setError('');
      setLoginPassword('staff1234');
      setCreateAccount(true);
      // Load departments from settings
      settingsApi.getSettings().then(res => {
        if (res.success && res.data.departments && res.data.departments.length > 0) {
          setDepartments(res.data.departments.map(d => d.name));
        }
      }).catch(() => {});

      if (employeeToEdit) {
        setFormData({
          employeeId: employeeToEdit.employeeId || '',
          fullName: employeeToEdit.fullName || '',
          email: employeeToEdit.email || '',
          mobileNumber: employeeToEdit.mobileNumber || '',
          department: employeeToEdit.department || '',
          designation: employeeToEdit.designation || '',
          gender: employeeToEdit.gender || 'Male',
          dob: employeeToEdit.dob ? employeeToEdit.dob.slice(0, 10) : '',
          bloodGroup: employeeToEdit.bloodGroup || '',
          emergencyContact: employeeToEdit.emergencyContact || '',
          address: employeeToEdit.address || '',
          customWorkingHours: employeeToEdit.customWorkingHours || '',
          joiningDate: employeeToEdit.joiningDate ? employeeToEdit.joiningDate.slice(0, 10) : new Date().toISOString().split('T')[0],
          salary: employeeToEdit.salary || 0,
          rfidCardUid: employeeToEdit.rfidCardUid || '',
          biometricEnrollId: employeeToEdit.biometricEnrollId || '',
          status: employeeToEdit.status || 'Active',
          profilePhoto: employeeToEdit.profilePhoto || ''
        });
      } else {
        // Fetch next employee ID
        employeeApi.getNextId().then(res => {
          if (res.success && res.nextId) {
            setFormData(prev => ({ ...prev, employeeId: res.nextId }));
          }
        }).catch(() => {});

        setFormData({
          employeeId: 'ARS-001',
          fullName: '',
          email: '',
          mobileNumber: '',
          department: '',
          designation: '',
          gender: 'Male',
          dob: '',
          bloodGroup: '',
          emergencyContact: '',
          address: '',
          customWorkingHours: '',
          joiningDate: new Date().toISOString().split('T')[0],
          salary: 50000,
          rfidCardUid: '',
          biometricEnrollId: '',
          status: 'Active',
          profilePhoto: ''
        });
      }
    }
  }, [isOpen, employeeToEdit]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'rfidCardUid' ? value.toUpperCase().trim() : value
    }));
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (JPG, PNG, WebP).');
      return;
    }

    try {
      setLoading(true);
      const base64Data = await compressAndConvertImage(file);
      setFormData(prev => ({ ...prev, profilePhoto: base64Data }));
      setError('');
    } catch (err) {
      setError('Failed to process image: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (employeeToEdit) {
        await employeeApi.update(employeeToEdit._id, formData);
        if (createAccount && loginPassword) {
          await employeeApi.setAccount(employeeToEdit._id, { password: loginPassword, loginEmail: formData.email });
        }
      } else {
        const payload = {
          ...formData,
          createPortalAccount: createAccount,
          password: createAccount ? loginPassword : null,
          loginEmail: formData.email
        };
        const res = await employeeApi.create(payload);
        if (createAccount && res.data && res.data._id && loginPassword) {
          await employeeApi.setAccount(res.data._id, { password: loginPassword, loginEmail: formData.email });
        }
      }
      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-500/10 text-brand-600 flex items-center justify-center">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                {employeeToEdit ? 'Edit Employee Details' : 'Register New Employee'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Manage profile, RFID card UID, and department credentials
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Staff Photo Upload & Live Avatar Card */}
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
            <div className="relative shrink-0">
              <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-brand-500/50 bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-500 shadow-md">
                {formData.profilePhoto ? (
                  <img src={formData.profilePhoto} alt="Staff" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-400">
                    <Camera className="w-7 h-7 mb-0.5 text-slate-400" />
                    <span className="text-[9px] font-bold">No Photo</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 space-y-1">
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                Staff Profile Picture (कर्मचारी फोटो अपलोड)
              </label>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Official ID Card & Live Greeting me display hone ke liye photo upload karein.
              </p>

              <div className="flex flex-wrap items-center gap-2 pt-1.5">
                <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-sm transition-all">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{formData.profilePhoto ? 'Change Picture' : 'Upload Picture'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                </label>

                {formData.profilePhoto && (
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, profilePhoto: '' }))}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Employee ID <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="employeeId"
                value={formData.employeeId}
                onChange={handleChange}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-mono font-bold focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="fullName"
                placeholder="e.g. Rahul Sharma"
                value={formData.fullName}
                onChange={handleChange}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Email Address <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                name="email"
                placeholder="rahul@arshi.com"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Mobile Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="mobileNumber"
                placeholder="+91 98765 43210"
                value={formData.mobileNumber}
                onChange={handleChange}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Department <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                list="departments-list"
                name="department"
                placeholder="Type or select department..."
                value={formData.department}
                onChange={handleChange}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
              <datalist id="departments-list">
                {departments.map((dept) => (
                  <option key={dept} value={dept} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Designation <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="designation"
                placeholder="e.g. Lead Software Engineer"
                value={formData.designation}
                onChange={handleChange}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Hardware Credentials: RFID Card & ZKTeco Biometric Machine ID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* RFID Card UID */}
            <div className="p-3.5 rounded-2xl bg-brand-50/60 dark:bg-brand-950/30 border border-brand-200 dark:border-brand-800/80">
              <div className="flex items-center gap-2 mb-1.5">
                <CreditCard className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                <label className="text-xs font-bold text-brand-900 dark:text-brand-200 uppercase tracking-wider">
                  RFID Card UID (13.56 MHz)
                </label>
              </div>
              <input
                type="text"
                name="rfidCardUid"
                placeholder="e.g. 73A2B19F"
                value={formData.rfidCardUid}
                onChange={handleChange}
                className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-brand-300 dark:border-brand-700 text-xs text-slate-900 dark:text-white font-mono font-bold uppercase focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Leave empty if card unassigned.
              </p>
            </div>

            {/* ZKTeco MB360 Machine User ID */}
            <div className="p-3.5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/80">
              <div className="flex items-center gap-2 mb-1.5">
                <Fingerprint className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <label className="text-xs font-bold text-indigo-900 dark:text-indigo-200 uppercase tracking-wider">
                  ZKTeco MB360 Enroll ID
                </label>
              </div>
              <input
                type="text"
                name="biometricEnrollId"
                placeholder="e.g. 1, 2, or 1322"
                value={formData.biometricEnrollId}
                onChange={handleChange}
                className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-indigo-300 dark:border-indigo-700 text-xs text-slate-900 dark:text-white font-mono font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Machine User PIN / ID for Finger/Face/Card.
              </p>
            </div>
          </div>

          {/* Personal & Medical/Health Details: DOB, Blood Group, Emergency Contact */}
          <div className="p-4 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/80 dark:border-rose-900/60 space-y-3">
            <h4 className="text-xs font-bold text-rose-950 dark:text-rose-200 uppercase tracking-wider flex items-center gap-1.5">
              <span>🩸 Personal Details & Blood Group (जन्म तिथि व ब्लड ग्रुप)</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Date of Birth */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Date of Birth (जन्म तिथि)
                </label>
                <input
                  type="date"
                  name="dob"
                  value={formData.dob}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>

              {/* Blood Group */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Blood Group (रक्त समूह)
                </label>
                <select
                  name="bloodGroup"
                  value={formData.bloodGroup}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
                >
                  <option value="">Select Blood Group</option>
                  <option value="A+">A+ (A Positive)</option>
                  <option value="A-">A- (A Negative)</option>
                  <option value="B+">B+ (B Positive)</option>
                  <option value="B-">B- (B Negative)</option>
                  <option value="O+">O+ (O Positive)</option>
                  <option value="O-">O- (O Negative)</option>
                  <option value="AB+">AB+ (AB Positive)</option>
                  <option value="AB-">AB- (AB Negative)</option>
                </select>
              </div>

              {/* Emergency Contact */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Emergency Mobile No.
                </label>
                <input
                  type="text"
                  name="emergencyContact"
                  placeholder="+91 91990 59257"
                  value={formData.emergencyContact}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Residential Address (कर्मचारी का पता)
              </label>
              <input
                type="text"
                name="address"
                placeholder="Village/Mohalla, Post, PS, Dist, State - Pincode"
                value={formData.address}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Staff Gender <span className="text-rose-500">*</span>
              </label>
              <select
                name="gender"
                value={formData.gender || 'Male'}
                onChange={handleChange}
                required
                className="w-full px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
              >
                <option value="Male">👨 Male Staff</option>
                <option value="Female">👩 Female Staff</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Joining Date
              </label>
              <input
                type="date"
                name="joiningDate"
                value={formData.joiningDate}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Monthly Salary
              </label>
              <input
                type="number"
                name="salary"
                value={formData.salary}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Status
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          {/* Gender Policy Hint */}
          <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
            <span className="text-slate-600 dark:text-slate-400">
              {formData.gender === 'Female' ? '👩 Female Staff Shift Rules Apply' : '👨 Male Staff Shift Rules Apply'}
            </span>
            <span className="font-semibold text-brand-600 dark:text-brand-400">
              Duty hours auto-managed by Settings
            </span>
          </div>

          <details className="text-xs group">
            <summary className="text-[11px] text-slate-500 hover:text-brand-600 dark:hover:text-brand-400 cursor-pointer font-medium list-none flex items-center gap-1">
              <span>+ Or provide external photo URL</span>
            </summary>
            <div className="mt-2">
              <input
                type="url"
                name="profilePhoto"
                placeholder="https://... (direct image web link)"
                value={formData.profilePhoto && formData.profilePhoto.startsWith('data:') ? '' : formData.profilePhoto}
                onChange={handleChange}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>
          </details>

          {/* Staff Portal Login Credentials Section */}
          <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200 uppercase tracking-wider">
                  Staff Self-Service Portal Login
                </span>
              </div>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={createAccount}
                  onChange={(e) => setCreateAccount(e.target.checked)}
                  className="rounded text-brand-600 focus:ring-brand-500 w-4 h-4"
                />
                <span>Enable Login Account</span>
              </label>
            </div>

            {createAccount && (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                    Login User ID / Email
                  </label>
                  <input
                    type="text"
                    disabled
                    value={formData.employeeId ? `${formData.employeeId} (or ${formData.email || 'email'})` : formData.email}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                    Set Login Password <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="e.g. staff1234"
                    required={createAccount}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-indigo-300 dark:border-indigo-700 text-xs font-mono font-bold text-indigo-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            )}
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Staff can sign in with User ID (<strong>{formData.employeeId || 'ID'}</strong>) or Email with this password to view their personal attendance portfolio.
            </p>
          </div>

          {/* Modal Footer */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md shadow-brand-600/30 transition-all disabled:opacity-50"
            >
              {loading ? 'Saving...' : employeeToEdit ? 'Update Employee' : 'Register Employee'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
