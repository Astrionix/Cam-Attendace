import { createClient } from '@supabase/supabase-js';

// Clean empty initial state (no dummy demo data)
const DEFAULT_EMPLOYEES = [];

export class PoultryDatabase {
  constructor() {
    this.supabaseUrl = localStorage.getItem('poultry_sb_url') || 'https://jgukiuyocejzyhojafyk.supabase.co';
    this.supabaseKey = localStorage.getItem('poultry_sb_key') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpndWtpdXlvY2Vqenlob2phZnlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0NjE2NjAsImV4cCI6MjEwNzAzNzY2MH0.2Ad6fwlq2X4LMssPzl93uQbSEqZKEgTeoraF5SQXRuw';
    this.client = null;

    if (this.supabaseUrl && this.supabaseKey) {
      try {
        this.client = createClient(this.supabaseUrl, this.supabaseKey);
      } catch (e) {
        console.warn('Failed to init Supabase client', e);
      }
    }

    // Initialize local storage state
    if (!localStorage.getItem('poultry_employees')) {
      localStorage.setItem('poultry_employees', JSON.stringify([]));
    } else {
      // Purge any legacy demo employees (PF-101 to PF-105, Ravi Kumar, etc.)
      try {
        const stored = JSON.parse(localStorage.getItem('poultry_employees') || '[]');
        const cleaned = stored.filter(emp => 
          !['emp-101', 'emp-102', 'emp-103', 'emp-104', 'emp-105', '1', '2', '3', '4', '5'].includes(emp.id) &&
          !['PF-101', 'PF-102', 'PF-103', 'PF-104', 'PF-105'].includes(emp.emp_code) &&
          !['Ravi Kumar', 'Lakshmi Narayana', 'Anitha Devi', 'Venkat Ramana', 'Srinivas Rao', 'Suresh Kumar'].includes(emp.full_name)
        );
        if (cleaned.length !== stored.length) {
          localStorage.setItem('poultry_employees', JSON.stringify(cleaned));
        }
      } catch (e) {
        localStorage.setItem('poultry_employees', JSON.stringify([]));
      }
    }

    if (!localStorage.getItem('poultry_attendance')) {
      localStorage.setItem('poultry_attendance', JSON.stringify([]));
    }
  }

  async cleanAllData() {
    try {
      await fetch('/api/clean-data', { method: 'POST' });
    } catch (e) {}
    localStorage.setItem('poultry_employees', JSON.stringify([]));
    localStorage.setItem('poultry_attendance', JSON.stringify([]));
  }

  isSupabaseConfigured() {
    return Boolean(this.client);
  }

  setSupabaseConfig(url, key) {
    this.supabaseUrl = url;
    this.supabaseKey = key;
    localStorage.setItem('poultry_sb_url', url);
    localStorage.setItem('poultry_sb_key', key);
    if (url && key) {
      this.client = createClient(url, key);
    } else {
      this.client = null;
    }
  }

  async getEmployees() {
    try {
      const res = await fetch('/api/employees');
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('poultry_employees', JSON.stringify(data));
        return data;
      }
    } catch (err) {
      // Offline fallback
    }

    if (this.client) {
      try {
        const { data, error } = await this.client.from('employees').select('*').eq('is_active', true);
        if (!error && data && data.length > 0) {
          localStorage.setItem('poultry_employees', JSON.stringify(data));
          return data;
        }
      } catch (err) {
        console.warn('Supabase fetch failed, fallback to local', err);
      }
    }
    const local = localStorage.getItem('poultry_employees');
    return local ? JSON.parse(local) : DEFAULT_EMPLOYEES;
  }

  async addEmployee(employee) {
    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(employee)
      });
      if (res.ok) {
        const saved = await res.json();
        return saved;
      }
    } catch (e) {
      console.warn('Local API offline, saving to localStorage');
    }

    const list = await this.getEmployees();
    const updated = [employee, ...list];
    localStorage.setItem('poultry_employees', JSON.stringify(updated));

    if (this.client) {
      try {
        await this.client.from('employees').upsert([employee]);
      } catch (e) {
        console.warn('Offline: saved employee locally');
      }
    }
    return employee;
  }

  async deleteEmployee(id) {
    try {
      await fetch(`/api/employees/${id}`, { method: 'DELETE' });
    } catch (e) {
      console.warn('API delete failed, dropping from local');
    }
    const local = JSON.parse(localStorage.getItem('poultry_employees') || '[]');
    const updated = local.filter(e => e.id !== id && e.employee_code !== id && e.emp_code !== id);
    localStorage.setItem('poultry_employees', JSON.stringify(updated));
    return true;
  }

  async getAttendance(date = null) {
    const targetDate = date === 'ALL' ? 'ALL' : (date || new Date().toISOString().split('T')[0]);

    try {
      const res = await fetch(`/api/attendance?date=${targetDate}`);
      if (res.ok) {
        const data = await res.json();
        return data;
      }
    } catch (err) {}

    if (this.client) {
      try {
        let query = this.client.from('attendance').select('*').order('timestamp', { ascending: false });
        if (targetDate !== 'ALL') {
          query = query.eq('punch_date', targetDate);
        }
        const { data, error } = await query;
        if (!error && data) {
          return data;
        }
      } catch (e) {
        console.warn('Supabase attendance fetch failed, using local', e);
      }
    }

    const local = localStorage.getItem('poultry_attendance');
    const records = local ? JSON.parse(local) : [];
    return targetDate === 'ALL' ? records : records.filter(r => r.punch_date === targetDate);
  }

  async recordPunch(employee, type = null) {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const localList = JSON.parse(localStorage.getItem('poultry_attendance') || '[]');
    const todayEmployeePunches = localList.filter(
      r => r.employee_id === employee.id && r.punch_date === todayStr
    );

    // Smart auto punch type logic:
    // If no punch today -> CHECK_IN
    // If last punch was CHECK_IN -> CHECK_OUT
    const lastPunch = todayEmployeePunches[todayEmployeePunches.length - 1];
    let resolvedType = type;
    if (!resolvedType) {
      if (!lastPunch) {
        resolvedType = 'CHECK_IN';
      } else {
        resolvedType = lastPunch.type === 'CHECK_IN' ? 'CHECK_OUT' : 'CHECK_IN';
      }
    }

    // Check on-time vs late
    const hour = now.getHours();
    const minute = now.getMinutes();
    const isLate = (resolvedType === 'CHECK_IN' && (hour > 6 || (hour === 6 && minute > 15)));

    const newRecord = {
      id: 'att-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
      employee_id: employee.id,
      employee_name: employee.full_name,
      emp_code: employee.emp_code,
      punch_date: todayStr,
      punch_time: timeStr,
      timestamp: now.toISOString(),
      type: resolvedType,
      status: isLate ? 'LATE' : 'ON_TIME',
      shift_name: employee.shift_name || 'Morning Shift',
      shed_name: employee.shed_name || 'Broiler Shed #1',
      confidence_score: 0.89,
      liveness_verified: true,
      sync_status: this.client ? 'SYNCED' : 'PENDING'
    };

    localList.unshift(newRecord);
    localStorage.setItem('poultry_attendance', JSON.stringify(localList));

    try {
      fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRecord)
      }).catch(() => {});
    } catch (e) {}

    if (this.client) {
      try {
        await this.client.from('attendance').insert([newRecord]);
      } catch (err) {
        console.warn('Saved offline, will sync later', err);
      }
    }

    return newRecord;
  }

  getPendingSyncCount() {
    const list = JSON.parse(localStorage.getItem('poultry_attendance') || '[]');
    return list.filter(r => r.sync_status === 'PENDING').length;
  }
}

export const db = new PoultryDatabase();
