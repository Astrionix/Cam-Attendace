import React, { useState, useEffect } from 'react';
import KioskMode from './components/KioskMode';
import ManagerDashboard from './components/ManagerDashboard';
import SettingsModal from './components/SettingsModal';
import PinModal from './components/PinModal';
import { db } from './utils/supabase';

export default function App() {
  const [currentMode, setCurrentMode] = useState('admin'); // Web is dedicated Manager Dashboard
  const [showPinModal, setShowPinModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const [employees, setEmployees] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [allAttendance, setAllAttendance] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load initial data
  const refreshData = async () => {
    try {
      const emps = await db.getEmployees();
      const allAtts = await db.getAttendance('ALL');
      const todayStr = new Date().toISOString().split('T')[0];
      const todayAtts = (allAtts || []).filter(r => r.punch_date === todayStr);
      setEmployees(emps);
      setAllAttendance(allAtts || []);
      setAttendance(todayAtts || []);
      setPendingCount(db.getPendingSyncCount());
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    refreshData();
    const interval = setInterval(() => {
      refreshData();
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  const handleRecordPunch = async (employee) => {
    const newRecord = await db.recordPunch(employee);
    await refreshData();
    return newRecord;
  };

  const handleSaveEmployee = async (newEmp) => {
    await db.addEmployee(newEmp);
    await refreshData();
    setCurrentMode('admin');
  };

  const handleCleanDemoData = async () => {
    await db.cleanAllData();
    await refreshData();
  };

  const handleDeleteEmployee = async (id) => {
    await db.deleteEmployee(id);
    await refreshData();
  };

  return (
    <div>
      {/* MODE 1: ATTENDANCE KIOSK */}
      {currentMode === 'kiosk' && (
        <KioskMode
          employees={employees}
          onRecordPunch={handleRecordPunch}
          onOpenAdmin={() => setCurrentMode('admin')}
          isOnline={isOnline}
          pendingCount={pendingCount}
        />
      )}

      {/* MODE 2: MANAGER DASHBOARD */}
      {currentMode !== 'kiosk' && (
        <ManagerDashboard
          employees={employees}
          attendance={attendance}
          allAttendance={allAttendance}
          onRefresh={refreshData}
          onBackToKiosk={() => setCurrentMode('kiosk')}
          onOpenSettings={() => setShowSettingsModal(true)}
          onCleanDemoData={handleCleanDemoData}
          onDeleteEmployee={handleDeleteEmployee}
          isOnline={isOnline}
          pendingCount={pendingCount}
        />
      )}

      {/* PIN LOCK MODAL */}
      {showPinModal && (
        <PinModal
          onClose={() => setShowPinModal(false)}
          onSuccess={() => {
            setShowPinModal(false);
            setCurrentMode('admin');
          }}
        />
      )}

      {/* SETTINGS MODAL */}
      {showSettingsModal && (
        <SettingsModal
          onClose={() => setShowSettingsModal(false)}
          onSaved={refreshData}
        />
      )}
    </div>
  );
}
