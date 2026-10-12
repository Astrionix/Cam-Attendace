import React, { useState, useEffect } from 'react';
import { 
  Users, CheckCircle2, Clock, LogOut, ArrowLeft, UserPlus, 
  Search, Shield, RefreshCw, Download, Layers, Calendar, ChevronRight, ChevronLeft,
  Sliders, ShieldCheck, AlertTriangle, XCircle, Smartphone, Camera, Trash2, X,
  Activity, Zap, Compass, Filter, FileText, Check, ExternalLink, Sparkles, Plus,
  Wallet, DollarSign, Edit3, Receipt, Banknote, CreditCard
} from 'lucide-react';
import { playChime, speakGreeting, speakCooldown } from '../utils/audio';

export default function ManagerDashboard({
  employees = [],
  attendance = [],
  allAttendance = [],
  onRefresh,
  onRecordPunch,
  onBackToKiosk,
  onOpenSettings,
  onCleanDemoData,
  onDeleteEmployee,
  onAddEmployee,
  onUpdateWage,
  isOnline = true,
  pendingCount = 0
}) {
  const [activeTab, setActiveTab] = useState('today'); // 'today' | 'employees' | 'salary' | 'reports'
  const [searchQuery, setSearchQuery] = useState('');
  const [punchFilter, setPunchFilter] = useState('ALL'); // 'ALL' | 'IN' | 'OUT'
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showProtocol, setShowProtocol] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [employeeTimeRange, setEmployeeTimeRange] = useState('day'); // 'day' | 'weekly' | '15days' | 'monthly' | '90days' | 'calendar'
  const [calendarMonthDate, setCalendarMonthDate] = useState(new Date());
  const [selectedCalendarDay, setSelectedCalendarDay] = useState(null);
  const [currentTimeStr, setCurrentTimeStr] = useState('');
  const [currentDateStr, setCurrentDateStr] = useState('');
  const [actionAlert, setActionAlert] = useState(null);

  // Salary & Payroll state
  const [salaryMonthDate, setSalaryMonthDate] = useState(new Date());
  const [editingWageEmp, setEditingWageEmp] = useState(null);
  const [wageInputValue, setWageInputValue] = useState('500');
  const [isSavingWage, setIsSavingWage] = useState(false);
  const [paidStatusMap, setPaidStatusMap] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('poultry_paid_records') || '{}');
    } catch (e) {
      return {};
    }
  });

  // New Employee form state
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpCode, setNewEmpCode] = useState('');
  const [newEmpShed, setNewEmpShed] = useState('Broiler Shed #1');
  const [newEmpRole, setNewEmpRole] = useState('Farm Technician');
  const [newEmpPhone, setNewEmpPhone] = useState('');
  const [newEmpWage, setNewEmpWage] = useState('500');
  const [isSavingEmp, setIsSavingEmp] = useState(false);

  // Live ticking clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTimeStr(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setCurrentDateStr(now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-dismiss action alert banner
  useEffect(() => {
    if (actionAlert) {
      const t = setTimeout(() => setActionAlert(null), 4000);
      return () => clearTimeout(t);
    }
  }, [actionAlert]);

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

  const handleSimulatePunch = async (emp) => {
    if (!onRecordPunch) return;
    try {
      const rec = await onRecordPunch(emp);
      const isCheckIn = rec.type === 'CHECK_IN';
      playChime(isCheckIn);
      speakGreeting(emp.full_name || emp.name, isCheckIn);
      setActionAlert({
        type: 'success',
        message: `✓ ${isCheckIn ? 'Gate Entry (IN)' : 'Gate Exit (OUT)'} recorded for ${emp.full_name || emp.name} at ${rec.punch_time}`
      });
    } catch (err) {
      if (err?.isCooldown) {
        speakCooldown(emp.full_name || emp.name, err.remainingMinutes);
        setActionAlert({
          type: 'warning',
          message: `⏱️ 10-Min Cooldown Active for ${emp.full_name || emp.name}! Next punch in ${err.remainingMinutes} min.`
        });
      } else {
        console.error(err);
      }
    }
  };

  const handleCreateEmployee = async (e) => {
    e.preventDefault();
    if (!newEmpName.trim()) return alert('Please enter worker full name');
    if (!onAddEmployee) return;

    setIsSavingEmp(true);
    try {
      const code = newEmpCode.trim() || `PF-${Math.floor(100 + Math.random() * 900)}`;
      await onAddEmployee({
        full_name: newEmpName.trim(),
        name: newEmpName.trim(),
        emp_code: code,
        employee_code: code,
        shed_name: newEmpShed,
        role: newEmpRole,
        phone: newEmpPhone.trim(),
        daily_wage: Number(newEmpWage) || 500,
        status: 'ACTIVE'
      });
      setShowAddModal(false);
      setNewEmpName('');
      setNewEmpCode('');
      setNewEmpPhone('');
      setNewEmpWage('500');
      setActionAlert({
        type: 'success',
        message: `✓ Worker ${newEmpName} enrolled successfully with ₹${newEmpWage || 500}/day pay!`
      });
    } catch (err) {
      alert('Failed to save worker: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSavingEmp(false);
    }
  };

  const handleSaveWage = async (e) => {
    e.preventDefault();
    if (!editingWageEmp) return;
    const wageNum = Number(wageInputValue);
    if (isNaN(wageNum) || wageNum < 0) return alert('Please enter a valid wage amount');

    setIsSavingWage(true);
    try {
      if (onUpdateWage) {
        await onUpdateWage(editingWageEmp.id, wageNum);
      }
      setActionAlert({
        type: 'success',
        message: `✓ Daily pay updated to ₹${wageNum}/day for ${editingWageEmp.name}!`
      });
      setEditingWageEmp(null);
    } catch (err) {
      alert('Failed to update salary: ' + err.message);
    } finally {
      setIsSavingWage(false);
    }
  };

  const togglePaymentStatus = (empKey) => {
    const next = { ...paidStatusMap, [empKey]: !paidStatusMap[empKey] };
    setPaidStatusMap(next);
    localStorage.setItem('poultry_paid_records', JSON.stringify(next));
  };

  // Helper to determine an employee's live state today (Inside vs Outside)
  const getEmployeeCurrentState = (emp) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const sourceRecords = (allAttendance && allAttendance.length > 0) ? allAttendance : attendance;
    const empPunches = sourceRecords.filter(r => {
      const matchId = emp.id && (r.employee_id === emp.id || r.id === emp.id);
      const matchCode = (emp.emp_code || emp.employee_code) &&
        (r.emp_code === emp.emp_code || r.emp_code === emp.employee_code);
      const matchName = (emp.full_name || emp.name) &&
        (r.employee_name && (r.employee_name.toLowerCase() === (emp.full_name || emp.name).toLowerCase()));
      const punchDate = r.punch_date || r.attendance_date || (r.timestamp ? r.timestamp.split('T')[0] : '');
      return (matchId || matchCode || matchName) && punchDate === todayStr;
    }).sort((a, b) => {
      const tsA = a.event_timestamp || new Date(a.timestamp || 0).getTime();
      const tsB = b.event_timestamp || new Date(b.timestamp || 0).getTime();
      return tsB - tsA; // newest first
    });

    const lastPunch = empPunches[0];
    if (!lastPunch) return { isInside: false, hasPunchedToday: false, lastPunch: null };

    const isInside = (lastPunch.type === 'CHECK_IN' || lastPunch.event_type === 'CHECK_IN' || lastPunch.type === 'MORNING_IN');
    return { isInside, hasPunchedToday: true, lastPunch };
  };

  // Helper to calculate an employee's payroll details for any given month
  const getEmployeeSalaryDetails = (emp, targetYear, targetMonth) => {
    const sourceRecords = (allAttendance && allAttendance.length > 0) ? allAttendance : attendance;
    const targetPrefix = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}`;

    const empPunches = sourceRecords.filter(r => {
      const matchId = emp.id && (r.employee_id === emp.id || r.id === emp.id);
      const matchCode = (emp.emp_code || emp.employee_code) &&
        (r.emp_code === emp.emp_code || r.emp_code === emp.employee_code);
      const matchName = (emp.full_name || emp.name) &&
        (r.employee_name && (r.employee_name.toLowerCase() === (emp.full_name || emp.name).toLowerCase()));
      
      if (!(matchId || matchCode || matchName)) return false;

      const punchDate = r.punch_date || r.attendance_date || (r.timestamp ? r.timestamp.split('T')[0] : '');
      return punchDate && punchDate.startsWith(targetPrefix);
    });

    const uniqueDates = new Set(
      empPunches.map(p => p.punch_date || p.attendance_date || (p.timestamp ? p.timestamp.split('T')[0] : ''))
    );
    const daysPresent = uniqueDates.size;
    const dailyWage = Number(emp.daily_wage) || 500;
    const earnedSalary = daysPresent * dailyWage;

    const totalDaysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
    const now = new Date();
    const isCurrentMonth = now.getFullYear() === targetYear && now.getMonth() === targetMonth;
    const elapsedDays = isCurrentMonth ? now.getDate() : totalDaysInMonth;
    const daysAbsent = Math.max(0, elapsedDays - daysPresent);

    const empKey = `${targetYear}-${targetMonth + 1}_${emp.id || emp.emp_code}`;
    const isPaid = Boolean(paidStatusMap[empKey]);

    return {
      daysPresent,
      dailyWage,
      earnedSalary,
      totalDaysInMonth,
      elapsedDays,
      daysAbsent,
      punchCount: empPunches.length,
      isPaid,
      empKey
    };
  };

  // Stats calculation
  const totalEmployees = employees.length;
  
  let insideCount = 0;
  let outsidePunchedCount = 0;

  employees.forEach(emp => {
    const state = getEmployeeCurrentState(emp);
    if (state.hasPunchedToday) {
      if (state.isInside) insideCount++;
      else outsidePunchedCount++;
    }
  });

  const presentCount = insideCount;
  const checkedOutCount = outsidePunchedCount;
  const absentCount = Math.max(0, totalEmployees - (insideCount + outsidePunchedCount));

  // Current selected payroll month variables
  const payYear = salaryMonthDate.getFullYear();
  const payMonth = salaryMonthDate.getMonth();
  
  const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Farm-wide aggregate salary totals for the chosen payroll month
  let totalFarmMonthlyPayroll = 0;
  let totalFarmDaysWorked = 0;
  let totalPaidWorkers = 0;
  let totalWagesSum = 0;

  employees.forEach(emp => {
    const details = getEmployeeSalaryDetails(emp, payYear, payMonth);
    totalFarmMonthlyPayroll += details.earnedSalary;
    totalFarmDaysWorked += details.daysPresent;
    totalWagesSum += details.dailyWage;
    if (details.isPaid) totalPaidWorkers++;
  });

  const avgDailyWage = totalEmployees > 0 ? Math.round(totalWagesSum / totalEmployees) : 500;

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

  // Filter punches for today's table
  const filteredAttendance = attendance.filter(rec => {
    if (punchFilter === 'IN') {
      return (rec.type === 'CHECK_IN' || rec.event_type === 'CHECK_IN' || rec.type === 'MORNING_IN');
    }
    if (punchFilter === 'OUT') {
      return (rec.type === 'CHECK_OUT' || rec.event_type === 'CHECK_OUT' || rec.type === 'EVENING_OUT');
    }
    return true;
  });

  // Filter records for selected employee and time range
  const getEmployeeHistory = () => {
    if (!selectedEmployee) return [];
    const sourceRecords = (allAttendance && allAttendance.length > 0) ? allAttendance : attendance;

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

      if (employeeTimeRange === 'day') return diffDays === 0;
      if (employeeTimeRange === 'weekly') return diffDays >= 0 && diffDays < 7;
      if (employeeTimeRange === '15days') return diffDays >= 0 && diffDays < 15;
      if (employeeTimeRange === 'monthly') return diffDays >= 0 && diffDays < 30;
      if (employeeTimeRange === '90days') return diffDays >= 0 && diffDays < 90;
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

  const calYear = calendarMonthDate.getFullYear();
  const calMonth = calendarMonthDate.getMonth();
  const daysInCalMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const firstDayOfCalMonth = new Date(calYear, calMonth, 1).getDay(); // 0 is Sunday

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

  const exportCSV = () => {
    const list = attendance;
    if (list.length === 0) return alert('No attendance records to export today');
    const headers = ['Employee ID,Name,Movement,Time,Status,Date\n'];
    const rows = list.map(a => 
      `"${a.emp_code || ''}","${a.employee_name || ''}","${a.type || a.event_type || ''}","${a.punch_time || ''}","${a.status || ''}"`
    );
    const blob = new Blob([headers.concat(rows.join('\n'))], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `poultry_attendance_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  // Export full payroll spreadsheet for the selected month
  const exportPayrollCSV = () => {
    if (employees.length === 0) return alert('No employees found to export payroll');
    const headers = ['Employee ID,Worker Name,Shed,Daily Wage (INR),Month,Days Present,Days Absent,Calculated Salary (INR),Status\n'];
    const rows = employees.map(emp => {
      const details = getEmployeeSalaryDetails(emp, payYear, payMonth);
      const code = emp.emp_code || emp.employee_code || '';
      const name = emp.full_name || emp.name || '';
      const shed = emp.shed_name || 'Broiler Shed #1';
      const status = details.isPaid ? 'PAID' : 'PENDING';
      const monthStr = `${MONTH_NAMES[payMonth]} ${payYear}`;
      return `"${code}","${name}","${shed}",${details.dailyWage},"${monthStr}",${details.daysPresent},${details.daysAbsent},${details.earnedSalary},"${status}"`;
    });

    const blob = new Blob([headers.concat(rows.join('\n'))], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `poultry_payroll_${payYear}_${String(payMonth + 1).padStart(2, '0')}.csv`;
    link.click();
  };

  // Export single worker pay receipt
  const exportWorkerPaySlip = (emp) => {
    const details = getEmployeeSalaryDetails(emp, payYear, payMonth);
    const code = emp.emp_code || emp.employee_code || '';
    const name = emp.full_name || emp.name || 'Worker';
    const monthStr = `${MONTH_NAMES[payMonth]} ${payYear}`;

    const content = [
      `====================================================`,
      `          SRI RAMA POULTRY FARM - PAY SLIP`,
      `====================================================`,
      `Employee Code : ${code}`,
      `Worker Name   : ${name}`,
      `Shed Section  : ${emp.shed_name || 'Broiler Shed #1'}`,
      `Pay Period    : ${monthStr}`,
      `Daily Pay Rate: Rs. ${details.dailyWage} / Day`,
      `----------------------------------------------------`,
      `Total Days In Month : ${details.totalDaysInMonth} Days`,
      `Days Present (Att)  : ${details.daysPresent} Days`,
      `Days Absent / Off   : ${details.daysAbsent} Days`,
      `----------------------------------------------------`,
      `GROSS SALARY EARNED : Rs. ${details.earnedSalary}`,
      `Payment Status      : ${details.isPaid ? 'PAID' : 'PENDING'}`,
      `====================================================`,
      `Generated by PoultryAttend Smart Biometric Terminal`,
      `Date: ${new Date().toLocaleString()}`,
      `====================================================`
    ].join('\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `payslip_${name.toLowerCase()}_${payYear}_${payMonth + 1}.txt`;
    link.click();
  };

  return (
    <div className="dashboard-container">
      {/* ACTION ALERT TOAST */}
      {actionAlert && (
        <div style={{
          position: 'fixed',
          top: '1.25rem',
          right: '1.25rem',
          zIndex: 9999,
          background: actionAlert.type === 'warning' ? 'rgba(245, 158, 11, 0.95)' : 'rgba(16, 185, 129, 0.95)',
          color: '#ffffff',
          padding: '0.9rem 1.4rem',
          borderRadius: '14px',
          boxShadow: '0 12px 35px rgba(0,0,0,0.6)',
          backdropFilter: 'blur(16px)',
          fontWeight: 700,
          fontSize: '0.88rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.65rem',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          {actionAlert.type === 'warning' ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
          <span>{actionAlert.message}</span>
        </div>
      )}

      {/* TOP COMMAND HEADER */}
      <div className="dashboard-header">
        <div className="header-brand-wrap">
          <div className="farm-title-group">
            <img 
              src="/poultry_icon.jpg" 
              alt="Farm Logo" 
              className="farm-logo-img"
              onError={e => { e.target.style.display = 'none'; }}
            />
            <div className="header-title-box">
              <h1 className="header-main-title">PoultryAttend</h1>
              <div className="header-sub-title">
                Sri Rama Poultry Farm • Smart Biometric Terminal
              </div>
            </div>
          </div>

          <div className="kiosk-badge">
            <span className="live-dot" style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary-emerald)' }} />
            <span>Gate Kiosk: Live</span>
          </div>

          <div className="header-clock-pill">
            <Clock size={15} color="var(--secondary-cyan-light)" />
            <span>{currentTimeStr || '10:45:00 PM'}</span>
          </div>
        </div>

        <div className="header-actions-group">
          {/* SYNC REFRESH */}
          <button
            onClick={handleRefresh}
            className="header-btn header-btn-secondary"
            title="Refresh latest gate records"
          >
            <RefreshCw size={15} className={isRefreshing ? 'spin' : ''} />
            <span className="btn-text-full">Live Sync</span>
          </button>

          {/* LAUNCH KIOSK */}
          {onBackToKiosk && (
            <button
              onClick={onBackToKiosk}
              className="header-btn header-btn-primary"
            >
              <Camera size={15} />
              <span>Gate Camera</span>
            </button>
          )}

          {/* ENROLL WORKER */}
          <button
            onClick={() => setShowAddModal(true)}
            className="header-btn header-btn-secondary"
          >
            <UserPlus size={15} color="var(--primary-emerald-light)" />
            <span className="btn-text-full">Enroll Staff</span>
          </button>

          {/* SETTINGS */}
          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              className="header-btn header-btn-secondary"
            >
              <Sliders size={15} />
              <span className="btn-text-full">Settings</span>
            </button>
          )}

          {/* CLEAN DATA */}
          {onCleanDemoData && (
            <button
              onClick={handleCleanDemoData}
              className="header-btn"
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: 'var(--danger-red-light)'
              }}
              title="Delete all records to test clean"
            >
              <Trash2 size={14} />
              <span className="btn-text-full">Clean</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI METRIC SUMMARY CARDS */}
      <div className="stats-grid">
        {/* CARD 1: INSIDE FARM */}
        <div className="stat-card stat-card-present">
          <div className="stat-card-top">
            <span className="stat-card-title">Inside Farm</span>
            <div className="stat-card-icon-wrap" style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--primary-emerald-light)' }}>
              <CheckCircle2 size={20} />
            </div>
          </div>
          <div className="stat-card-number" style={{ color: 'var(--primary-emerald-light)' }}>
            {presentCount}
          </div>
          <div className="stat-card-footer">
            <span>Checked in at gate</span>
            <span className="stat-status-pill" style={{ background: 'rgba(16, 185, 129, 0.18)', color: 'var(--primary-emerald-light)' }}>
              <span className="live-dot" style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--primary-emerald)' }} />
              Live Duty
            </span>
          </div>
        </div>

        {/* CARD 2: OUTSIDE / PERMISSION */}
        <div className="stat-card stat-card-exit">
          <div className="stat-card-top">
            <span className="stat-card-title">Outside Gate</span>
            <div className="stat-card-icon-wrap" style={{ background: 'rgba(245, 158, 11, 0.15)', color: 'var(--accent-amber-light)' }}>
              <LogOut size={20} />
            </div>
          </div>
          <div className="stat-card-number" style={{ color: 'var(--accent-amber-light)' }}>
            {checkedOutCount}
          </div>
          <div className="stat-card-footer">
            <span>Permission / Shift complete</span>
            <span className="stat-status-pill" style={{ background: 'rgba(245, 158, 11, 0.18)', color: 'var(--accent-amber-light)' }}>
              ● Off Farm
            </span>
          </div>
        </div>

        {/* CARD 3: ABSENT */}
        <div className="stat-card stat-card-absent">
          <div className="stat-card-top">
            <span className="stat-card-title">Absent Staff</span>
            <div className="stat-card-icon-wrap" style={{ background: 'rgba(239, 68, 68, 0.15)', color: 'var(--danger-red-light)' }}>
              <Clock size={20} />
            </div>
          </div>
          <div className="stat-card-number" style={{ color: 'var(--danger-red-light)' }}>
            {absentCount}
          </div>
          <div className="stat-card-footer">
            <span>Pending morning arrival</span>
            <span className="stat-status-pill" style={{ background: 'rgba(239, 68, 68, 0.18)', color: 'var(--danger-red-light)' }}>
              ● Awaiting
            </span>
          </div>
        </div>

        {/* CARD 4: ENROLLED */}
        <div className="stat-card stat-card-total">
          <div className="stat-card-top">
            <span className="stat-card-title">Enrolled Staff</span>
            <div className="stat-card-icon-wrap" style={{ background: 'rgba(6, 182, 212, 0.15)', color: 'var(--secondary-cyan-light)' }}>
              <Users size={20} />
            </div>
          </div>
          <div className="stat-card-number" style={{ color: 'var(--secondary-cyan-light)' }}>
            {totalEmployees}
          </div>
          <div className="stat-card-footer">
            <span>Biometric faces registered</span>
            <span className="stat-status-pill" style={{ background: 'rgba(6, 182, 212, 0.18)', color: 'var(--secondary-cyan-light)' }}>
              ✓ MobileFaceNet
            </span>
          </div>
        </div>
      </div>

      {/* SLIM 10-MIN GATE PROTOCOL TELEMETRY STRIP */}
      <div className="protocol-strip-container">
        <div className="protocol-strip-header">
          <div className="protocol-badge-pill">
            <Zap size={16} color="var(--primary-emerald)" />
            <span>Gate Workflow • 10-Minute Cooldown & Multi-Entry Protection</span>
          </div>

          <div className="protocol-stepper-inline">
            <span className="protocol-step-chip" style={{ background: 'rgba(16, 185, 129, 0.12)', color: 'var(--primary-emerald-light)' }}>
              🟢 1. Gate IN
            </span>
            <span className="protocol-connector-arrow">➔</span>
            <span className="protocol-step-chip" style={{ background: 'rgba(245, 158, 11, 0.12)', color: 'var(--accent-amber-light)' }}>
              ⏱️ 2. 10-Min Buffer
            </span>
            <span className="protocol-connector-arrow">➔</span>
            <span className="protocol-step-chip" style={{ background: 'rgba(6, 182, 212, 0.12)', color: 'var(--secondary-cyan-light)' }}>
              🚶 3. Permissions & Chores
            </span>
            <span className="protocol-connector-arrow">➔</span>
            <span className="protocol-step-chip" style={{ background: 'rgba(239, 68, 68, 0.12)', color: 'var(--danger-red-light)' }}>
              🔴 4. Gate OUT
            </span>
          </div>

          <button
            onClick={() => setShowProtocol(!showProtocol)}
            className="protocol-toggle-btn"
          >
            <span>{showProtocol ? 'Hide Rules ▲' : 'Protocol Details ▼'}</span>
          </button>
        </div>

        {/* EXPANDABLE PROTOCOL DETAILS CARDS */}
        {showProtocol && (
          <div className="protocol-expanded-grid">
            <div className="protocol-expanded-card" style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--primary-emerald-light)', textTransform: 'uppercase' }}>Step 1</span>
                <span>🟢</span>
              </div>
              <div style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--primary-emerald-light)' }}>
                Gate Entry (IN)
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                Employee scans face upon entering farm. Official arrival timestamp recorded.
              </div>
            </div>

            <div className="protocol-expanded-card" style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--accent-amber-light)', textTransform: 'uppercase' }}>Step 2</span>
                <span>⏱️</span>
              </div>
              <div style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--accent-amber-light)' }}>
                10-Min Buffer
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                Strict 10-minute cooldown activates. Stops accidental double scans or rapid re-punches.
              </div>
            </div>

            <div className="protocol-expanded-card" style={{ background: 'rgba(6, 182, 212, 0.08)', border: '1px solid rgba(6, 182, 212, 0.25)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--secondary-cyan-light)', textTransform: 'uppercase' }}>Step 3</span>
                <span>🚶‍♂️</span>
              </div>
              <div style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--secondary-cyan-light)' }}>
                Permissions & Chores
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                Workers can step out on permission, field chores, or lunch and re-enter freely anytime.
              </div>
            </div>

            <div className="protocol-expanded-card" style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--danger-red-light)', textTransform: 'uppercase' }}>Step 4</span>
                <span>🔴</span>
              </div>
              <div style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--danger-red-light)' }}>
                Gate Exit (OUT)
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                Staff scan when leaving. Toggles state to OUT. 10-minute buffer resets for safe return.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* NAVIGATION TABS BAR (4 TABS) */}
      <div className="nav-tabs-bar">
        <button
          onClick={() => setActiveTab('today')}
          className={`nav-tab-button ${activeTab === 'today' ? 'active' : ''}`}
        >
          <Activity size={16} />
          <span>Real-Time Gate Punches</span>
          <span className="nav-tab-counter" style={{ 
            background: activeTab === 'today' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255, 255, 255, 0.08)',
            color: activeTab === 'today' ? 'var(--primary-emerald-light)' : 'var(--text-secondary)'
          }}>
            {attendance.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('employees')}
          className={`nav-tab-button ${activeTab === 'employees' ? 'active' : ''}`}
        >
          <Users size={16} />
          <span>Enrolled Staff Roster</span>
          <span className="nav-tab-counter" style={{ 
            background: activeTab === 'employees' ? 'rgba(6, 182, 212, 0.3)' : 'rgba(255, 255, 255, 0.08)',
            color: activeTab === 'employees' ? 'var(--secondary-cyan-light)' : 'var(--text-secondary)'
          }}>
            {employees.length}
          </span>
        </button>

        {/* TAB 3: SALARY & PAYROLL LEDGER */}
        <button
          onClick={() => setActiveTab('salary')}
          className={`nav-tab-button ${activeTab === 'salary' ? 'active' : ''}`}
        >
          <Banknote size={16} />
          <span>Salary Pay & Attendance</span>
          <span className="nav-tab-counter" style={{ 
            background: activeTab === 'salary' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255, 255, 255, 0.08)',
            color: activeTab === 'salary' ? 'var(--primary-emerald-light)' : 'var(--text-secondary)'
          }}>
            ₹{totalFarmMonthlyPayroll.toLocaleString()}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className={`nav-tab-button ${activeTab === 'reports' ? 'active' : ''}`}
        >
          <FileText size={16} />
          <span>Reports & Shift Analytics</span>
        </button>
      </div>

      {/* ========================================================= */}
      {/*              TAB 1: TODAY'S LIVE LOGS                     */}
      {/* ========================================================= */}
      {activeTab === 'today' && (
        <div>
          {/* SIMULATOR QUICK TEST BOX */}
          {employees.length > 0 && (
            <div className="simulator-box">
              <div className="simulator-box-title">
                <Sparkles size={16} color="var(--primary-emerald-light)" />
                <span>Quick Biometric Simulator: Tap worker to test 10-Min Cooldown & Entry/Exit toggling</span>
              </div>
              <div className="simulator-chips-wrap">
                {employees.map(emp => {
                  const state = getEmployeeCurrentState(emp);
                  return (
                    <button
                      key={emp.id}
                      onClick={() => handleSimulatePunch(emp)}
                      className="simulator-chip-btn"
                      title={state.isInside ? 'Currently inside farm - click to test exit' : 'Currently outside - click to test entry'}
                    >
                      <span>{state.isInside ? '🔴 Exit' : '🟢 Enter'}:</span>
                      <span>{emp.full_name || emp.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="data-card">
            <div className="data-card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
                <h2 className="data-card-title">
                  <span>Entrance Live Feed</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                    ({filteredAttendance.length} records)
                  </span>
                </h2>

                {/* Filter Pills (All, In Only, Out Only) */}
                <div style={{ display: 'flex', gap: '0.35rem', background: 'rgba(255, 255, 255, 0.04)', padding: '0.2rem', borderRadius: '8px' }}>
                  {['ALL', 'IN', 'OUT'].map(f => (
                    <button
                      key={f}
                      onClick={() => setPunchFilter(f)}
                      style={{
                        padding: '0.25rem 0.65rem',
                        borderRadius: '6px',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        background: punchFilter === f ? 'var(--primary-emerald)' : 'transparent',
                        color: punchFilter === f ? '#000' : 'var(--text-secondary)',
                        cursor: 'pointer'
                      }}
                    >
                      {f === 'ALL' ? 'All Movements' : f === 'IN' ? '🟢 Entries' : '🔴 Exits'}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={exportCSV}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  background: 'rgba(255, 255, 255, 0.06)',
                  color: 'var(--secondary-cyan-light)',
                  border: '1px solid rgba(6, 182, 212, 0.3)',
                  padding: '0.5rem 0.95rem',
                  borderRadius: '10px',
                  fontSize: '0.82rem',
                  fontWeight: 700
                }}
              >
                <Download size={14} /> Export CSV
              </button>
            </div>

            {filteredAttendance.length === 0 ? (
              <div style={{ padding: '3.5rem 1.5rem', textAlign: 'center' }}>
                <div style={{
                  width: '74px',
                  height: '74px',
                  borderRadius: '50%',
                  background: 'rgba(16, 185, 129, 0.08)',
                  border: '1.5px solid rgba(16, 185, 129, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1.25rem',
                  boxShadow: '0 0 30px rgba(16, 185, 129, 0.2)'
                }} className="radar-pulse-ring">
                  <Camera size={34} color="var(--primary-emerald)" />
                </div>

                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f8fafc', marginBottom: '0.4rem' }}>
                  Gate Biometric Scanner Active
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '440px', margin: '0 auto', lineHeight: 1.5 }}>
                  No gate punches recorded yet today. When workers scan their face at the kiosk camera or tap a test button above, live entries appear here.
                </p>
              </div>
            ) : (
              <div className="table-scroll-container">
                <table className="responsive-data-table">
                  <thead>
                    <tr>
                      <th>Worker</th>
                      <th>Movement</th>
                      <th>Timestamp</th>
                      <th>Status</th>
                      <th>Terminal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAttendance.map((rec, idx) => {
                      const isCheckIn = (rec.type === 'CHECK_IN' || rec.event_type === 'CHECK_IN' || rec.type === 'MORNING_IN');
                      const name = rec.employee_name || 'Worker';
                      const code = rec.emp_code || 'PF-001';
                      const timeStr = rec.punch_time || (rec.timestamp ? new Date(rec.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now');

                      return (
                        <tr key={rec.id || idx}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <div style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '10px',
                                background: isCheckIn ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                                color: isCheckIn ? 'var(--primary-emerald-light)' : 'var(--accent-amber-light)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 800,
                                fontSize: '0.85rem'
                              }}>
                                {name.substring(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <div style={{ fontWeight: 700, color: '#fff' }}>{name}</div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                                  {code}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.4rem',
                              padding: '0.25rem 0.65rem',
                              borderRadius: '7px',
                              fontSize: '0.74rem',
                              fontWeight: 800,
                              background: isCheckIn ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                              color: isCheckIn ? 'var(--primary-emerald-light)' : 'var(--danger-red-light)',
                              border: `1px solid ${isCheckIn ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                            }}>
                              {isCheckIn ? '🟢 ENTRY (IN)' : '🔴 EXIT (OUT)'}
                            </span>
                          </td>

                          <td>
                            <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#e2e8f0', fontSize: '0.88rem' }}>
                              {timeStr}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                              {rec.punch_date || 'Today'}
                            </div>
                          </td>

                          <td>
                            <span style={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              padding: '0.2rem 0.5rem',
                              borderRadius: '5px',
                              background: rec.status === 'LATE' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                              color: rec.status === 'LATE' ? 'var(--danger-red-light)' : 'var(--text-secondary)'
                            }}>
                              {rec.status === 'LATE' ? '⚠️ Late Arrival' : '✓ Standard Shift'}
                            </span>
                          </td>

                          <td style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                            Gate Kiosk #1
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/*              TAB 2: ENROLLED STAFF ROSTER                 */}
      {/* ========================================================= */}
      {activeTab === 'employees' && (
        <div>
          {/* Search bar & Add Employee action bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            marginBottom: '1.25rem',
            flexWrap: 'wrap'
          }}>
            <div style={{
              flex: 1,
              minWidth: '280px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              background: 'rgba(15, 23, 42, 0.75)',
              borderRadius: '12px',
              padding: '0.65rem 1rem',
              border: '1px solid var(--border-color)',
              boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
            }}>
              <Search size={17} color="var(--text-muted)" />
              <input
                type="text"
                placeholder="Search staff by worker name, ID code, or shed..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ background: 'transparent', border: 'none', color: '#fff', outline: 'none', width: '100%', fontSize: '0.85rem' }}
              />
              {searchQuery && (
                <X size={15} color="var(--text-muted)" style={{ cursor: 'pointer' }} onClick={() => setSearchQuery('')} />
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                padding: '0.6rem 0.95rem',
                borderRadius: '12px',
                fontSize: '0.78rem',
                color: 'var(--primary-emerald-light)',
                fontWeight: 600
              }}>
                <Smartphone size={15} />
                <span>Mobile Biometrics Synced</span>
              </div>

              <button
                onClick={() => setShowAddModal(true)}
                className="header-btn header-btn-primary"
                style={{ padding: '0.6rem 1rem', borderRadius: '12px' }}
              >
                <Plus size={16} />
                <span>Enroll Worker</span>
              </button>
            </div>
          </div>

          {filteredEmployees.length === 0 ? (
            <div className="data-card" style={{ padding: '3.5rem 1.5rem', textAlign: 'center' }}>
              <Users size={44} style={{ opacity: 0.3, margin: '0 auto 0.75rem' }} />
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff', marginBottom: '0.4rem' }}>
                No Enrolled Employees Found
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '420px', margin: '0 auto 1.25rem' }}>
                Click "+ Enroll Worker" above to register new farm workers with their daily wage rate.
              </p>
              <button
                onClick={() => setShowAddModal(true)}
                className="header-btn header-btn-primary"
                style={{ margin: '0 auto' }}
              >
                <UserPlus size={15} /> Enroll Worker
              </button>
            </div>
          ) : (
            <div className="employee-roster-grid">
              {filteredEmployees.map(emp => {
                const empName = emp.full_name || emp.name || 'Worker';
                const code = emp.emp_code || emp.employee_code || 'PF-001';
                const initials = empName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                const state = getEmployeeCurrentState(emp);
                const salary = getEmployeeSalaryDetails(emp, payYear, payMonth);

                return (
                  <div key={emp.id} className="employee-card-item">
                    {/* TOP ROW: AVATAR & INFO */}
                    <div className="employee-card-top-row">
                      <div className="employee-card-info-wrap">
                        <div className="employee-avatar-circle">
                          {initials}
                          <span 
                            className="employee-status-indicator-dot" 
                            style={{ background: state.isInside ? 'var(--primary-emerald)' : state.hasPunchedToday ? 'var(--accent-amber)' : 'var(--text-muted)' }} 
                          />
                        </div>

                        <div>
                          <div className="employee-name-label">{empName}</div>
                          <div className="employee-tags-row">
                            <span style={{
                              fontSize: '0.72rem',
                              fontFamily: 'var(--font-mono)',
                              padding: '0.12rem 0.45rem',
                              borderRadius: '5px',
                              background: 'rgba(255, 255, 255, 0.08)',
                              color: 'var(--secondary-cyan-light)',
                              fontWeight: 700
                            }}>
                              {code}
                            </span>
                            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                              • {emp.shed_name || 'Broiler Shed #1'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {onDeleteEmployee && (
                        <button
                          onClick={() => {
                            if (window.confirm(`Delete ${empName} from employee roster?`)) {
                              onDeleteEmployee(emp.id);
                            }
                          }}
                          className="employee-delete-btn"
                          title="Delete worker"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>

                    {/* STATUS BANNER */}
                    <div 
                      className="employee-status-bar"
                      style={{
                        background: state.isInside 
                          ? 'rgba(16, 185, 129, 0.12)' 
                          : state.hasPunchedToday 
                            ? 'rgba(245, 158, 11, 0.12)' 
                            : 'rgba(255, 255, 255, 0.04)',
                        border: `1px solid ${
                          state.isInside 
                            ? 'rgba(16, 185, 129, 0.25)' 
                            : state.hasPunchedToday 
                              ? 'rgba(245, 158, 11, 0.25)' 
                              : 'rgba(255, 255, 255, 0.06)'
                        }`
                      }}
                    >
                      {state.isInside ? (
                        <>
                          <span style={{ color: 'var(--primary-emerald-light)' }}>🟢 INSIDE FARM</span>
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>Since {state.lastPunch?.punch_time}</span>
                        </>
                      ) : state.hasPunchedToday ? (
                        <>
                          <span style={{ color: 'var(--accent-amber-light)' }}>🟡 OUTSIDE GATE</span>
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>Exited {state.lastPunch?.punch_time}</span>
                        </>
                      ) : (
                        <>
                          <span style={{ color: 'var(--text-muted)' }}>⚪ AWAITING ARRIVAL</span>
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>No scan today</span>
                        </>
                      )}
                    </div>

                    {/* SALARY QUICK BADGE */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: 'rgba(255, 255, 255, 0.03)',
                      padding: '0.55rem 0.85rem',
                      borderRadius: '10px',
                      border: '1px solid rgba(255, 255, 255, 0.06)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        <Banknote size={15} color="var(--primary-emerald-light)" />
                        <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontWeight: 600 }}>Daily Pay:</span>
                        <button
                          onClick={() => {
                            setEditingWageEmp({ id: emp.id, name: empName, code, currentWage: salary.dailyWage });
                            setWageInputValue(String(salary.dailyWage));
                          }}
                          className="payroll-wage-chip"
                          title="Click to edit daily pay rate"
                        >
                          <span>₹{salary.dailyWage}/day</span>
                          <Edit3 size={11} />
                        </button>
                      </div>

                      <div style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--primary-emerald-light)', fontFamily: 'var(--font-mono)' }}>
                        {salary.daysPresent}d worked = ₹{salary.earnedSalary}
                      </div>
                    </div>

                    {/* ACTION BUTTONS */}
                    <div className="employee-actions-row">
                      <button
                        onClick={() => {
                          setSelectedEmployee(emp);
                          setEmployeeTimeRange('day');
                        }}
                        className="employee-calendar-btn"
                      >
                        <Calendar size={14} />
                        <span>History & Calendar</span>
                      </button>

                      <button
                        onClick={() => handleSimulatePunch(emp)}
                        className="employee-sim-btn"
                        title="Simulate biometric gate punch"
                      >
                        <Zap size={13} />
                        <span>{state.isInside ? 'Exit' : 'Enter'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/*        TAB 3: SALARY PAY & ATTENDANCE LEDGER (NEW)        */}
      {/* ========================================================= */}
      {activeTab === 'salary' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* MONTH SELECTOR & ACTION BAR */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap',
            background: 'linear-gradient(135deg, rgba(14, 23, 44, 0.8) 0%, rgba(9, 15, 29, 0.9) 100%)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '1rem 1.4rem',
            borderRadius: '18px',
            boxShadow: '0 10px 30px -10px rgba(0, 0, 0, 0.5)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <button
                  onClick={() => setSalaryMonthDate(new Date(payYear, payMonth - 1, 1))}
                  className="header-btn header-btn-secondary"
                  style={{ padding: '0.45rem 0.75rem', borderRadius: '8px' }}
                >
                  <ChevronLeft size={16} />
                </button>

                <div style={{ textAlign: 'center', minWidth: '150px' }}>
                  <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#fff' }}>
                    {MONTH_NAMES[payMonth]} {payYear}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                    Farm Payroll Period
                  </div>
                </div>

                <button
                  onClick={() => setSalaryMonthDate(new Date(payYear, payMonth + 1, 1))}
                  className="header-btn header-btn-secondary"
                  style={{ padding: '0.45rem 0.75rem', borderRadius: '8px' }}
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              {/* Quick Jump to Current Month */}
              <button
                onClick={() => setSalaryMonthDate(new Date())}
                style={{
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  color: 'var(--primary-emerald-light)',
                  padding: '0.35rem 0.65rem',
                  borderRadius: '7px',
                  fontSize: '0.74rem',
                  fontWeight: 700
                }}
              >
                Current Month
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button
                onClick={exportPayrollCSV}
                className="header-btn header-btn-primary"
              >
                <Download size={15} />
                <span>Export Payroll CSV</span>
              </button>
            </div>
          </div>

          {/* 4 KPI SUMMARY CARDS */}
          <div className="payroll-kpi-grid">
            <div className="payroll-stat-card">
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 700 }}>Total Month Payroll</span>
              <div style={{ fontSize: '2.1rem', fontWeight: 900, color: 'var(--primary-emerald-light)', margin: '0.25rem 0', fontFamily: 'var(--font-mono)' }}>
                ₹{totalFarmMonthlyPayroll.toLocaleString()}
              </div>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                Calculated from {totalFarmDaysWorked} worker-days present
              </span>
            </div>

            <div className="payroll-stat-card">
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 700 }}>Total Days Worked</span>
              <div style={{ fontSize: '2.1rem', fontWeight: 900, color: 'var(--secondary-cyan-light)', margin: '0.25rem 0', fontFamily: 'var(--font-mono)' }}>
                {totalFarmDaysWorked} Days
              </div>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                Total days staff scanned at biometric gate
              </span>
            </div>

            <div className="payroll-stat-card">
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 700 }}>Average Daily Wage</span>
              <div style={{ fontSize: '2.1rem', fontWeight: 900, color: 'var(--accent-amber-light)', margin: '0.25rem 0', fontFamily: 'var(--font-mono)' }}>
                ₹{avgDailyWage} / Day
              </div>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                Standard farm pay rate per present day
              </span>
            </div>

            <div className="payroll-stat-card">
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 700 }}>Disbursement Status</span>
              <div style={{ fontSize: '2.1rem', fontWeight: 900, color: '#ffffff', margin: '0.25rem 0', fontFamily: 'var(--font-mono)' }}>
                {totalPaidWorkers} / {totalEmployees} Paid
              </div>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                Workers marked as disbursed for {MONTH_NAMES[payMonth]}
              </span>
            </div>
          </div>

          {/* SALARY & ATTENDANCE LEDGER TABLE */}
          <div className="data-card">
            <div className="data-card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <h3 className="data-card-title">
                  <Banknote size={18} color="var(--primary-emerald-light)" />
                  <span>Farm Staff Salary Ledger ({MONTH_NAMES[payMonth]} {payYear})</span>
                </h3>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Salary = Days Present × Daily Wage Rate
              </span>
            </div>

            {filteredEmployees.length === 0 ? (
              <div style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
                <Users size={36} style={{ opacity: 0.3, margin: '0 auto 0.5rem' }} />
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>No employees registered to calculate salary.</p>
              </div>
            ) : (
              <div className="table-scroll-container">
                <table className="responsive-data-table">
                  <thead>
                    <tr>
                      <th>Worker</th>
                      <th>Daily Wage Rate</th>
                      <th>Days Present</th>
                      <th>Days Absent</th>
                      <th>Earned Salary</th>
                      <th>Payment Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEmployees.map(emp => {
                      const name = emp.full_name || emp.name || 'Worker';
                      const code = emp.emp_code || emp.employee_code || 'PF-001';
                      const salary = getEmployeeSalaryDetails(emp, payYear, payMonth);

                      return (
                        <tr key={emp.id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <div style={{
                                width: '38px',
                                height: '38px',
                                borderRadius: '11px',
                                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(6, 182, 212, 0.2) 100%)',
                                color: '#fff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 800,
                                fontSize: '0.85rem'
                              }}>
                                {name.substring(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <div style={{ fontWeight: 800, color: '#fff' }}>{name}</div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                                  {code} • {emp.shed_name || 'Broiler Shed #1'}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td>
                            <button
                              onClick={() => {
                                setEditingWageEmp({ id: emp.id, name, code, currentWage: salary.dailyWage });
                                setWageInputValue(String(salary.dailyWage));
                              }}
                              className="payroll-wage-chip"
                              title="Click to edit worker daily wage"
                            >
                              <span>₹{salary.dailyWage} / day</span>
                              <Edit3 size={12} />
                            </button>
                          </td>

                          <td>
                            <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--primary-emerald-light)', fontSize: '0.95rem' }}>
                              {salary.daysPresent} Days
                            </div>
                            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                              Out of {salary.elapsedDays} elapsed
                            </div>
                          </td>

                          <td>
                            <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: salary.daysAbsent > 0 ? 'var(--accent-amber-light)' : 'var(--text-muted)', fontSize: '0.88rem' }}>
                              {salary.daysAbsent} Days
                            </div>
                            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                              Off duty
                            </div>
                          </td>

                          <td>
                            <div className="salary-earned-pill">
                              <span>₹{salary.earnedSalary.toLocaleString()}</span>
                            </div>
                            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                              {salary.daysPresent}d × ₹{salary.dailyWage}
                            </div>
                          </td>

                          <td>
                            <button
                              onClick={() => togglePaymentStatus(salary.empKey)}
                              className="payroll-status-btn"
                              style={{
                                background: salary.isPaid ? 'rgba(16, 185, 129, 0.18)' : 'rgba(245, 158, 11, 0.15)',
                                color: salary.isPaid ? 'var(--primary-emerald-light)' : 'var(--accent-amber-light)',
                                border: `1px solid ${salary.isPaid ? 'rgba(16, 185, 129, 0.4)' : 'rgba(245, 158, 11, 0.3)'}`
                              }}
                              title="Click to toggle Paid/Pending"
                            >
                              <span>{salary.isPaid ? '✓ Paid' : '⏳ Pending'}</span>
                            </button>
                          </td>

                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                              <button
                                onClick={() => exportWorkerPaySlip(emp)}
                                className="header-btn header-btn-secondary"
                                style={{ padding: '0.35rem 0.65rem', fontSize: '0.74rem' }}
                                title="Download printable salary receipt slip"
                              >
                                <Receipt size={13} />
                                <span>Slip</span>
                              </button>

                              <button
                                onClick={() => {
                                  setSelectedEmployee(emp);
                                  setEmployeeTimeRange('calendar');
                                  setCalendarMonthDate(new Date(payYear, payMonth, 1));
                                }}
                                className="header-btn header-btn-secondary"
                                style={{ padding: '0.35rem 0.65rem', fontSize: '0.74rem' }}
                                title="View attendance calendar days"
                              >
                                <Calendar size={13} />
                                <span>Days</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/*              TAB 4: REPORTS & SHIFT ANALYTICS             */}
      {/* ========================================================= */}
      {activeTab === 'reports' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Summary KPI Highlights */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1rem'
          }}>
            <div className="glass-panel" style={{ padding: '1.35rem', borderRadius: '18px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Farm Attendance Rate</span>
              <div style={{ fontSize: '2.1rem', fontWeight: 900, color: 'var(--primary-emerald-light)', margin: '0.3rem 0', fontFamily: 'var(--font-mono)' }}>
                {totalEmployees > 0 ? Math.round(((insideCount + outsidePunchedCount) / totalEmployees) * 100) : 0}%
              </div>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                {insideCount + outsidePunchedCount} of {totalEmployees} active workers present today
              </span>
            </div>

            <div className="glass-panel" style={{ padding: '1.35rem', borderRadius: '18px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Shift On-Time Adherence</span>
              <div style={{ fontSize: '2.1rem', fontWeight: 900, color: 'var(--secondary-cyan-light)', margin: '0.3rem 0', fontFamily: 'var(--font-mono)' }}>
                {attendance.length > 0 
                  ? Math.round((attendance.filter(r => r.status !== 'LATE').length / attendance.length) * 100) 
                  : 100}%
              </div>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                Threshold: Check-in before 06:15 AM
              </span>
            </div>

            <div className="glass-panel" style={{ padding: '1.35rem', borderRadius: '18px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Total Movements Recorded</span>
              <div style={{ fontSize: '2.1rem', fontWeight: 900, color: '#ffffff', margin: '0.3rem 0', fontFamily: 'var(--font-mono)' }}>
                {attendance.length}
              </div>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                Consolidated entries and exits today
              </span>
            </div>
          </div>

          {/* Export Action Card */}
          <div className="data-card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff', marginBottom: '0.4rem' }}>
              Export Gate Attendance Reports (CSV)
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              Download official biometric logs for farm payroll calculation, labor audits, and shift scheduling.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
              <div style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border-color)',
                borderRadius: '14px',
                padding: '1.25rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.45rem' }}>
                  <Download size={18} color="var(--primary-emerald-light)" />
                  <span style={{ fontWeight: 800, color: '#fff' }}>Today's Gate Log</span>
                </div>
                <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                  Real-time entries, exits, timestamps, and on-time status recorded today.
                </p>
                <button
                  onClick={exportCSV}
                  className="header-btn header-btn-primary"
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  Download Today's CSV
                </button>
              </div>

              <div style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border-color)',
                borderRadius: '14px',
                padding: '1.25rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.45rem' }}>
                  <Calendar size={18} color="var(--secondary-cyan-light)" />
                  <span style={{ fontWeight: 800, color: '#fff' }}>Full History Archive</span>
                </div>
                <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                  Comprehensive archive of all historical punches stored in local cache and cloud.
                </p>
                <button
                  onClick={() => {
                    const src = (allAttendance && allAttendance.length > 0) ? allAttendance : attendance;
                    if (src.length === 0) return alert('No historical records found');
                    const headers = ['Date,Time,Employee ID,Name,Punch Type,Status\n'];
                    const rows = src.map(a => 
                      `"${a.punch_date || ''}","${a.punch_time || ''}","${a.emp_code || ''}","${a.employee_name || ''}","${a.type || a.event_type || ''}","${a.status || ''}"`
                    );
                    const blob = new Blob([headers.concat(rows.join('\n'))], { type: 'text/csv' });
                    const url = window.URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `poultry_attendance_history_all.csv`;
                    link.click();
                  }}
                  className="header-btn header-btn-secondary"
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  Download All-Time CSV
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/*        MODAL: EDIT DAILY WAGE RATE (ADMIN SALARY SET)     */}
      {/* ========================================================= */}
      {editingWageEmp && (
        <div className="modal-overlay-bg">
          <div className="modal-dialog-box" style={{ maxWidth: '440px' }}>
            <div className="modal-dialog-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: 'var(--primary-emerald-light)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Banknote size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff' }}>Configure Salary Pay</h3>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Set daily wage for {editingWageEmp.name} ({editingWageEmp.code})
                  </div>
                </div>
              </div>

              <button
                onClick={() => setEditingWageEmp(null)}
                style={{ background: 'transparent', color: 'var(--text-muted)', padding: '0.4rem' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveWage} className="modal-dialog-body">
              <div className="form-input-group">
                <label className="form-label">Daily Wage Pay Rate (₹ / Day) *</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', fontWeight: 800, color: 'var(--primary-emerald-light)', fontSize: '1.1rem' }}>
                    ₹
                  </span>
                  <input
                    type="number"
                    required
                    min="0"
                    step="10"
                    placeholder="e.g. 500"
                    value={wageInputValue}
                    onChange={e => setWageInputValue(e.target.value)}
                    className="form-input-control"
                    style={{ paddingLeft: '2.2rem', fontFamily: 'var(--font-mono)', fontSize: '1.1rem', fontWeight: 800 }}
                  />
                </div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                  * Monthly salary will be calculated as: <strong>Days Present × ₹{wageInputValue || 0}</strong>
                </span>
              </div>

              {/* Quick Preset Buttons */}
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
                {['450', '500', '550', '600', '700', '800'].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setWageInputValue(val)}
                    style={{
                      background: wageInputValue === val ? 'var(--primary-emerald)' : 'rgba(255, 255, 255, 0.05)',
                      color: wageInputValue === val ? '#000' : 'var(--text-secondary)',
                      padding: '0.3rem 0.65rem',
                      borderRadius: '7px',
                      fontSize: '0.76rem',
                      fontWeight: 700
                    }}
                  >
                    ₹{val}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setEditingWageEmp(null)}
                  className="header-btn header-btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingWage}
                  className="header-btn header-btn-primary"
                >
                  {isSavingWage ? 'Saving...' : 'Save Salary Pay'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/*        MODAL: ENROLL NEW WORKER (DIRECT WEB ENTRY)        */}
      {/* ========================================================= */}
      {showAddModal && (
        <div className="modal-overlay-bg">
          <div className="modal-dialog-box" style={{ maxWidth: '520px' }}>
            <div className="modal-dialog-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: 'var(--primary-emerald-light)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <UserPlus size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff' }}>Enroll New Worker</h3>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Add employee to farm registry with daily salary pay rate
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowAddModal(false)}
                style={{ background: 'transparent', color: 'var(--text-muted)', padding: '0.4rem' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateEmployee} className="modal-dialog-body">
              <div className="form-input-group">
                <label className="form-label">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={newEmpName}
                  onChange={e => setNewEmpName(e.target.value)}
                  className="form-input-control"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.85rem' }}>
                <div className="form-input-group">
                  <label className="form-label">Employee ID Code</label>
                  <input
                    type="text"
                    placeholder="e.g. PF-103"
                    value={newEmpCode}
                    onChange={e => setNewEmpCode(e.target.value)}
                    className="form-input-control"
                  />
                </div>

                <div className="form-input-group">
                  <label className="form-label">Daily Salary Pay (₹ / Day) *</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 500"
                    value={newEmpWage}
                    onChange={e => setNewEmpWage(e.target.value)}
                    className="form-input-control"
                    style={{ fontFamily: 'var(--font-mono)' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.85rem' }}>
                <div className="form-input-group">
                  <label className="form-label">Assigned Shed</label>
                  <select
                    value={newEmpShed}
                    onChange={e => setNewEmpShed(e.target.value)}
                    className="form-input-control"
                    style={{ background: '#0e172e' }}
                  >
                    <option value="Broiler Shed #1">Broiler Shed #1</option>
                    <option value="Broiler Shed #2">Broiler Shed #2</option>
                    <option value="Layer Shed #1">Layer Shed #1</option>
                    <option value="Hatchery Section">Hatchery Section</option>
                    <option value="Feed Mill">Feed Mill</option>
                  </select>
                </div>

                <div className="form-input-group">
                  <label className="form-label">Role</label>
                  <select
                    value={newEmpRole}
                    onChange={e => setNewEmpRole(e.target.value)}
                    className="form-input-control"
                    style={{ background: '#0e172e' }}
                  >
                    <option value="Farm Technician">Farm Technician</option>
                    <option value="Caretaker">Caretaker</option>
                    <option value="Supervisor">Supervisor</option>
                    <option value="Veterinary Assistant">Veterinary Assistant</option>
                  </select>
                </div>
              </div>

              <div className="form-input-group">
                <label className="form-label">Phone Number (Optional)</label>
                <input
                  type="tel"
                  placeholder="e.g. 9876543210"
                  value={newEmpPhone}
                  onChange={e => setNewEmpPhone(e.target.value)}
                  className="form-input-control"
                />
              </div>

              <div style={{
                marginTop: '1.25rem',
                display: 'flex',
                gap: '0.75rem',
                justifyContent: 'flex-end'
              }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="header-btn header-btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEmp}
                  className="header-btn header-btn-primary"
                >
                  {isSavingEmp ? 'Saving...' : 'Save & Enroll Worker'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/*        MODAL: EMPLOYEE ATTENDANCE CALENDAR & STATS         */}
      {/* ========================================================= */}
      {selectedEmployee && (
        <div className="modal-overlay-bg">
          <div className="modal-dialog-box">
            {/* MODAL HEADER */}
            <div className="modal-dialog-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '13px',
                  background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.25) 0%, rgba(6, 182, 212, 0.25) 100%)',
                  border: '1.5px solid rgba(16, 185, 129, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 900,
                  fontSize: '1.2rem',
                  color: '#fff'
                }}>
                  {(selectedEmployee.full_name || selectedEmployee.name || 'W').substring(0, 2).toUpperCase()}
                </div>

                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#fff', letterSpacing: '-0.01em' }}>
                    {selectedEmployee.full_name || selectedEmployee.name}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem' }}>
                    <span style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.74rem',
                      background: 'rgba(255, 255, 255, 0.08)',
                      padding: '0.1rem 0.45rem',
                      borderRadius: '4px',
                      color: 'var(--secondary-cyan-light)',
                      fontWeight: 700
                    }}>
                      {selectedEmployee.emp_code || selectedEmployee.employee_code}
                    </span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      • {selectedEmployee.shed_name || 'Broiler Shed #1'}
                    </span>
                    <span style={{
                      fontSize: '0.74rem',
                      color: 'var(--primary-emerald-light)',
                      fontWeight: 700,
                      fontFamily: 'var(--font-mono)'
                    }}>
                      • ₹{selectedEmployee.daily_wage || 500}/day
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedEmployee(null)}
                style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '10px',
                  padding: '0.5rem',
                  color: 'var(--text-muted)',
                  cursor: 'pointer'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* MODAL BODY */}
            <div className="modal-dialog-body">
              {/* TIME RANGE SELECTOR PILLS */}
              <div className="modal-range-bar">
                {[
                  { id: 'day', label: "Today's Punches", icon: Clock },
                  { id: 'weekly', label: '7-Day Activity', icon: Activity },
                  { id: '15days', label: '15-Day Roll', icon: Layers },
                  { id: 'monthly', label: '30 Days', icon: Calendar },
                  { id: 'calendar', label: 'Visual Calendar', icon: Calendar }
                ].map(tab => {
                  const Icon = tab.icon;
                  const isActive = employeeTimeRange === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setEmployeeTimeRange(tab.id);
                        setSelectedCalendarDay(null);
                      }}
                      className="modal-range-btn"
                      style={{
                        background: isActive ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.25) 0%, rgba(6, 182, 212, 0.2) 100%)' : 'transparent',
                        color: isActive ? 'var(--primary-emerald-light)' : 'var(--text-secondary)',
                        border: isActive ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid transparent'
                      }}
                    >
                      <Icon size={14} />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* STATS OVERVIEW FOR SELECTED PERIOD */}
              <div className="cal-stats-summary-grid">
                <div className="cal-stat-chip" style={{ background: 'rgba(16, 185, 129, 0.08)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Attendance Rate</div>
                  <div style={{ fontSize: '1.45rem', fontWeight: 900, color: 'var(--primary-emerald-light)', fontFamily: 'var(--font-mono)' }}>
                    {empAttendanceRate}%
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                    {empUniqueDays} active days
                  </div>
                </div>

                <div className="cal-stat-chip" style={{ background: 'rgba(6, 182, 212, 0.08)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Gate Punches</div>
                  <div style={{ fontSize: '1.45rem', fontWeight: 900, color: 'var(--secondary-cyan-light)', fontFamily: 'var(--font-mono)' }}>
                    {empTotalPunches}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                    Entries & exits
                  </div>
                </div>

                {/* EARNED SALARY STAT CHIP */}
                <div className="cal-stat-chip" style={{ background: 'rgba(245, 158, 11, 0.08)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Earned Salary</div>
                  <div style={{ fontSize: '1.45rem', fontWeight: 900, color: 'var(--accent-amber-light)', fontFamily: 'var(--font-mono)' }}>
                    ₹{(empUniqueDays * (Number(selectedEmployee.daily_wage) || 500)).toLocaleString()}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                    {empUniqueDays}d × ₹{selectedEmployee.daily_wage || 500}
                  </div>
                </div>

                <div className="cal-stat-chip" style={{ background: 'rgba(139, 92, 246, 0.08)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Cooldown Rule</div>
                  <div style={{ fontSize: '1.45rem', fontWeight: 900, color: 'var(--accent-purple-light)', fontFamily: 'var(--font-mono)' }}>
                    10m
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                    Auto 600s debounce
                  </div>
                </div>
              </div>

              {/* VIEW A: VISUAL CALENDAR VIEW */}
              {employeeTimeRange === 'calendar' ? (
                <div>
                  {/* CALENDAR NAVIGATION */}
                  <div className="cal-nav-bar">
                    <button
                      onClick={() => setCalendarMonthDate(new Date(calYear, calMonth - 1, 1))}
                      style={{
                        background: 'rgba(255, 255, 255, 0.06)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: '#fff',
                        padding: '0.4rem 0.75rem',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        fontSize: '0.8rem',
                        fontWeight: 700
                      }}
                    >
                      <ChevronLeft size={15} /> Prev Month
                    </button>

                    <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#fff' }}>
                      {MONTH_NAMES[calMonth]} {calYear}
                    </div>

                    <button
                      onClick={() => setCalendarMonthDate(new Date(calYear, calMonth + 1, 1))}
                      style={{
                        background: 'rgba(255, 255, 255, 0.06)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: '#fff',
                        padding: '0.4rem 0.75rem',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        fontSize: '0.8rem',
                        fontWeight: 700
                      }}
                    >
                      Next Month <ChevronRight size={15} />
                    </button>
                  </div>

                  {/* CALENDAR GRID */}
                  <div className="cal-card-wrapper">
                    <div className="cal-weekdays-row">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                        <div key={d}>{d}</div>
                      ))}
                    </div>

                    <div className="cal-days-grid">
                      {/* Blank placeholders before month starts */}
                      {Array.from({ length: firstDayOfCalMonth }).map((_, i) => (
                        <div key={`blank-${i}`} style={{ height: '72px' }} />
                      ))}

                      {/* Actual days of month */}
                      {Array.from({ length: daysInCalMonth }).map((_, i) => {
                        const dayNum = i + 1;
                        const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                        const dayPunches = getEmployeePunchesForDate(dateStr);
                        const hasPunches = dayPunches.length > 0;
                        const isSelected = selectedCalendarDay === dateStr;

                        const now = new Date();
                        const isToday = now.getFullYear() === calYear && now.getMonth() === calMonth && now.getDate() === dayNum;

                        return (
                          <div
                            key={dayNum}
                            onClick={() => setSelectedCalendarDay(isSelected ? null : dateStr)}
                            className="cal-day-cell"
                            style={{
                              background: isSelected 
                                ? 'rgba(16, 185, 129, 0.25)' 
                                : hasPunches 
                                  ? 'rgba(16, 185, 129, 0.1)' 
                                  : 'rgba(255, 255, 255, 0.02)',
                              border: isSelected
                                ? '1.5px solid var(--primary-emerald)'
                                : isToday
                                  ? '1.5px solid var(--secondary-cyan)'
                                  : hasPunches
                                    ? '1px solid rgba(16, 185, 129, 0.3)'
                                    : '1px solid rgba(255, 255, 255, 0.05)'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{
                                fontSize: '0.82rem',
                                fontWeight: isToday ? 900 : 700,
                                color: isToday ? 'var(--secondary-cyan-light)' : '#fff'
                              }}>
                                {dayNum}
                              </span>
                              {isToday && (
                                <span style={{ fontSize: '0.62rem', background: 'var(--secondary-cyan)', color: '#000', padding: '0.05rem 0.3rem', borderRadius: '4px', fontWeight: 900 }}>
                                  TODAY
                                </span>
                              )}
                            </div>

                            {hasPunches ? (
                              <div style={{
                                fontSize: '0.66rem',
                                fontWeight: 800,
                                color: 'var(--primary-emerald-light)',
                                background: 'rgba(16, 185, 129, 0.2)',
                                padding: '0.15rem 0.35rem',
                                borderRadius: '4px',
                                textAlign: 'center'
                              }}>
                                {dayPunches.length} punch{dayPunches.length > 1 ? 'es' : ''}
                              </div>
                            ) : (
                              <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                                Off
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* SELECTED CALENDAR DAY DETAIL BREAKDOWN */}
                  {selectedCalendarDay && (
                    <div style={{
                      background: 'rgba(16, 185, 129, 0.06)',
                      border: '1px solid rgba(16, 185, 129, 0.25)',
                      borderRadius: '14px',
                      padding: '1.1rem',
                      marginTop: '1rem'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                        <span style={{ fontWeight: 800, color: '#fff', fontSize: '0.92rem' }}>
                          📅 Punches on {selectedCalendarDay}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--primary-emerald-light)', fontWeight: 700 }}>
                          {getEmployeePunchesForDate(selectedCalendarDay).length} movements
                        </span>
                      </div>

                      {getEmployeePunchesForDate(selectedCalendarDay).length === 0 ? (
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No punches recorded on this day.</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {getEmployeePunchesForDate(selectedCalendarDay).map((p, idx) => {
                            const isCheckIn = (p.type === 'CHECK_IN' || p.event_type === 'CHECK_IN' || p.type === 'MORNING_IN');
                            return (
                              <div key={idx} style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                background: 'rgba(255, 255, 255, 0.03)',
                                padding: '0.6rem 0.85rem',
                                borderRadius: '8px',
                                border: '1px solid rgba(255, 255, 255, 0.05)'
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                                  <span style={{
                                    fontSize: '0.72rem',
                                    fontWeight: 800,
                                    padding: '0.15rem 0.45rem',
                                    borderRadius: '5px',
                                    background: isCheckIn ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                    color: isCheckIn ? 'var(--primary-emerald-light)' : 'var(--danger-red-light)'
                                  }}>
                                    {isCheckIn ? '🟢 GATE ENTRY' : '🔴 GATE EXIT'}
                                  </span>
                                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#fff', fontSize: '0.85rem' }}>
                                    {p.punch_time}
                                  </span>
                                </div>
                                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                  {p.status === 'LATE' ? '⚠️ Late' : '✓ Normal'}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                /* VIEW B: LIST / TIMELINE VIEW */
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#fff' }}>
                      Attendance Punch Logs ({empHistory.length} movements)
                    </span>
                    <button
                      onClick={exportEmployeeCSV}
                      style={{
                        background: 'rgba(255, 255, 255, 0.06)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: 'var(--secondary-cyan-light)',
                        padding: '0.35rem 0.75rem',
                        borderRadius: '8px',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem'
                      }}
                    >
                      <Download size={13} /> Export Worker CSV
                    </button>
                  </div>

                  {empHistory.length === 0 ? (
                    <div style={{ padding: '2.5rem', textAlign: 'center', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '14px' }}>
                      <Clock size={32} style={{ opacity: 0.3, margin: '0 auto 0.5rem' }} />
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        No attendance records for this worker in the selected period.
                      </p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                      {empHistory.map((rec, idx) => {
                        const isCheckIn = (rec.type === 'CHECK_IN' || rec.event_type === 'CHECK_IN' || rec.type === 'MORNING_IN');
                        return (
                          <div key={idx} style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: 'rgba(255, 255, 255, 0.03)',
                            padding: '0.8rem 1.1rem',
                            borderRadius: '12px',
                            border: '1px solid rgba(255, 255, 255, 0.06)'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                              <span style={{
                                fontSize: '0.74rem',
                                fontWeight: 800,
                                padding: '0.2rem 0.55rem',
                                borderRadius: '6px',
                                background: isCheckIn ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                color: isCheckIn ? 'var(--primary-emerald-light)' : 'var(--danger-red-light)'
                              }}>
                                {isCheckIn ? '🟢 GATE IN' : '🔴 GATE OUT'}
                              </span>

                              <div>
                                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: '#fff', fontSize: '0.9rem' }}>
                                  {rec.punch_time || 'Recorded'}
                                </span>
                                <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginLeft: '0.65rem' }}>
                                  {rec.punch_date || 'Today'}
                                </span>
                              </div>
                            </div>

                            <span style={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              padding: '0.15rem 0.45rem',
                              borderRadius: '5px',
                              background: rec.status === 'LATE' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                              color: rec.status === 'LATE' ? 'var(--danger-red-light)' : 'var(--text-muted)'
                            }}>
                              {rec.status === 'LATE' ? '⚠️ Late' : '✓ Normal'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
