import React, { useState } from 'react';
import { 
  Users, CheckCircle2, Clock, LogOut, ArrowLeft, UserPlus, 
  Search, Shield, RefreshCw, Download, Layers, Calendar, ChevronRight, ChevronLeft,
  Sliders, ShieldCheck, AlertTriangle, XCircle, Smartphone, Camera, Trash2, X
} from 'lucide-react';

export default function ManagerDashboard({
  employees = [],
  attendance = [],
  allAttendance = [],
  onRefresh,
  onBackToKiosk,
  onOpenSettings,
  onCleanDemoData,
  onDeleteEmployee,
  isOnline = true,
  pendingCount = 0
}) {
  const [activeTab, setActiveTab] = useState('today');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedShed, setSelectedShed] = useState('ALL');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [employeeTimeRange, setEmployeeTimeRange] = useState('day'); // 'day' | 'weekly' | '15days' | 'monthly' | '90days' | 'calendar'
  const [calendarMonthDate, setCalendarMonthDate] = useState(new Date());
  const [selectedCalendarDay, setSelectedCalendarDay] = useState(null);

  const handleRefresh = async () => {
    if (onRefresh) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setTimeout(() => setIsRefreshing(false), 600);
      }
    }
  };

  const handleCleanDemoData = () => {
    if (window.confirm('Delete all employee and attendance records? This resets the dashboard.')) {
      if (onCleanDemoData) {
        onCleanDemoData();
      }
    }
  };



  // Stats calculation
  const totalEmployees = employees.length;
  const todayInEmployees = new Set(
    attendance.filter(r => (r.type === 'CHECK_IN' || r.event_type === 'CHECK_IN' || r.type === 'MORNING_IN')).map(r => r.employee_id)
  );
  const presentCount = todayInEmployees.size;

  const todayOutEmployees = new Set(
    attendance.filter(r => (r.type === 'CHECK_OUT' || r.event_type === 'CHECK_OUT' || r.type === 'EVENING_OUT')).map(r => r.employee_id)
  );
  const checkedOutCount = todayOutEmployees.size;
  const absentCount = Math.max(0, totalEmployees - presentCount);

  // Filtered employees
  const filteredEmployees = employees.filter(emp => {
    const name = emp.full_name || emp.name || '';
    const code = emp.emp_code || emp.employee_code || '';
    const role = emp.role || 'Farm Staff';
    const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          role.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  // Filter records for selected employee and time range
  const getEmployeeHistory = () => {
    if (!selectedEmployee) return [];
    const sourceRecords = (allAttendance && allAttendance.length > 0) ? allAttendance : attendance;

    // Filter punches belonging to this employee
    const empPunches = sourceRecords.filter(r => {
      const matchId = selectedEmployee.id && (r.employee_id === selectedEmployee.id || r.id === selectedEmployee.id);
      const matchCode = (selectedEmployee.emp_code || selectedEmployee.employee_code) &&
        (r.emp_code === selectedEmployee.emp_code || r.emp_code === selectedEmployee.employee_code);
      const matchName = (selectedEmployee.full_name || selectedEmployee.name) &&
        (r.employee_name && (r.employee_name.toLowerCase() === (selectedEmployee.full_name || selectedEmployee.name).toLowerCase()));
      return matchId || matchCode || matchName;
    });

    const now = new Date();
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const oneDayMs = 24 * 60 * 60 * 1000;

    return empPunches.filter(p => {
      let pDate;
      if (p.punch_date) {
        const [y, m, d] = p.punch_date.split('-').map(Number);
        pDate = new Date(y, m - 1, d);
      } else if (p.timestamp) {
        const d = new Date(p.timestamp);
        pDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      } else {
        pDate = new Date(todayMidnight);
      }

      const diffDays = Math.floor((todayMidnight - pDate.getTime()) / oneDayMs);

      if (employeeTimeRange === 'day') {
        return diffDays === 0;
      }
      if (employeeTimeRange === 'weekly') {
        return diffDays >= 0 && diffDays < 7;
      }
      if (employeeTimeRange === '15days') {
        return diffDays >= 0 && diffDays < 15;
      }
      if (employeeTimeRange === 'monthly') {
        return diffDays >= 0 && diffDays < 30;
      }
      if (employeeTimeRange === '90days') {
        return diffDays >= 0 && diffDays < 90;
      }
      return true;
    }).sort((a, b) => {
      const tsA = a.event_timestamp || new Date(a.timestamp || 0).getTime();
      const tsB = b.event_timestamp || new Date(b.timestamp || 0).getTime();
      return tsB - tsA;
    });
  };

  const empHistory = selectedEmployee ? getEmployeeHistory() : [];
  const empUniqueDays = new Set(empHistory.map(p => p.punch_date || p.attendance_date)).size;
  const empTotalPunches = empHistory.length;
  const empOnTimePunches = empHistory.filter(p => p.status !== 'LATE').length;
  const empOnTimePercent = empTotalPunches > 0 ? Math.round((empOnTimePunches / empTotalPunches) * 100) : 100;

  const rangeMaxDays = employeeTimeRange === 'day' ? 1 :
                       employeeTimeRange === 'weekly' ? 7 :
                       employeeTimeRange === '15days' ? 15 :
                       employeeTimeRange === 'monthly' ? 30 : 90;
  const empAttendanceRate = Math.min(100, Math.round((empUniqueDays / rangeMaxDays) * 100));

  const exportEmployeeCSV = () => {
    if (empHistory.length === 0) return alert('No attendance records in this period');
    const headers = ['Date,Time,Employee ID,Name,Punch Type,Status\n'];
    const rows = empHistory.map(a => 
      `"${a.punch_date || ''}","${a.punch_time || ''}","${a.emp_code || ''}","${a.employee_name || ''}","${a.type || a.event_type || ''}","${a.status || ''}"`
    );
    const blob = new Blob([headers.concat(rows.join('\n'))], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${(selectedEmployee.full_name || selectedEmployee.name || 'worker').toLowerCase()}_${employeeTimeRange}_attendance.csv`;
    link.click();
  };

  const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const calYear = calendarMonthDate.getFullYear();
  const calMonth = calendarMonthDate.getMonth();
  const daysInCalMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const firstDayOfCalMonth = new Date(calYear, calMonth, 1).getDay(); // 0 is Sunday

  // Get punches for a specific date string (YYYY-MM-DD) for selectedEmployee
  const getEmployeePunchesForDate = (dateStr) => {
    if (!selectedEmployee) return [];
    const sourceRecords = (allAttendance && allAttendance.length > 0) ? allAttendance : attendance;
    return sourceRecords.filter(r => {
      const matchEmp = (selectedEmployee.id && (r.employee_id === selectedEmployee.id || r.id === selectedEmployee.id)) ||
        ((selectedEmployee.emp_code || selectedEmployee.employee_code) && (r.emp_code === selectedEmployee.emp_code || r.emp_code === selectedEmployee.employee_code)) ||
        ((selectedEmployee.full_name || selectedEmployee.name) && (r.employee_name && r.employee_name.toLowerCase() === (selectedEmployee.full_name || selectedEmployee.name).toLowerCase()));
      const punchDate = r.punch_date || r.attendance_date || (r.timestamp ? r.timestamp.split('T')[0] : '');
      return matchEmp && punchDate === dateStr;
    }).sort((a, b) => {
      const tsA = a.event_timestamp || new Date(a.timestamp || 0).getTime();
      const tsB = b.event_timestamp || new Date(b.timestamp || 0).getTime();
      return tsA - tsB;
    });
  };

  // Pre-calculate calendar days data and monthly totals
  const calendarDaysData = (() => {
    if (!selectedEmployee) return { days: [], presentCount: 0, halfDayCount: 0, absentCount: 0, totalWorkingDays: 0 };
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    let presentCount = 0;
    let halfDayCount = 0;
    let absentCount = 0;
    let totalWorkingDays = 0;

    const days = [];
    for (let d = 1; d <= daysInCalMonth; d++) {
      const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayDate = new Date(calYear, calMonth, d);
      const isSunday = dayDate.getDay() === 0;
      const isToday = dateStr === todayStr;
      const isPast = dayDate.getTime() < todayMidnight;
      const isFuture = dayDate.getTime() > todayMidnight;

      const punches = getEmployeePunchesForDate(dateStr);
      let status = 'FUTURE';

      if (isToday) {
        if (punches.length >= 2) status = 'PRESENT';
        else if (punches.length === 1) status = 'HALF_DAY';
        else status = 'PENDING';
      } else if (isFuture) {
        status = 'FUTURE';
      } else {
        if (punches.length >= 2) {
          status = 'PRESENT';
          presentCount++;
          if (!isSunday) totalWorkingDays++;
        } else if (punches.length === 1) {
          status = 'HALF_DAY';
          halfDayCount++;
          if (!isSunday) totalWorkingDays++;
        } else if (isSunday) {
          status = 'OFF_DAY';
        } else {
          status = 'ABSENT';
          absentCount++;
          totalWorkingDays++;
        }
      }

      days.push({
        dayNum: d,
        dateStr,
        isSunday,
        isToday,
        isFuture,
        status,
        punches
      });
    }

    return { days, presentCount, halfDayCount, absentCount, totalWorkingDays };
  })();

  const exportCSV = () => {
    if (attendance.length === 0) return alert('No attendance records to export');
    const headers = ['Employee ID,Name,Type,Time,Date,Shift,Shed,Status\n'];
    const rows = attendance.map(a => 
      `"${a.emp_code}","${a.employee_name}","${a.type}","${a.punch_time}","${a.punch_date}","${a.shift_name}","${a.shed_name}","${a.status}"`
    );
    const blob = new Blob([headers.concat(rows.join('\n'))], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `poultry_attendance_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };



  return (
    <div className="dashboard-container">
      {/* Top Header Bar */}
      <div className="dashboard-header">
        <div className="header-brand-wrap">
          <div className="kiosk-badge">
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary-emerald)' }}></span>
            Gate Kiosk: Live
          </div>
          <div className="farm-title-group">
            <img 
              src="/poultry_icon.jpg" 
              alt="Hen Logo" 
              className="farm-logo-img"
            />
            <div className="header-title-box">
              <h1 className="header-main-title">
                PoultryAttend • Manager Portal
              </h1>
              <p className="header-sub-title">
                Sri Rama Poultry Farm • Operations & Biometric Logs
              </p>
            </div>
          </div>
        </div>

        <div className="header-actions-group">
          <button
            onClick={handleRefresh}
            className="header-btn"
            style={{
              background: 'rgba(16, 185, 129, 0.12)',
              color: 'var(--primary-emerald)',
              border: '1px solid rgba(16, 185, 129, 0.35)',
            }}
            title="Sync live from mobile app"
          >
            <RefreshCw size={15} style={{ transform: isRefreshing ? 'rotate(360deg)' : 'none', transition: 'transform 0.6s ease' }} />
            <span className="btn-text-full">{isRefreshing ? 'Syncing...' : 'Live Sync'}</span>
            <span className="btn-text-short">{isRefreshing ? 'Syncing' : 'Sync'}</span>
          </button>
          <button
            onClick={handleCleanDemoData}
            className="header-btn"
            style={{
              background: 'rgba(239, 68, 68, 0.12)',
              color: '#ef4444',
              border: '1px solid rgba(239, 68, 68, 0.35)',
            }}
            title="Clear all records and reset dashboard"
          >
            <Trash2 size={15} />
            <span className="btn-text-full">Clean Data</span>
            <span className="btn-text-short">Clean</span>
          </button>
          <button
            onClick={onOpenSettings}
            className="header-btn"
            style={{
              background: 'var(--surface-card)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
            }}
          >
            <span>⚙️</span>
            <span className="btn-text-full">Settings & Cloud</span>
            <span className="btn-text-short">Settings</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-top">
            <span className="stat-card-title">Present Today</span>
            <CheckCircle2 size={18} color="var(--primary-emerald)" />
          </div>
          <div className="stat-card-number" style={{ color: 'var(--primary-emerald)' }}>{presentCount}</div>
          <div className="stat-card-footer">Checked in at entrance</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-top">
            <span className="stat-card-title">Checked Out</span>
            <LogOut size={18} color="var(--accent-amber)" />
          </div>
          <div className="stat-card-number" style={{ color: 'var(--accent-amber)' }}>{checkedOutCount}</div>
          <div className="stat-card-footer">Completed day shift</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-top">
            <span className="stat-card-title">Absent Staff</span>
            <Clock size={18} color="var(--danger-red)" />
          </div>
          <div className="stat-card-number" style={{ color: 'var(--danger-red)' }}>{absentCount}</div>
          <div className="stat-card-footer">Pending or on leave</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-top">
            <span className="stat-card-title">Total Enrolled</span>
            <Users size={18} color="var(--secondary-cyan)" />
          </div>
          <div className="stat-card-number" style={{ color: 'var(--secondary-cyan)' }}>{totalEmployees}</div>
          <div className="stat-card-footer">Face profile registered</div>
        </div>
      </div>

      {/* 4-Phase Daily Farm Routine Schedule */}
      <div className="schedule-routine-grid">
        <div className="schedule-routine-item" style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
          <span className="schedule-item-emoji" style={{ fontSize: '1.4rem' }}>🌅</span>
          <div>
            <div className="schedule-item-title" style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--primary-emerald)' }}>Morning Entry</div>
            <div className="schedule-item-sub" style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Shift Start • Until 12:00 PM</div>
          </div>
        </div>

        <div className="schedule-routine-item" style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)' }}>
          <span className="schedule-item-emoji" style={{ fontSize: '1.4rem' }}>🍽️</span>
          <div>
            <div className="schedule-item-title" style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--accent-amber)' }}>Lunch Break</div>
            <div className="schedule-item-sub" style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Lunch Out • 12:00 – 01:00 PM</div>
          </div>
        </div>

        <div className="schedule-routine-item" style={{ background: 'rgba(14, 165, 233, 0.08)', border: '1px solid rgba(14, 165, 233, 0.25)' }}>
          <span className="schedule-item-emoji" style={{ fontSize: '1.4rem' }}>🥪</span>
          <div>
            <div className="schedule-item-title" style={{ fontSize: '0.82rem', fontWeight: 700, color: '#38bdf8' }}>Afternoon Entry</div>
            <div className="schedule-item-sub" style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Lunch Return • 01:00 – 05:00 PM</div>
          </div>
        </div>

        <div className="schedule-routine-item" style={{ background: 'rgba(139, 92, 246, 0.08)', border: '1px solid rgba(139, 92, 246, 0.25)' }}>
          <span className="schedule-item-emoji" style={{ fontSize: '1.4rem' }}>🏠</span>
          <div>
            <div className="schedule-item-title" style={{ fontSize: '0.82rem', fontWeight: 700, color: '#a78bfa' }}>Evening Exit</div>
            <div className="schedule-item-sub" style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Day Complete • 05:00 PM Onwards</div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="nav-tabs-bar">
        {[
          { id: 'today', label: "Today's Live Logs" },
          { id: 'employees', label: 'Employees Roster' },
          { id: 'reports', label: 'Reports & Export' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="nav-tab-button"
            style={{
              background: activeTab === tab.id ? 'var(--surface-card)' : 'transparent',
              color: activeTab === tab.id ? 'var(--primary-emerald)' : 'var(--text-secondary)',
              border: activeTab === tab.id ? '1px solid var(--border-color)' : '1px solid transparent',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: TODAY'S LOGS */}
      {activeTab === 'today' && (
        <div className="data-card">
          <div className="data-card-header">
            <h2 className="data-card-title" style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Real-Time Entrance Punches ({attendance.length})
            </h2>
            <button
              onClick={exportCSV}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                background: 'var(--surface-card)',
                color: 'var(--secondary-cyan)',
                border: '1px solid var(--border-color)',
                padding: '0.4rem 0.8rem',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: 600
              }}
            >
              <Download size={14} /> Export CSV
            </button>
          </div>

          {attendance.length === 0 ? (
            <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Clock size={40} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
              <p style={{ margin: 0, fontSize: '0.85rem' }}>No punches recorded yet today. Stand in front of the kiosk camera to punch in!</p>
            </div>
          ) : (
            <div className="table-scroll-container">
              <table className="responsive-data-table">
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.02)', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-subtle)' }}>
                    <th style={{ padding: '0.85rem 1rem' }}>Employee</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Type</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Time</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {attendance.map((rec, i) => (
                    <tr key={rec.id || i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td 
                        onClick={() => {
                          const matched = employees.find(e => e.id === rec.employee_id || e.emp_code === rec.emp_code || e.employee_code === rec.emp_code) || {
                            id: rec.employee_id,
                            name: rec.employee_name,
                            full_name: rec.employee_name,
                            emp_code: rec.emp_code,
                            role: 'Farm Staff'
                          };
                          setSelectedEmployee(matched);
                          setEmployeeTimeRange('day');
                        }}
                        style={{ padding: '0.85rem 1rem', cursor: 'pointer' }}
                        title="Click to view employee attendance history (Day, Week, 15 Days, Month, 90 Days)"
                      >
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                          <span>{rec.employee_name}</span>
                          <span style={{ fontSize: '0.68rem', padding: '0.12rem 0.4rem', borderRadius: '4px', background: 'rgba(56, 189, 248, 0.15)', color: 'var(--secondary-cyan)', fontWeight: 600 }}>History →</span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{rec.emp_code}</div>
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span style={{
                          padding: '0.25rem 0.6rem',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          background: (rec.type === 'CHECK_IN' || rec.event_type === 'CHECK_IN') ? 'rgba(16, 185, 129, 0.15)' :
                                      (rec.type === 'LUNCH_OUT' || rec.event_type === 'LUNCH_OUT') ? 'rgba(245, 158, 11, 0.15)' :
                                      (rec.type === 'LUNCH_IN' || rec.event_type === 'LUNCH_IN') ? 'rgba(56, 189, 248, 0.15)' :
                                      (rec.type === 'CHECK_OUT' || rec.event_type === 'CHECK_OUT') ? 'rgba(168, 85, 247, 0.15)' : 'rgba(255, 255, 255, 0.1)',
                          color: (rec.type === 'CHECK_IN' || rec.event_type === 'CHECK_IN') ? 'var(--primary-emerald)' :
                                 (rec.type === 'LUNCH_OUT' || rec.event_type === 'LUNCH_OUT') ? 'var(--accent-amber)' :
                                 (rec.type === 'LUNCH_IN' || rec.event_type === 'LUNCH_IN') ? '#38bdf8' :
                                 (rec.type === 'CHECK_OUT' || rec.event_type === 'CHECK_OUT') ? '#c084fc' : '#fff'
                        }}>
                          {(rec.type === 'CHECK_IN' || rec.event_type === 'CHECK_IN') ? '🌅 Morning Entry' :
                           (rec.type === 'LUNCH_OUT' || rec.event_type === 'LUNCH_OUT') ? '🍽️ Lunch Out' :
                           (rec.type === 'LUNCH_IN' || rec.event_type === 'LUNCH_IN') ? '🥪 Afternoon Entry' :
                           (rec.type === 'CHECK_OUT' || rec.event_type === 'CHECK_OUT') ? '🏠 Evening Exit' : (rec.type || rec.event_type)}
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                        {rec.punch_time}
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span style={{
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          color: rec.status === 'LATE' ? 'var(--danger-red)' : 'var(--primary-emerald)'
                        }}>
                          {rec.status === 'LATE' ? '⚠️ Late' : '✓ On Time'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: EMPLOYEES ROSTER */}
      {activeTab === 'employees' && (
        <div className="data-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
            <div style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'var(--surface-card)',
              borderRadius: '8px',
              padding: '0.5rem 0.75rem',
              border: '1px solid var(--border-color)'
            }}>
              <Search size={16} color="var(--text-muted)" />
              <input
                type="text"
                placeholder="Search by worker name, ID or role..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ background: 'transparent', border: 'none', color: '#fff', outline: 'none', width: '100%', fontSize: '0.85rem' }}
              />
            </div>
          </div>

          {filteredEmployees.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '3.5rem 1.5rem',
              background: 'var(--surface-card)',
              borderRadius: '12px',
              border: '1px dashed var(--border-color)',
              color: 'var(--text-muted)'
            }}>
              <Users size={48} style={{ opacity: 0.25, margin: '0 auto 0.75rem' }} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                No Employees Enrolled
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '420px', margin: '0 auto 1.25rem' }}>
                Workers are enrolled directly on the <strong>Mobile Kiosk app</strong>. Once registered on mobile, they will automatically sync and appear here in real-time.
              </p>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.6rem 1.2rem',
                borderRadius: '10px',
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                color: 'var(--primary-emerald)',
                fontSize: '0.85rem',
                fontWeight: 600
              }}>
                <Smartphone size={16} /> Enroll Workers Directly on Mobile Phone
              </div>
            </div>
          ) : (
            <div className="employee-roster-grid">
              {filteredEmployees.map(emp => (
                <div 
                  key={emp.id} 
                  onClick={() => {
                    setSelectedEmployee(emp);
                    setEmployeeTimeRange('day');
                  }}
                  className="employee-card-item"
                >
                  <div className="employee-avatar-circle" style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '50%',
                    background: 'rgba(6, 182, 212, 0.15)',
                    color: 'var(--secondary-cyan)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.2rem',
                    fontWeight: 700,
                    flexShrink: 0
                  }}>
                    {((emp.full_name || emp.name || 'W')[0] || 'W').toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{emp.full_name || emp.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{emp.emp_code || emp.employee_code} • {emp.role || 'Farm Staff'}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--secondary-cyan)', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <span>View Attendance (Day, Week, Month)</span> <ChevronRight size={12} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                    <span style={{
                      fontSize: '0.7rem',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '4px',
                      background: 'rgba(16, 185, 129, 0.15)',
                      color: 'var(--primary-emerald)',
                      fontWeight: 600
                    }}>
                      Enrolled
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`Delete ${emp.full_name} (${emp.emp_code}) from farm roster and kiosk app?`)) {
                          onDeleteEmployee && onDeleteEmployee(emp.id);
                        }
                      }}
                      title="Delete worker"
                      style={{
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.25)',
                        color: 'var(--danger-red)',
                        padding: '0.35rem 0.55rem',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: REPORTS */}
      {activeTab === 'reports' && (
        <div className="data-card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
            Attendance Reports & Analytics
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            Download payroll & shift attendance reports for farm workers.
          </p>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <button
              onClick={exportCSV}
              style={{
                background: 'var(--primary-emerald)',
                color: '#000',
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <Download size={18} /> Download Today's CSV Summary
            </button>
          </div>
        </div>
      )}

      {/* EMPLOYEE ATTENDANCE & PERFORMANCE MODAL (Day, Weekly, 15 Days, Monthly, 90 Days) */}
      {selectedEmployee && (
        <div 
          className="modal-overlay-bg"
          onClick={() => setSelectedEmployee(null)}
        >
          <div 
            className="modal-dialog-box"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="modal-dialog-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', minWidth: 0 }}>
                <div className="modal-employee-avatar" style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '50%',
                  background: 'rgba(6, 182, 212, 0.18)',
                  color: 'var(--secondary-cyan)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.35rem',
                  fontWeight: 800,
                  border: '1px solid rgba(6, 182, 212, 0.4)',
                  flexShrink: 0
                }}>
                  {((selectedEmployee.full_name || selectedEmployee.name || 'W')[0] || 'W').toUpperCase()}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <h2 className="modal-employee-name" style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                      {selectedEmployee.full_name || selectedEmployee.name}
                    </h2>
                    <span style={{
                      fontSize: '0.68rem',
                      padding: '0.15rem 0.45rem',
                      borderRadius: '999px',
                      background: 'rgba(16, 185, 129, 0.15)',
                      color: 'var(--primary-emerald)',
                      fontWeight: 700
                    }}>
                      ● Active
                    </span>
                  </div>
                  <div className="modal-employee-meta" style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.2rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    Code: <strong style={{ color: '#fff' }}>{selectedEmployee.emp_code || selectedEmployee.employee_code}</strong> • Biometric Face Enrolled
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedEmployee(null)}
                style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-secondary)',
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  flexShrink: 0
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="modal-dialog-body">
              {/* Time Range Selector Tabs (Day, Weekly, 15 Days, Monthly, 90 Days, Calendar) */}
              <div className="modal-range-bar">
                {[
                  { id: 'day', label: 'Day (Today)', icon: '📅' },
                  { id: 'weekly', label: 'Weekly (7d)', icon: '📊' },
                  { id: '15days', label: '15 Days', icon: '🗓️' },
                  { id: 'monthly', label: 'Monthly (30d)', icon: '📆' },
                  { id: '90days', label: '90 Days', icon: '📈' },
                  { id: 'calendar', label: 'Visual Calendar', icon: '🗓️' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setEmployeeTimeRange(tab.id);
                      setSelectedCalendarDay(null);
                    }}
                    className="modal-range-btn"
                    style={{
                      border: employeeTimeRange === tab.id ? '1px solid var(--primary-emerald)' : '1px solid transparent',
                      background: employeeTimeRange === tab.id ? 'var(--primary-emerald)' : 'transparent',
                      color: employeeTimeRange === tab.id ? '#000' : 'var(--text-secondary)',
                    }}
                  >
                    <span>{tab.icon}</span>
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>

              {/* VIEW 1: MONTHLY VISUAL ATTENDANCE CALENDAR */}
              {employeeTimeRange === 'calendar' ? (
                <div>
                  {/* Month Navigation Bar */}
                  <div className="cal-nav-bar">
                    <button
                      onClick={() => {
                        setCalendarMonthDate(new Date(calYear, calMonth - 1, 1));
                        setSelectedCalendarDay(null);
                      }}
                      className="cal-nav-btn"
                      style={{
                        background: 'rgba(255, 255, 255, 0.06)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-primary)',
                        padding: '0.4rem 0.8rem',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      <ChevronLeft size={16} /> Prev
                    </button>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Calendar size={18} color="var(--primary-emerald)" />
                      <span className="cal-month-title" style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                        {MONTH_NAMES[calMonth]} {calYear}
                      </span>
                    </div>

                    <button
                      onClick={() => {
                        setCalendarMonthDate(new Date(calYear, calMonth + 1, 1));
                        setSelectedCalendarDay(null);
                      }}
                      className="cal-nav-btn"
                      style={{
                        background: 'rgba(255, 255, 255, 0.06)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-primary)',
                        padding: '0.4rem 0.8rem',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Next <ChevronRight size={16} />
                    </button>
                  </div>

                  {/* Monthly Summary Statistics Chips */}
                  <div className="cal-stats-summary-grid">
                    <div className="cal-stat-chip" style={{
                      background: 'rgba(16, 185, 129, 0.1)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '10px'
                    }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>🟢 Present</div>
                      <div className="cal-stat-chip-num" style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary-emerald)' }}>
                        {calendarDaysData.presentCount} Days
                      </div>
                    </div>

                    <div className="cal-stat-chip" style={{
                      background: 'rgba(245, 158, 11, 0.1)',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '10px'
                    }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>🟡 Half Day</div>
                      <div className="cal-stat-chip-num" style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-amber)' }}>
                        {calendarDaysData.halfDayCount} Days
                      </div>
                    </div>

                    <div className="cal-stat-chip" style={{
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '10px'
                    }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>🔴 Absent</div>
                      <div className="cal-stat-chip-num" style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--danger-red)' }}>
                        {calendarDaysData.absentCount} Days
                      </div>
                    </div>

                    <div className="cal-stat-chip" style={{
                      background: 'rgba(6, 182, 212, 0.1)',
                      border: '1px solid rgba(6, 182, 212, 0.3)',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '10px'
                    }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>📈 Rate</div>
                      <div className="cal-stat-chip-num" style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--secondary-cyan)' }}>
                        {calendarDaysData.totalWorkingDays > 0 ? Math.round(((calendarDaysData.presentCount + calendarDaysData.halfDayCount * 0.5) / calendarDaysData.totalWorkingDays) * 100) : 100}%
                      </div>
                    </div>
                  </div>

                  {/* 7-Day Calendar Grid */}
                  <div className="cal-card-wrapper">
                    {/* Day-of-Week Headers */}
                    <div className="cal-weekdays-row">
                      <span style={{ color: '#ef4444' }}>Sun</span>
                      <span>Mon</span>
                      <span>Tue</span>
                      <span>Wed</span>
                      <span>Thu</span>
                      <span>Fri</span>
                      <span>Sat</span>
                    </div>

                    {/* Day Cells Grid */}
                    <div className="cal-days-grid">
                      {/* Empty pad cells for first day of month */}
                      {Array.from({ length: firstDayOfCalMonth }).map((_, i) => (
                        <div key={`pad-${i}`} className="cal-day-cell" style={{ opacity: 0.1, pointerEvents: 'none' }} />
                      ))}

                      {/* Day cells */}
                      {calendarDaysData.days.map(day => {
                        const isSelected = selectedCalendarDay && selectedCalendarDay.dateStr === day.dateStr;
                        const isPresent = day.status === 'PRESENT';
                        const isHalfDay = day.status === 'HALF_DAY';
                        const isAbsent = day.status === 'ABSENT';
                        const isOff = day.status === 'OFF_DAY';

                        let bg = 'rgba(255, 255, 255, 0.02)';
                        let borderColor = 'var(--border-subtle)';
                        let badgeBg = 'transparent';
                        let badgeColor = 'var(--text-muted)';
                        let badgeText = '';

                        if (isPresent) {
                          bg = 'rgba(16, 185, 129, 0.12)';
                          borderColor = 'rgba(16, 185, 129, 0.4)';
                          badgeBg = 'rgba(16, 185, 129, 0.25)';
                          badgeColor = 'var(--primary-emerald)';
                          badgeText = `🟢 ${day.punches.length}p`;
                        } else if (isHalfDay) {
                          bg = 'rgba(245, 158, 11, 0.12)';
                          borderColor = 'rgba(245, 158, 11, 0.4)';
                          badgeBg = 'rgba(245, 158, 11, 0.25)';
                          badgeColor = 'var(--accent-amber)';
                          badgeText = '🟡 Half';
                        } else if (isAbsent) {
                          bg = 'rgba(239, 68, 68, 0.08)';
                          borderColor = 'rgba(239, 68, 68, 0.3)';
                          badgeBg = 'rgba(239, 68, 68, 0.2)';
                          badgeColor = 'var(--danger-red)';
                          badgeText = '🔴 Abs';
                        } else if (isOff) {
                          badgeText = 'Off';
                        }

                        if (day.isToday) {
                          borderColor = 'var(--secondary-cyan)';
                        }

                        if (isSelected) {
                          borderColor = '#fff';
                          bg = 'rgba(255, 255, 255, 0.12)';
                        }

                        return (
                          <div
                            key={day.dateStr}
                            onClick={() => setSelectedCalendarDay(day)}
                            className="cal-day-cell"
                            style={{
                              background: bg,
                              border: `1px solid ${borderColor}`,
                              boxShadow: day.isToday ? '0 0 10px rgba(6, 182, 212, 0.3)' : 'none'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <span className="cal-cell-num" style={{
                                fontSize: '0.85rem',
                                fontWeight: 800,
                                color: day.isSunday ? '#ef4444' : 'var(--text-primary)'
                              }}>
                                {day.dayNum}
                              </span>
                              {day.isToday && (
                                <span style={{
                                  fontSize: '0.55rem',
                                  padding: '0.05rem 0.25rem',
                                  borderRadius: '3px',
                                  background: 'var(--secondary-cyan)',
                                  color: '#000',
                                  fontWeight: 800
                                }}>
                                  Now
                                </span>
                              )}
                            </div>

                            {badgeText && (
                              <div className="cal-cell-badge" style={{
                                fontSize: '0.68rem',
                                fontWeight: 700,
                                color: badgeColor,
                                background: badgeBg,
                                padding: '0.15rem 0.35rem',
                                borderRadius: '4px',
                                textAlign: 'center',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}>
                                {badgeText}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Day Drilldown Detail Card */}
                  {selectedCalendarDay && (
                    <div style={{
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '12px',
                      padding: '0.85rem 1rem'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                          <span>📅 {selectedCalendarDay.dateStr}</span>
                          <span style={{
                            fontSize: '0.7rem',
                            padding: '0.12rem 0.45rem',
                            borderRadius: '4px',
                            fontWeight: 700,
                            background: selectedCalendarDay.status === 'PRESENT' ? 'rgba(16, 185, 129, 0.2)' :
                                        selectedCalendarDay.status === 'HALF_DAY' ? 'rgba(245, 158, 11, 0.2)' :
                                        selectedCalendarDay.status === 'ABSENT' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                            color: selectedCalendarDay.status === 'PRESENT' ? 'var(--primary-emerald)' :
                                   selectedCalendarDay.status === 'HALF_DAY' ? 'var(--accent-amber)' :
                                   selectedCalendarDay.status === 'ABSENT' ? 'var(--danger-red)' : '#fff'
                          }}>
                            {selectedCalendarDay.status}
                          </span>
                        </div>
                        <button
                          onClick={() => setSelectedCalendarDay(null)}
                          style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                        >
                          <X size={15} />
                        </button>
                      </div>

                      {selectedCalendarDay.punches.length === 0 ? (
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                          No punches recorded for this day. {selectedCalendarDay.isSunday ? 'Weekly off day.' : 'Worker was absent.'}
                        </p>
                      ) : (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                          {selectedCalendarDay.punches.map((p, idx) => (
                            <div key={p.id || idx} style={{
                              background: 'var(--surface-card)',
                              border: '1px solid var(--border-subtle)',
                              padding: '0.45rem 0.75rem',
                              borderRadius: '8px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              fontSize: '0.78rem'
                            }}>
                              <span style={{
                                fontWeight: 700,
                                color: (p.type === 'CHECK_IN' || p.event_type === 'CHECK_IN') ? 'var(--primary-emerald)' :
                                       (p.type === 'LUNCH_OUT' || p.event_type === 'LUNCH_OUT') ? 'var(--accent-amber)' :
                                       (p.type === 'LUNCH_IN' || p.event_type === 'LUNCH_IN') ? '#38bdf8' : '#c084fc'
                              }}>
                                {(p.type === 'CHECK_IN' || p.event_type === 'CHECK_IN') ? '🌅 Morning' :
                                 (p.type === 'LUNCH_OUT' || p.event_type === 'LUNCH_OUT') ? '🍽️ Lunch Out' :
                                 (p.type === 'LUNCH_IN' || p.event_type === 'LUNCH_IN') ? '🥪 Afternoon' :
                                 (p.type === 'CHECK_OUT' || p.event_type === 'CHECK_OUT') ? '🏠 Exit' : (p.type || p.event_type)}
                              </span>
                              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-primary)' }}>
                                {p.punch_time}
                              </span>
                              <span style={{ fontSize: '0.68rem', color: p.status === 'LATE' ? 'var(--danger-red)' : 'var(--primary-emerald)' }}>
                                {p.status === 'LATE' ? '⚠️ Late' : '✓ On Time'}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                /* VIEW 2: STANDARD KPI METRICS & ATTENDANCE LOGS TABLE */
                <div>
                  {/* KPI Metrics Summary Cards */}
                  <div className="modal-stats-grid" style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                    gap: '0.75rem',
                    marginBottom: '1.5rem'
                  }}>
                    <div className="modal-stat-card" style={{
                      background: 'var(--surface-card)',
                      padding: '1rem',
                      borderRadius: '12px',
                      border: '1px solid var(--border-subtle)'
                    }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Days Present</div>
                      <div className="modal-stat-val" style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary-emerald)' }}>
                        {empUniqueDays} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>/ {rangeMaxDays}d</span>
                      </div>
                    </div>

                    <div className="modal-stat-card" style={{
                      background: 'var(--surface-card)',
                      padding: '1rem',
                      borderRadius: '12px',
                      border: '1px solid var(--border-subtle)'
                    }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Total Punches</div>
                      <div className="modal-stat-val" style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--secondary-cyan)' }}>
                        {empTotalPunches}
                      </div>
                    </div>

                    <div className="modal-stat-card" style={{
                      background: 'var(--surface-card)',
                      padding: '1rem',
                      borderRadius: '12px',
                      border: '1px solid var(--border-subtle)'
                    }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Punctuality</div>
                      <div className="modal-stat-val" style={{ fontSize: '1.5rem', fontWeight: 800, color: empOnTimePercent >= 80 ? 'var(--primary-emerald)' : 'var(--accent-amber)' }}>
                        {empOnTimePercent}%
                      </div>
                    </div>

                    <div className="modal-stat-card" style={{
                      background: 'var(--surface-card)',
                      padding: '1rem',
                      borderRadius: '12px',
                      border: '1px solid var(--border-subtle)'
                    }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Attendance Rate</div>
                      <div className="modal-stat-val" style={{ fontSize: '1.5rem', fontWeight: 800, color: empAttendanceRate >= 75 ? 'var(--primary-emerald)' : '#38bdf8' }}>
                        {empAttendanceRate}%
                      </div>
                    </div>
                  </div>

                  {/* Attendance Punches Table */}
                  <div className="data-card" style={{ borderRadius: '12px' }}>
                    <div style={{
                      padding: '0.85rem 1rem',
                      borderBottom: '1px solid var(--border-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: 'rgba(255, 255, 255, 0.02)'
                    }}>
                      <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        Attendance Logs ({empHistory.length})
                      </div>
                      {empHistory.length > 0 && (
                        <button
                          onClick={exportEmployeeCSV}
                          style={{
                            background: 'rgba(16, 185, 129, 0.12)',
                            color: 'var(--primary-emerald)',
                            border: '1px solid rgba(16, 185, 129, 0.35)',
                            padding: '0.35rem 0.75rem',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            cursor: 'pointer'
                          }}
                        >
                          <Download size={13} /> Export CSV
                        </button>
                      )}
                    </div>

                    {empHistory.length === 0 ? (
                      <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <Clock size={32} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                        <p style={{ margin: 0, fontSize: '0.85rem' }}>
                          No punches recorded for {selectedEmployee.full_name || selectedEmployee.name} in this period ({employeeTimeRange === 'day' ? 'Day' : employeeTimeRange}).
                        </p>
                      </div>
                    ) : (
                      <div className="table-scroll-container" style={{ maxHeight: '340px' }}>
                        <table className="responsive-data-table" style={{ fontSize: '0.82rem' }}>
                          <thead style={{ position: 'sticky', top: 0, background: 'var(--surface-card)', zIndex: 1 }}>
                            <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                              <th style={{ padding: '0.7rem 0.75rem' }}>Date</th>
                              <th style={{ padding: '0.7rem 0.75rem' }}>Punch Type</th>
                              <th style={{ padding: '0.7rem 0.75rem' }}>Time</th>
                              <th style={{ padding: '0.7rem 0.75rem' }}>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {empHistory.map((p, idx) => (
                              <tr key={p.id || idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                                <td style={{ padding: '0.7rem 0.75rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                                  {p.punch_date || p.attendance_date || 'Today'}
                                </td>
                                <td style={{ padding: '0.7rem 0.75rem' }}>
                                  <span style={{
                                    padding: '0.2rem 0.5rem',
                                    borderRadius: '6px',
                                    fontSize: '0.72rem',
                                    fontWeight: 700,
                                    background: (p.type === 'CHECK_IN' || p.event_type === 'CHECK_IN') ? 'rgba(16, 185, 129, 0.15)' :
                                                (p.type === 'LUNCH_OUT' || p.event_type === 'LUNCH_OUT') ? 'rgba(245, 158, 11, 0.15)' :
                                                (p.type === 'LUNCH_IN' || p.event_type === 'LUNCH_IN') ? 'rgba(56, 189, 248, 0.15)' :
                                                (p.type === 'CHECK_OUT' || p.event_type === 'CHECK_OUT') ? 'rgba(168, 85, 247, 0.15)' : 'rgba(255, 255, 255, 0.1)',
                                    color: (p.type === 'CHECK_IN' || p.event_type === 'CHECK_IN') ? 'var(--primary-emerald)' :
                                           (p.type === 'LUNCH_OUT' || p.event_type === 'LUNCH_OUT') ? 'var(--accent-amber)' :
                                           (p.type === 'LUNCH_IN' || p.event_type === 'LUNCH_IN') ? '#38bdf8' : '#c084fc'
                                  }}>
                                    {(p.type === 'CHECK_IN' || p.event_type === 'CHECK_IN') ? '🌅 Morning' :
                                     (p.type === 'LUNCH_OUT' || p.event_type === 'LUNCH_OUT') ? '🍽️ Lunch Out' :
                                     (p.type === 'LUNCH_IN' || p.event_type === 'LUNCH_IN') ? '🥪 Afternoon' :
                                     (p.type === 'CHECK_OUT' || p.event_type === 'CHECK_OUT') ? '🏠 Exit' : (p.type || p.event_type)}
                                  </span>
                                </td>
                                <td style={{ padding: '0.7rem 0.75rem', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                                  {p.punch_time}
                                </td>
                                <td style={{ padding: '0.7rem 0.75rem' }}>
                                  <span style={{
                                    fontSize: '0.72rem',
                                    fontWeight: 600,
                                    color: p.status === 'LATE' ? 'var(--danger-red)' : 'var(--primary-emerald)'
                                  }}>
                                    {p.status === 'LATE' ? '⚠️ Late' : '✓ On Time'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="modal-dialog-footer" style={{
              padding: '1rem 1.5rem',
              borderTop: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '0.75rem',
              background: 'rgba(255, 255, 255, 0.02)'
            }}>
              <button
                onClick={() => setSelectedEmployee(null)}
                style={{
                  background: 'var(--surface-card)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                  padding: '0.55rem 1.25rem',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
