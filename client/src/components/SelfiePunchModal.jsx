import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  UserCheck,
  MapPin,
  RefreshCw,
  Navigation,
  Share2,
  MessageCircle
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
  const [submittedPunch, setSubmittedPunch] = useState(null); // When punch succeeds

  // GPS Geolocation state
  const [location, setLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState('');

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  // Acquire high-accuracy GPS coordinates
  const fetchLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError('Device me GPS geolocation support nahi hai.');
      return;
    }

    setLocationLoading(true);
    setLocationError('');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: Math.round(position.coords.accuracy)
        });
        setLocationLoading(false);
      },
      (err) => {
        console.warn('Geolocation acquisition error:', err);
        setLocationLoading(false);
        let msg = 'GPS location detect nahi ho payi.';
        if (err.code === 1) {
          msg = 'Location permission denied. Kripya phone settings me location allow karein.';
        } else if (err.code === 2) {
          msg = 'Location unavailable. Kripya GPS/Internet on karein.';
        } else if (err.code === 3) {
          msg = 'Location request timed out. Dobara try karein.';
        }
        setLocationError(msg);
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0
      }
    );
  }, []);

  // Start Camera & Request GPS when modal opens
  useEffect(() => {
    let activeStream = null;

    if (isOpen && !capturedPhoto) {
      setError('');
      setSuccessMessage('');
      setSubmittedPunch(null);
      setCameraError(false);

      // Trigger GPS request immediately
      fetchLocation();

      // Start webcam stream
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
  }, [isOpen, capturedPhoto, fetchLocation]);

  // Clean up stream on close
  const handleClose = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setCapturedPhoto('');
    setError('');
    setSuccessMessage('');
    setSubmittedPunch(null);
    if (onClose) onClose();
  };

  // Helper to draw verified watermark on canvas
  const drawWatermark = (ctx, canvasWidth, canvasHeight, loc) => {
    const bannerHeight = 84;
    const bannerY = canvasHeight - bannerHeight;

    // Semi-transparent gradient bar at bottom
    const gradient = ctx.createLinearGradient(0, bannerY, 0, canvasHeight);
    gradient.addColorStop(0, 'rgba(15, 23, 42, 0.82)');
    gradient.addColorStop(1, 'rgba(2, 6, 23, 0.96)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, bannerY, canvasWidth, bannerHeight);

    // Accent line on top of banner
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, bannerY);
    ctx.lineTo(canvasWidth, bannerY);
    ctx.stroke();

    // Line 1: Brand & Punch Type
    ctx.fillStyle = '#34d399'; // Emerald-400
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText('ARSHI ENTERPRISES • VERIFIED PUNCH', 16, bannerY + 22);

    ctx.fillStyle = requestedType === 'IN' ? '#10b981' : '#38bdf8';
    ctx.font = 'bold 12px sans-serif';
    const typeLabel = `CLOCK ${requestedType}`;
    ctx.fillText(typeLabel, canvasWidth - ctx.measureText(typeLabel).width - 16, bannerY + 22);

    // Line 2: Staff Name & ID + Date/Time
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px sans-serif';
    const empName = `${employee?.fullName || 'Staff'} (${employee?.employeeId || 'ARS-EMP'})`;
    ctx.fillText(empName, 16, bannerY + 44);

    const now = new Date();
    const timeFormatted = now.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }) + ' ' + now.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '11px sans-serif';
    ctx.fillText(timeFormatted, canvasWidth - ctx.measureText(timeFormatted).width - 16, bannerY + 44);

    // Line 3: GPS Coordinates & Accuracy Watermark
    ctx.font = '11px monospace';
    if (loc && loc.latitude) {
      ctx.fillStyle = '#38bdf8'; // Sky-400
      const locText = `GPS: ${loc.latitude.toFixed(6)}, ${loc.longitude.toFixed(6)} (±${loc.accuracy}m)`;
      ctx.fillText(locText, 16, bannerY + 66);
    } else {
      ctx.fillStyle = '#fbbf24'; // Amber-400
      ctx.fillText('GPS: Location Lock Pending / Manual Verify', 16, bannerY + 66);
    }

    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px sans-serif';
    const geoBadge = 'GEO-TAGGED & TIME-STAMPED';
    ctx.fillText(geoBadge, canvasWidth - ctx.measureText(geoBadge).width - 16, bannerY + 66);
  };

  // Capture photo from video stream with GPS & time watermark
  const handleCapture = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement('canvas');

    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;

    canvas.width = 640;
    canvas.height = Math.round((height * 640) / width);

    const ctx = canvas.getContext('2d');

    // Mirror image for natural selfie feel
    ctx.save();
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.restore();

    // Draw Watermark
    drawWatermark(ctx, canvas.width, canvas.height, location);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
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

  // File Upload Fallback with Watermark
  const handleFileChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = Math.round((img.height * 640) / img.width);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        drawWatermark(ctx, canvas.width, canvas.height, location);
        setCapturedPhoto(canvas.toDataURL('image/jpeg', 0.88));
      };
    };
    reader.readAsDataURL(file);
  };

  // Submit Direct Attendance Punch (No Admin Approval Needed)
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
        remarks: remarks.trim() || `Direct selfie ${requestedType} punch from Staff App`,
        requestTime: new Date(),
        location: location ? {
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy
        } : null
      };

      const res = await attendanceRequestApi.submitSelfie(payload);
      setSuccessMessage(res.message || `Attendance marked! Clock ${requestedType} recorded successfully.`);
      
      // Store punch details for direct WhatsApp forwarding
      setSubmittedPunch({
        requestedType,
        photo: capturedPhoto,
        location,
        remarks,
        time: new Date()
      });

      if (onSubmitted) onSubmitted(res);
    } catch (err) {
      setError(err.message || 'Failed to record selfie attendance.');
    } finally {
      setLoading(false);
    }
  };

  // Direct Forward to Company WhatsApp Group from Mobile
  const handleForwardToWhatsApp = async () => {
    const empName = employee?.fullName || 'Staff Member';
    const empId = employee?.employeeId || 'ID';
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

    let locLines = '';
    if (location && location.latitude && location.longitude) {
      const lat = Number(location.latitude).toFixed(6);
      const lng = Number(location.longitude).toFixed(6);
      const acc = location.accuracy ? ` (±${location.accuracy}m)` : '';
      locLines = `📍 *GPS:* ${lat}, ${lng}${acc}\n🗺️ *Google Maps:* https://www.google.com/maps?q=${lat},${lng}\n`;
    }

    const shareText = [
      '📸 *ARSHI ENTERPRISES — SELFIE ATTENDANCE PUNCH*',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      `👤 *Staff:* *${empName}* (\`${empId}\`)`,
      `⏱️ *Punch:* *CLOCK ${requestedType}* (${requestedType === 'IN' ? 'Office Entry' : 'Office Exit'})`,
      `📅 *Date & Time:* ${dateStr} • *${timeStr} IST*`,
      locLines,
      `💬 *Note:* _"${remarks.trim() || 'Direct Selfie Punch'}"_`,
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      '✅ *Status: DIRECTLY RECORDED IN SYSTEM*'
    ].filter(Boolean).join('\n');

    // 1. Try Native Android Web Share with Image File
    try {
      if (capturedPhoto && navigator.canShare) {
        const res = await fetch(capturedPhoto);
        const blob = await res.blob();
        const file = new File([blob], `Arshi_Attendance_${empId}_${requestedType}.jpg`, { type: 'image/jpeg' });

        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: `Attendance Punch - ${empName}`,
            text: shareText
          });
          return;
        }
      }
    } catch (shareErr) {
      console.warn('Native share error or dismissed:', shareErr.message);
    }

    // 2. Fallback to WhatsApp URL scheme
    const waUrl = `whatsapp://send?text=${encodeURIComponent(shareText)}`;
    const webWaUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;

    try {
      window.location.href = waUrl;
      setTimeout(() => {
        window.open(webWaUrl, '_blank');
      }, 800);
    } catch (_) {
      window.open(webWaUrl, '_blank');
    }
  };

  if (!isOpen) return null;

  const currentTimeStr = new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden my-auto">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>Selfie Attendance</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  Instant Record
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Direct attendance punch karein aur WhatsApp group me photo bhejein
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

        {/* Live GPS Status Bar */}
        {!submittedPunch && (
          <div className="px-5 pt-3">
            <div className={`p-2.5 rounded-2xl text-[11px] font-medium flex items-center justify-between border ${
              location
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                : locationLoading
                ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300'
                : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300'
            }`}>
              <div className="flex items-center gap-2 overflow-hidden">
                <MapPin className={`w-4 h-4 shrink-0 ${location ? 'text-emerald-600' : 'text-amber-500'}`} />
                <div className="truncate">
                  {locationLoading ? (
                    <span>Exact GPS location trace ho rahi hai...</span>
                  ) : location ? (
                    <span>
                      <strong>GPS Locked:</strong> {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)} (±{location.accuracy}m)
                    </span>
                  ) : (
                    <span>{locationError || 'GPS location mangi ja rahi hai...'}</span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={fetchLocation}
                disabled={locationLoading}
                className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 shrink-0 ml-1 text-slate-600 dark:text-slate-300"
                title="Refresh GPS"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${locationLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        )}

        {/* Form Body or Post-Submission WhatsApp Screen */}
        {submittedPunch ? (
          /* Success Screen with Big WhatsApp Forward Button */
          <div className="p-6 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <CheckCircle className="w-9 h-9" />
            </div>

            <div>
              <h3 className="font-extrabold text-lg text-slate-900 dark:text-white">
                Attendance Marked Successfully!
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Aapka <strong>Clock {submittedPunch.requestedType}</strong> system me direct record ho chuka hai (No admin approval needed).
              </p>
            </div>

            {/* Thumbnail preview of watermarked selfie */}
            <div className="w-36 h-36 mx-auto rounded-2xl overflow-hidden border-2 border-emerald-500 shadow-md">
              <img src={submittedPunch.photo} alt="Punch Selfie" className="w-full h-full object-cover" />
            </div>

            {/* Big WhatsApp Group Share Button */}
            <div className="pt-2 space-y-2.5">
              <button
                type="button"
                onClick={handleForwardToWhatsApp}
                className="w-full py-3.5 px-4 rounded-2xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-extrabold text-sm shadow-xl shadow-[#25D366]/30 transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                <MessageCircle className="w-5 h-5 fill-current" />
                <span>Forward to WhatsApp Group</span>
              </button>

              <button
                type="button"
                onClick={handleClose}
                className="w-full py-3 px-4 rounded-2xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs transition-all"
              >
                Done / Dashboard Par Jayein
              </button>
            </div>
          </div>
        ) : (
          /* Normal Punch Form */
          <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
            {error && (
              <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Camera Viewport / Photo Preview */}
            <div className="relative w-full aspect-[4/3] rounded-3xl overflow-hidden bg-slate-950 border-2 border-slate-800 shadow-inner flex flex-col items-center justify-center">
              {capturedPhoto ? (
                // Captured Snapshot Preview with Watermark
                <div className="relative w-full h-full">
                  <img
                    src={capturedPhoto}
                    alt="Captured Selfie"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-emerald-500 text-white font-bold text-[10px] flex items-center gap-1 shadow">
                    <CheckCircle className="w-3 h-3" />
                    <span>GPS Watermarked</span>
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
                    className="absolute bottom-3 flex items-center gap-2 px-5 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-xl shadow-emerald-600/40 border-2 border-white/30 hover:scale-105 active:scale-95 transition-all"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Snap Photo & Geotag</span>
                  </button>
                </div>
              ) : (
                // Camera blocked / unavailable fallback
                <div className="p-6 text-center space-y-3">
                  <Camera className="w-10 h-10 mx-auto text-slate-500 opacity-50" />
                  <div>
                    <p className="font-bold text-slate-300">Camera Permission Required</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Webcam blocked hai ya device me camera detect nahi hua. Aap photo upload kar sakte hain:
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
                <Clock className="w-4 h-4 text-emerald-500" />
                <span>Punch Time:</span>
              </span>
              <span className="font-mono font-black text-sm text-slate-900 dark:text-white">
                {currentTimeStr}
              </span>
            </div>

            {/* Optional Reason / Remarks */}
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Remarks / Note:
              </label>
              <input
                type="text"
                placeholder="e.g. Office Entry, Field visit duty..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading || !capturedPhoto}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs shadow-lg shadow-emerald-600/30 transition-all disabled:opacity-50 active:scale-98"
              >
                <CheckCircle className="w-4 h-4" />
                <span>
                  {loading
                    ? 'Recording Attendance...'
                    : `Direct Clock ${requestedType} Punch (सीधी हाजिरी लगाएं)`}
                </span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
