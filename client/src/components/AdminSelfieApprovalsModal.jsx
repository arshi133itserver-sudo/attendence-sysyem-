import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle,
  XCircle,
  Clock,
  UserCheck,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Camera,
  Layers,
  Check,
  MessageSquare,
  ShieldCheck
} from 'lucide-react';
import { attendanceRequestApi } from '../services/api';

export default function AdminSelfieApprovalsModal({ isOpen, onClose, onActionSuccess }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [activeTab, setActiveTab] = useState('Pending'); // 'Pending' | 'Approved' | 'Rejected' | 'All'
  const [rejectionModalId, setRejectionModalId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('Photo unclear or mismatch');

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await attendanceRequestApi.getAll({
        status: activeTab === 'All' ? undefined : activeTab
      });
      if (res.success) {
        setRequests(res.data);
      }
    } catch (err) {
      console.error('Failed to load selfie requests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchRequests();
    }
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

  const handleApprove = async (id) => {
    setActionLoadingId(id);
    try {
      const res = await attendanceRequestApi.approve(id);
      fetchRequests();
      if (onActionSuccess) onActionSuccess(res);
    } catch (err) {
      alert(err.message || 'Approval failed.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (id) => {
    setActionLoadingId(id);
    try {
      const res = await attendanceRequestApi.reject(id, rejectionReason);
      setRejectionModalId(null);
      fetchRequests();
      if (onActionSuccess) onActionSuccess(res);
    } catch (err) {
      alert(err.message || 'Rejection failed.');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden my-auto">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/20">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-lg text-slate-900 dark:text-white flex items-center gap-2">
                <span>Selfie Attendance Approvals</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                  Face Verification
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Staff ke selfie photo ko check karke attendance approve ya reject karein
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Tabs */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold">
              {['Pending', 'Approved', 'Rejected', 'All'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    activeTab === tab
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4 bg-slate-100/50 dark:bg-slate-950/40">
          {loading ? (
            <div className="p-12 text-center text-slate-400 space-y-2">
              <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-semibold">Loading requests...</p>
            </div>
          ) : requests.length === 0 ? (
            <div className="p-12 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-2">
              <CheckCircle className="w-12 h-12 mx-auto text-emerald-500 opacity-60" />
              <h4 className="font-bold text-slate-700 dark:text-slate-200 text-sm">
                No {activeTab} Selfie Requests
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {activeTab === 'Pending'
                  ? 'Abhi koi pending selfie request nahi hai. Sabhi verified hain.'
                  : `No ${activeTab.toLowerCase()} requests recorded yet.`}
              </p>
            </div>
          ) : (
            requests.map((req) => {
              const emp = req.employee || {};
              const isPending = req.status === 'Pending';
              const isIN = req.requestedType === 'IN';
              const reqTimeStr = new Date(req.requestTime).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
              });
              const dateStr = req.date;

              return (
                <div
                  key={req._id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4 hover:border-indigo-400 dark:hover:border-indigo-600 transition-all"
                >
                  {/* Card Header */}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-black text-base text-slate-900 dark:text-white">
                            {emp.fullName || 'Staff Member'}
                          </h4>
                          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-brand-600 dark:text-brand-400">
                            {emp.employeeId || 'ID'}
                          </span>
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            isIN
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700'
                              : 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border border-blue-300 dark:border-blue-700'
                          }`}>
                            {isIN ? 'Clock IN Request' : 'Clock OUT Request'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {emp.designation} • {emp.department} • Mobile: {emp.mobileNumber || 'N/A'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <div className="text-right">
                        <span className="block font-mono font-bold text-xs text-slate-900 dark:text-white">
                          {reqTimeStr}
                        </span>
                        <span className="text-[10px] text-slate-400">{dateStr}</span>
                      </div>
                      <span className={`px-2.5 py-1 rounded-xl text-xs font-bold border ${
                        req.status === 'Approved'
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                          : req.status === 'Rejected'
                          ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800'
                          : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                      }`}>
                        {req.status}
                      </span>
                    </div>
                  </div>

                  {/* Photo Comparison Section */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-950/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                    
                    {/* Left: Live Snapped Selfie */}
                    <div className="flex flex-col items-center text-center space-y-1.5">
                      <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                        <Camera className="w-3.5 h-3.5" />
                        Live Snapped Selfie (अभी ली गई फोटो)
                      </span>
                      <div className="w-44 h-44 rounded-2xl overflow-hidden border-2 border-indigo-500/60 shadow-md bg-black relative">
                        <img
                          src={req.selfiePhoto}
                          alt="Selfie"
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute bottom-1 right-1 bg-black/60 backdrop-blur-sm text-[9px] font-mono text-white px-1.5 py-0.5 rounded">
                          {reqTimeStr}
                        </span>
                      </div>
                    </div>

                    {/* Right: Registered Official Photo */}
                    <div className="flex flex-col items-center text-center space-y-1.5">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                        Registered Official Photo (सिस्टम रिकॉर्ड)
                      </span>
                      <div className="w-44 h-44 rounded-2xl overflow-hidden border-2 border-slate-300 dark:border-slate-700 shadow-md bg-slate-900 flex items-center justify-center text-slate-400">
                        {emp.profilePhoto ? (
                          <img
                            src={emp.profilePhoto}
                            alt="Registered"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="text-center p-3">
                            <span className="text-3xl font-black text-white block mb-1">
                              {emp.fullName?.charAt(0) || '?'}
                            </span>
                            <span className="text-[10px] text-slate-500">No registered photo</span>
                          </div>
                        )}
                      </div>
                    </div>

                  </div>

                  {/* Remarks & Reason info */}
                  {req.remarks && (
                    <div className="text-xs text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700/80 flex items-center gap-2">
                      <MessageSquare className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>
                        <strong>Staff Note:</strong> {req.remarks}
                      </span>
                    </div>
                  )}

                  {req.rejectionReason && (
                    <div className="text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 p-2.5 rounded-xl border border-rose-200 dark:border-rose-900">
                      <strong>Rejection Reason:</strong> {req.rejectionReason}
                    </div>
                  )}

                  {/* Action Buttons for Pending Requests */}
                  {isPending && (
                    <div className="flex items-center justify-end gap-3 pt-2">
                      {rejectionModalId === req._id ? (
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          <input
                            type="text"
                            placeholder="Rejection reason..."
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            className="px-3 py-1.5 rounded-xl border border-rose-300 dark:border-rose-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none w-48"
                          />
                          <button
                            onClick={() => handleReject(req._id)}
                            disabled={actionLoadingId === req._id}
                            className="px-3 py-1.5 rounded-xl bg-rose-600 text-white font-bold text-xs"
                          >
                            Confirm Reject
                          </button>
                          <button
                            onClick={() => setRejectionModalId(null)}
                            className="p-1.5 text-slate-400"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              setRejectionModalId(req._id);
                              setRejectionReason('Photo unclear or mismatch');
                            }}
                            disabled={actionLoadingId === req._id}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold transition-all disabled:opacity-50"
                          >
                            <XCircle className="w-4 h-4" />
                            <span>Reject (अस्वीकार)</span>
                          </button>

                          <button
                            onClick={() => handleApprove(req._id)}
                            disabled={actionLoadingId === req._id}
                            className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black shadow-md shadow-emerald-600/30 transition-all disabled:opacity-50"
                          >
                            <CheckCircle className="w-4 h-4" />
                            <span>
                              {actionLoadingId === req._id
                                ? 'Approving...'
                                : 'Approve Attendance (स्वीकृत करें)'}
                            </span>
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between text-xs text-slate-500">
          <span>
            Selfie verification guarantees that employee is physically present on duty.
          </span>
          <button
            onClick={fetchRequests}
            className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>

      </div>
    </div>
  );
}
