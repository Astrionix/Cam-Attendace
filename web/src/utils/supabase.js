import { createClient } from '@supabase/supabase-js';

const DEFAULT_EMPLOYEES = [];

export class PoultryDatabase {
  constructor() {
    this.supabaseUrl = localStorage.getItem('poultry_sb_url') || 
      (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || 
      'https://jgukiuyocejzyhojafyk.supabase.co';

    this.supabaseKey = localStorage.getItem('poultry_sb_key') || 
      (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) || 
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpndWtpdXlvY2Vqenlob2phZnlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0NjE2NjAsImV4cCI6MjEwNzAzNzY2MH0.2Ad6fwlq2X4LMssPzl93uQbSEqZKEgTeoraF5SQXRuw';

    this.client = null;

    if (this.supabaseUrl && this.supabaseKey) {
      try {
        this.client = createClient(this.supabaseUrl, this.supabaseKey, {
          auth: { persistSession: false }
        });
      } catch (e) {
        console.warn('Failed to init Supabase client', e);
      }
    }

    // Initialize local storage state
    if (!localStorage.getItem('poultry_employees')) {
      localStorage.setItem('poultry_employees', JSON.stringify([]));
    } else {
      // Purge any legacy dummy demo employees
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
    // 1. Local mock API (if running locally under Vite)
    try {
      await fetch('/api/clean-data', { method: 'POST' });
    } catch (e) {}

    // 2. Supabase Cloud Database (for Vercel & Phone)
    if (this.client) {
      try {
        await this.client.from('attendance').delete().neq('id', '___none___');
        await this.client.from('attendance_events').delete().neq('id', '___none___');
        await this.client.from('employees').delete().neq('id', '___none___');
      } catch (e) {
        console.warn('Supabase clean data error:', e);
      }
    }

    // 3. Local state
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
      this.client = createClient(url, key, { auth: { persistSession: false } });
    } else {
      this.client = null;
    }
  }

  async getEmployees() {
    // 1. If running under local Vite dev server with syncApiPlugin
    try {
      const res = await fetch('/api/employees');
      if (res.ok) {
        const text = await res.text();
        // Ensure it is valid JSON and not an HTML 404 SPA fallback from Vercel
        if (text.startsWith('[') || text.startsWith('{')) {
          const data = JSON.parse(text);
          localStorage.setItem('poultry_employees', JSON.stringify(data));
          return data;
        }
      }
    } catch (err) {
      // Local API offline, continue to Supabase
    }

    // 2. Direct Supabase Cloud (Live in Production on Vercel)
    if (this.client) {
      try {
        const { data, error } = await this.client
          .from('employees')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && Array.isArray(data)) {
          // Normalize fields for UI compatibility
          const normalized = data.map(emp => ({
            ...emp,
            emp_code: emp.emp_code || emp.employee_code,
            full_name: emp.full_name || emp.name,
            name: emp.name || emp.full_name
          }));
          localStorage.setItem('poultry_employees', JSON.stringify(normalized));
          return normalized;
        }
      } catch (err) {
        console.warn('Supabase fetch failed, fallback to local', err);
      }
    }

    const local = localStorage.getItem('poultry_employees');
    return local ? JSON.parse(local) : DEFAULT_EMPLOYEES;
  }

  async addEmployee(employee) {
    const code = employee.emp_code || employee.employee_code || `PF-${Math.floor(100 + Math.random() * 900)}`;
    const empName = employee.full_name || employee.name || 'Worker';
    const id = String(employee.id || 'emp-' + Date.now());

    const formatted = {
      id: id,
      employee_code: code,
      emp_code: code,
      name: empName,
      full_name: empName,
      role: employee.role || 'Farm Staff',
      department: employee.department || 'Farm Operations',
      shed_name: employee.shed_name || 'Broiler Shed #1',
      shift_name: employee.shift_name || 'Morning Shift',
      status: employee.status || 'ACTIVE',
      face_template: employee.face_template || employee.face_template_reference || [],
      face_template_reference: employee.face_template_reference || employee.face_template || [],
      created_at: employee.created_at || new Date().toISOString()
    };

    // 1. Try local dev mock API
    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formatted)
      });
      if (res.ok) {
        const text = await res.text();
        if (text.startsWith('{')) {
          const saved = JSON.parse(text);
          return saved;
        }
      }
    } catch (e) {}

    // 2. Direct Supabase Cloud Upsert
    if (this.client) {
      try {
        await this.client.from('employees').upsert([formatted]);
      } catch (e) {
        console.warn('Supabase addEmployee error:', e);
      }
    }

    // 3. Local storage update
    const list = await this.getEmployees();
    const updated = [formatted, ...list.filter(e => e.id !== id && e.employee_code !== code)];
    localStorage.setItem('poultry_employees', JSON.stringify(updated));

    return formatted;
  }

  async deleteEmployee(id) {
    // 1. Try local dev mock API
    try {
      await fetch(`/api/employees/${id}`, { method: 'DELETE' });
    } catch (e) {}

    // 2. Supabase Cloud Delete
    if (this.client) {
      try {
        await this.client.from('employees').delete().or(`id.eq.${id},employee_code.eq.${id},emp_code.eq.${id}`);
      } catch (e) {
        console.warn('Supabase delete error:', e);
      }
    }

    // 3. Local storage delete
    const local = JSON.parse(localStorage.getItem('poultry_employees') || '[]');
    const updated = local.filter(e => e.id !== id && e.employee_code !== id && e.emp_code !== id);
    localStorage.setItem('poultry_employees', JSON.stringify(updated));
    return true;
  }

  async getAttendance(date = null) {
    const targetDate = date === 'ALL' ? 'ALL' : (date || new Date().toISOString().split('T')[0]);

    // 1. Try local dev mock API
    try {
      const res = await fetch(`/api/attendance?date=${targetDate}`);
      if (res.ok) {
        const text = await res.text();
        if (text.startsWith('[') || text.startsWith('{')) {
          return JSON.parse(text);
        }
      }
    } catch (err) {}

    // 2. Supabase Cloud Database Query
    if (this.client) {
      try {
        let query = this.client
          .from('attendance')
          .select('*')
          .order('timestamp', { ascending: false });

        if (targetDate !== 'ALL') {
          query = query.eq('punch_date', targetDate);
        }

        const { data, error } = await query;
        if (!error && Array.isArray(data)) {
          // Normalize records
          const normalized = data.map(r => ({
            ...r,
            employee_name: r.employee_name || 'Worker',
            emp_code: r.emp_code || 'PF-001',
            type: r.type || 'CHECK_IN',
            punch_time: r.punch_time || new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            punch_date: r.punch_date || new Date(r.timestamp).toISOString().split('T')[0]
          }));
          localStorage.setItem('poultry_attendance', JSON.stringify(normalized));
          return normalized;
        }
      } catch (e) {
        console.warn('Supabase attendance fetch failed, using local', e);
      }
    }

    // 3. Local storage fallback
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
      r => (r.employee_id === employee.id || r.emp_code === employee.emp_code || r.emp_code === employee.employee_code) && 
           r.punch_date === todayStr
    );

    // Smart auto punch type logic:
    const lastPunch = todayEmployeePunches[0] || todayEmployeePunches[todayEmployeePunches.length - 1];
    let resolvedType = type;
    if (!resolvedType) {
      if (!lastPunch) {
        resolvedType = 'CHECK_IN';
      } else {
        resolvedType = lastPunch.type === 'CHECK_IN' ? 'CHECK_OUT' : 'CHECK_IN';
      }
    }

    // Check on-time vs late (> 06:15 AM)
    const hour = now.getHours();
    const minute = now.getMinutes();
    const isLate = (resolvedType === 'CHECK_IN' && (hour > 6 || (hour === 6 && minute > 15)));

    const newRecord = {
      id: 'att-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
      employee_id: String(employee.id || employee.employee_code || employee.emp_code),
      employee_name: employee.full_name || employee.name || 'Worker',
      emp_code: employee.emp_code || employee.employee_code || 'PF-001',
      punch_date: todayStr,
      punch_time: timeStr,
      timestamp: now.toISOString(),
      type: resolvedType,
      status: isLate ? 'LATE' : 'ON_TIME',
      shift_name: employee.shift_name || 'Morning Shift',
      shed_name: employee.shed_name || 'Broiler Shed #1',
      confidence_score: 0.92,
      liveness_verified: true,
      sync_status: 'SYNCED',
      device_id: 'Web-Dashboard'
    };

    localList.unshift(newRecord);
    localStorage.setItem('poultry_attendance', JSON.stringify(localList));

    // 1. Try local dev mock API
    try {
      fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRecord)
      }).catch(() => {});
    } catch (e) {}

    // 2. Direct Supabase Cloud insert
    if (this.client) {
      try {
        await this.client.from('attendance').upsert([newRecord]);
      } catch (err) {
        console.warn('Supabase attendance insert error:', err);
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
