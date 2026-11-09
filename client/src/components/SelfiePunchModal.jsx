import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  X,
  RotateCcw,
  CheckCircle,
  Clock,
  AlertCircle,
  Upload,
  Send,
  Sparkles,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import { attendanceRequestApi } from '../services/api';

export default function SelfiePunchModal({ isOpen, onClose, onSubmitted, employee }) {
  const [stream, setStream] = useState(null);
  const [capturedPhoto, setCapturedPhoto] = useState('');
  const [requestedType, setRequestedType] = useState('IN');
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cameraError, setCameraError] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  // Start Camera when modal opens
  useEffect(() => {
    let activeStream = null;

    if (isOpen && !capturedPhoto) {
      setError('');
      setSuccessMessage('');
      setCameraError(false);

      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices
          .getUserMedia({
            video: {
              facingMode: 'user',
              width: { ideal: 640 },
              height: { ideal: 480 }
            },
            audio: false
          })
          .then((mediaStream) => {
            activeStream = mediaStream;
            setStream(mediaStream);
            if (videoRef.current) {
              videoRef.current.srcObject = mediaStream;
              videoRef.current.play().catch(() => {});
            }
          })
          .catch((err) => {
            console.warn('Camera access denied or unavailable:', err);
            setCameraError(true);
          });
      } else {
        setCameraError(true);
      }
    }

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isOpen, capturedPhoto]);

  // Clean up stream on close
  const handleClose = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setCapturedPhoto('');
    setError('');
    setSuccessMessage('');
    if (onClose) onClose();
  };

  // Capture photo from video stream
  const handleCapture = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement('canvas');

    const width = video.videoWidth || 480;
    const height = video.videoHeight || 480;

    canvas.width = 400;
    canvas.height = Math.round((height * 400) / width);

    const ctx = canvas.getContext('2d');
    // Mirror image for natural selfie feel
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setCapturedPhoto(dataUrl);

    // Stop video stream after capture
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  // Retake photo
  const handleRetake = () => {
    setCapturedPhoto('');
    setError('');
  };

  // File Upload Fallback
  const handleFileChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 400;
        canvas.height = Math.round((img.height * 400) / img.width);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        setCapturedPhoto(canvas.toDataURL('image/jpeg', 0.85));
      };
    };
    reader.readAsDataURL(file);
  };

  // Submit to Admin
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!capturedPhoto) {
      setError('Please snap your selfie photo before submitting.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload = {
        requestedType,
        selfiePhoto: capturedPhoto,
        remarks: remarks.trim() || `Manual selfie ${requestedType} punch`,
        requestTime: new Date()
      };

      const res = await attendanceRequestApi.submitSelfie(payload);
      setSuccessMessage(res.message || 'Selfie attendance request sent to Admin successfully!');

      setTimeout(() => {
        handleClose();
        if (onSubmitted) onSubmitted(res);
      }, 2500);
    } catch (err) {
      setError(err.message || 'Failed to submit selfie request.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const currentTimeStr = new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden my-auto">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-brand-600/10 text-brand-600 dark:text-brand-400 flex items-center justify-center border border-brand-500/20">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>Selfie Attendance</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                  Live Verify
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Apna selfie photo kheench kar Admin approval ke liye bhejein
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 flex items-center gap-2.5 font-bold animate-pulse">
              <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Camera Viewport / Photo Preview */}
          <div className="relative w-full aspect-[4/3] rounded-3xl overflow-hidden bg-slate-950 border-2 border-slate-800 shadow-inner flex flex-col items-center justify-center">
            {capturedPhoto ? (
              // Captured Snapshot Preview
              <div className="relative w-full h-full">
                <img
                  src={capturedPhoto}
                  alt="Captured Selfie"
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-emerald-500 text-white font-bold text-[10px] flex items-center gap-1 shadow">
                  <CheckCircle className="w-3 h-3" />
                  <span>Selfie Captured</span>
                </div>
                <button
                  type="button"
                  onClick={handleRetake}
                  className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/85 hover:bg-slate-900 text-white font-bold text-xs backdrop-blur-md shadow-lg border border-white/20 transition-all"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Retake (दोबारा लें)</span>
                </button>
              </div>
            ) : !cameraError ? (
              // Live Webcam Feed
              <div className="relative w-full h-full flex items-center justify-center">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover -scale-x-100"
                />
                {/* Facial alignment guide overlay */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-44 h-56 rounded-full border-2 border-dashed border-white/40 shadow-[0_0_20px_rgba(255,255,255,0.1)] flex items-end justify-center pb-2">
                    <span className="text-[10px] font-bold text-white/80 bg-black/40 px-2 py-0.5 rounded-full">
                      Align Face Here
                    </span>
                  </div>
                </div>

                {/* Snap Button Floating at bottom */}
                <button
                  type="button"
                  onClick={handleCapture}
                  className="absolute bottom-3 flex items-center gap-2 px-5 py-2.5 rounded-full bg-brand-600 hover:bg-brand-500 text-white font-black text-xs shadow-xl shadow-brand-600/40 border-2 border-white/30 hover:scale-105 active:scale-95 transition-all"
                >
                  <Camera className="w-4 h-4" />
                  <span>Snap Photo (फोटो खींचें)</span>
                </button>
              </div>
            ) : (
              // Camera blocked / unavailable fallback
              <div className="p-6 text-center space-y-3">
                <Camera className="w-10 h-10 mx-auto text-slate-500 opacity-50" />
                <div>
                  <p className="font-bold text-slate-300">Camera Permission Required</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Webcam blocked hai ya device me camera detect nahi hua. Aap file upload kar sakte hain:
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current && fileInputRef.current.click()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 text-white font-bold text-xs"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Selfie Photo</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="user"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
            )}
          </div>

          {/* Punch Type Selector: IN vs OUT */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Attendance Punch Type:
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setRequestedType('IN')}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl border font-bold transition-all ${
                  requestedType === 'IN'
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 shadow-sm'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span>Clock IN (Entry)</span>
              </button>

              <button
                type="button"
                onClick={() => setRequestedType('OUT')}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl border font-bold transition-all ${
                  requestedType === 'OUT'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 shadow-sm'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <span>Clock OUT (Exit)</span>
              </button>
            </div>
          </div>

          {/* Live Punch Time Banner */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
            <span className="flex items-center gap-1.5 font-bold text-slate-600 dark:text-slate-300">
              <Clock className="w-4 h-4 text-brand-500" />
              <span>Submission Time:</span>
            </span>
            <span className="font-mono font-black text-sm text-slate-900 dark:text-white">
              {currentTimeStr}
            </span>
          </div>

          {/* Optional Reason / Remarks */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Remarks / Note (Vajah batayein):
            </label>
            <input
              type="text"
              placeholder="e.g. Card bhul gaya, Field visit duty, Office entry..."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-brand-500 outline-none"
            />
          </div>

          {/* Action Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading || !capturedPhoto || !!successMessage}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-black text-xs shadow-lg shadow-brand-600/30 transition-all disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>
                {loading
                  ? 'Submitting...'
                  : successMessage
                  ? 'Sent to Admin!'
                  : 'Submit for Admin Approval (अप्रूवल के लिए भेजें)'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
