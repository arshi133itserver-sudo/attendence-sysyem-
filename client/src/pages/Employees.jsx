import React, { useState, useEffect } from 'react';
import { employeeApi } from '../services/api';
import EmployeeModal from '../components/EmployeeModal';
import StaffIdCardModal from '../components/StaffIdCardModal';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  CreditCard,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  RefreshCw,
  Phone,
  Mail,
  Building,
  Key,
  Lock,
  X,
  Printer,
  Fingerprint
} from 'lucide-react';

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('All');
  const [status, setStatus] = useState('All');
  const [genderFilter, setGenderFilter] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [actionMessage, setActionMessage] = useState('');

  // ID Card modal state
  const [idCardModalOpen, setIdCardModalOpen] = useState(false);
  const [selectedIdCardEmp, setSelectedIdCardEmp] = useState(null);

  // Password / Login Account Modal state
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [accountEmp, setAccountEmp] = useState(null);
  const [accountPassword, setAccountPassword] = useState('staff1234');
  const [savingAccount, setSavingAccount] = useState(false);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const res = await employeeApi.getAll({
        search,
        department: department !== 'All' ? department : undefined,
        status: status !== 'All' ? status : undefined,
        gender: genderFilter !== 'All' ? genderFilter : undefined
      });
      if (res.success) {
        setEmployees(res.data);
      }
    } catch (err) {
      console.error('Failed to load employees:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [search, department, status, genderFilter]);

  const handleEdit = (emp) => {
    setSelectedEmployee(emp);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setSelectedEmployee(null);
    setIsModalOpen(true);
  };

  const handleDelete = async (emp) => {
    if (window.confirm(`Are you sure you want to remove employee ${emp.fullName} (${emp.employeeId})? This will deactivate their RFID card.`)) {
      try {
        await employeeApi.delete(emp._id);
        setActionMessage(`Employee ${emp.fullName} removed.`);
        fetchEmployees();
        setTimeout(() => setActionMessage(''), 4000);
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const handleToggleStatus = async (emp) => {
    const newStatus = emp.status === 'Active' ? 'Inactive' : 'Active';
    try {
      await employeeApi.update(emp._id, { status: newStatus });
      fetchEmployees();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleOpenAccountModal = (emp) => {
    setAccountEmp(emp);
    setAccountPassword('staff1234');
    setAccountModalOpen(true);
  };

  const handleSaveAccount = async (e) => {
    e.preventDefault();
    if (!accountEmp || !accountPassword) return;
    setSavingAccount(true);
    try {
      await employeeApi.setAccount(accountEmp._id, {
        password: accountPassword,
        loginEmail: accountEmp.email
      });
      setActionMessage(`Portal login password for ${accountEmp.fullName} updated! User ID: ${accountEmp.employeeId}`);
      setAccountModalOpen(false);
      fetchEmployees();
      setTimeout(() => setActionMessage(''), 5000);
    } catch (err) {
      alert(err.message);
    } finally {
      setSavingAccount(false);
    }
  };

  const dynamicDepts = Array.from(new Set(employees.map(e => e.department).filter(Boolean)));
  const departmentsList = ['All', ...dynamicDepts];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Employee Directory & RFID Cards
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage employee credentials, designations, and 13.56MHz RFID card bindings
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          {/* Print All Staff ID Cards */}
          <button
            onClick={() => {
              setSelectedIdCardEmp(null);
              setIdCardModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-bold shadow-sm transition-all"
            title="Sabhi staff ka ID Card dekhein aur print karein"
          >
            <CreditCard className="w-4 h-4 text-brand-400" />
            <span>All Staff ID Cards</span>
          </button>

          <button
            onClick={handleAdd}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-lg shadow-brand-600/30 transition-all"
          >
            <UserPlus className="w-4 h-4" />
            <span>Register Employee</span>
          </button>
        </div>
      </div>

      {actionMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold animate-fade-in flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by name, ID, RFID, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Department Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase">Dept:</span>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none"
            >
              {departmentsList.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase">Status:</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none"
            >
              <option value="All">All</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          {/* Gender Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase">Gender:</span>
            <select
              value={genderFilter}
              onChange={(e) => setGenderFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none"
            >
              <option value="All">All Gender</option>
              <option value="Male">👨 Male Staff</option>
              <option value="Female">👩 Female Staff</option>
            </select>
          </div>

          <button
            onClick={fetchEmployees}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
            title="Refresh List"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Employees Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase tracking-wider text-[10px] font-bold">
                <th className="py-3.5 pl-6">Employee ID</th>
                <th className="py-3.5">Full Name & Role</th>
                <th className="py-3.5">Department</th>
                <th className="py-3.5">Contact</th>
                <th className="py-3.5">RFID Card UID</th>
                <th className="py-3.5">Staff Portal Login</th>
                <th className="py-3.5">Status</th>
                <th className="py-3.5 pr-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              {employees.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-slate-400">
                    No employees found matching the filters.
                  </td>
                </tr>
              ) : (
                employees.map((emp) => (
                  <tr key={emp._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-4 pl-6 font-mono font-bold text-brand-600 dark:text-brand-400">
                      {emp.employeeId}
                    </td>
                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white font-bold flex items-center justify-center text-xs overflow-hidden shrink-0 shadow-sm">
                          {emp.profilePhoto ? (
                            <img src={emp.profilePhoto} alt="" className="w-full h-full object-cover" />
                          ) : (
                            emp.fullName.charAt(0)
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="font-bold text-slate-900 dark:text-white">
                              {emp.fullName}
                            </p>
                            {emp.gender === 'Female' ? (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                                👩 Female
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                                👨 Male
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500">
                            {emp.designation}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 text-slate-700 dark:text-slate-300 font-semibold">
                      {emp.department}
                    </td>
                    <td className="py-4 space-y-0.5">
                      <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 text-[11px]">
                        <Mail className="w-3 h-3 text-slate-400" />
                        <span>{emp.email}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 text-[11px]">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{emp.mobileNumber}</span>
                      </div>
                    </td>
                    <td className="py-4">
                      <div className="space-y-1">
                        {emp.rfidCardUid ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono font-bold text-[11px] text-slate-800 dark:text-slate-200">
                            <CreditCard className="w-3 h-3 text-brand-600" />
                            <span>{emp.rfidCardUid}</span>
                          </div>
                        ) : (
                          <span className="text-rose-500 text-[11px] font-semibold italic block">
                            No RFID Card
                          </span>
                        )}
                        {emp.biometricEnrollId && (
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 font-mono font-bold text-[10px] border border-indigo-200/60 dark:border-indigo-800/60">
                            <Fingerprint className="w-2.5 h-2.5" />
                            <span>ZK ID: {emp.biometricEnrollId}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-4">
                      {emp.hasLoginAccount ? (
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 font-mono font-bold text-[10px] border border-indigo-200 dark:border-indigo-800">
                            <Key className="w-3 h-3" />
                            ID: {emp.employeeId}
                          </span>
                          <button
                            onClick={() => handleOpenAccountModal(emp)}
                            className="p-1 rounded text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                            title="Reset Staff Password"
                          >
                            <Lock className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleOpenAccountModal(emp)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-slate-600 dark:text-slate-400 hover:text-indigo-600 border border-slate-200 dark:border-slate-700 text-[10px] font-bold transition-all"
                        >
                          <Key className="w-3 h-3" />
                          + Set Login
                        </button>
                      )}
                    </td>
                    <td className="py-4">
                      <button
                        onClick={() => handleToggleStatus(emp)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-colors ${
                          emp.status === 'Active'
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100'
                            : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800 hover:bg-rose-100'
                        }`}
                        title="Click to toggle status"
                      >
                        {emp.status === 'Active' ? (
                          <CheckCircle className="w-3 h-3" />
                        ) : (
                          <XCircle className="w-3 h-3" />
                        )}
                        <span>{emp.status}</span>
                      </button>
                    </td>
                    <td className="py-4 pr-6 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedIdCardEmp(emp);
                            setIdCardModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-950/40 transition-colors"
                          title="View & Print Official ID Card"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleEdit(emp)}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="Edit Employee / Reassign RFID"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(emp)}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                          title="Delete Employee"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Employee Modal */}
      <EmployeeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        employeeToEdit={selectedEmployee}
        onSaved={fetchEmployees}
      />

      {/* Staff Portal Login Credentials Modal */}
      {accountModalOpen && accountEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-sm shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                    Staff Portal Login
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {accountEmp.fullName} ({accountEmp.employeeId})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAccountModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAccount} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Login User ID (Can use either):
                </label>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                  {accountEmp.employeeId} <span className="font-normal text-slate-400">or</span> {accountEmp.email}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Set New Login Password:
                </label>
                <input
                  type="text"
                  value={accountPassword}
                  onChange={(e) => setAccountPassword(e.target.value)}
                  placeholder="e.g. staff1234"
                  required
                  minLength={4}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-indigo-300 dark:border-indigo-700 text-xs font-mono font-bold text-indigo-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Employee can log in using this password to view their attendance portfolio.
                </p>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAccountModalOpen(false)}
                  className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingAccount}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition-all disabled:opacity-50"
                >
                  {savingAccount ? 'Saving...' : 'Save Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Staff ID Card Generator & Printable Badge Modal */}
      <StaffIdCardModal
        isOpen={idCardModalOpen}
        onClose={() => setIdCardModalOpen(false)}
        employee={selectedIdCardEmp}
        allEmployees={employees}
      />
    </div>
  );
}
