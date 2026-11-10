import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import LiveScanSimulator from './components/LiveScanSimulator';
import AttendanceModal from './components/AttendanceModal';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import DateWiseAttendance from './pages/DateWiseAttendance';
import MonthlyReport from './pages/MonthlyReport';
import RawScans from './pages/RawScans';
import Settings from './pages/Settings';
import StaffPortal from './pages/StaffPortal';
import KioskMode from './pages/KioskMode';

function ProtectedLayout() {
  const { user, loading, isAdmin } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [attendanceModalOpen, setAttendanceModalOpen] = useState(false);
  const [recordToEdit, setRecordToEdit] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white font-mono">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs tracking-wider uppercase text-slate-400">Loading Arshi Attendance System...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const handleOpenAttendanceModal = (record = null) => {
    setRecordToEdit(record);
    setAttendanceModalOpen(true);
  };

  const handleScanComplete = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex transition-colors">
      {/* Sidebar Navigation */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        <Navbar
          onOpenSidebar={() => setIsSidebarOpen(true)}
          onOpenSimulator={() => setIsSimulatorOpen(true)}
        />

        <main className="flex-1 p-3 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto" key={refreshKey}>
          <Routes>
            <Route
              path="/"
              element={
                isAdmin ? (
                  <Dashboard
                    onOpenSimulator={() => setIsSimulatorOpen(true)}
                    onOpenAttendanceModal={handleOpenAttendanceModal}
                  />
                ) : (
                  <Navigate to="/my-attendance" replace />
                )
              }
            />
            <Route
              path="/employees"
              element={isAdmin ? <Employees /> : <Navigate to="/my-attendance" replace />}
            />
            <Route
              path="/date-wise"
              element={isAdmin ? <DateWiseAttendance /> : <Navigate to="/my-attendance" replace />}
            />
            <Route
              path="/monthly"
              element={isAdmin ? <MonthlyReport /> : <Navigate to="/my-attendance" replace />}
            />
            <Route
              path="/raw-scans"
              element={isAdmin ? <RawScans /> : <Navigate to="/my-attendance" replace />}
            />
            <Route
              path="/settings"
              element={isAdmin ? <Settings /> : <Navigate to="/my-attendance" replace />}
            />
            <Route
              path="/my-attendance"
              element={<StaffPortal onOpenSimulator={() => setIsSimulatorOpen(true)} />}
            />
            <Route path="*" element={<Navigate to={isAdmin ? "/" : "/my-attendance"} replace />} />
          </Routes>
        </main>
      </div>

      {/* Interactive RFID Simulator Modal */}
      <LiveScanSimulator
        isOpen={isSimulatorOpen}
        onClose={() => setIsSimulatorOpen(false)}
        onScanComplete={handleScanComplete}
      />

      {/* Manual / Correct Attendance Modal */}
      <AttendanceModal
        isOpen={attendanceModalOpen}
        onClose={() => setAttendanceModalOpen(false)}
        recordToEdit={recordToEdit}
        onSaved={handleScanComplete}
      />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/kiosk" element={<KioskMode />} />
            <Route path="/*" element={<ProtectedLayout />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}
