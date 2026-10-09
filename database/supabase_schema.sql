-- ==============================================================================
-- POULTRY FARM DEDICATED FACE ATTENDANCE TERMINAL - SUPABASE SCHEMA
-- Minimal, Single-Purpose Schema strictly matching Section 17
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. EMPLOYEES (Minimal core employee registry)
CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_code VARCHAR(50) UNIQUE NOT NULL, -- e.g. 'PF-101'
    name VARCHAR(150) NOT NULL,
    face_template_reference JSONB, -- Stores 192-dim multi-sample embedding vectors
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. ATTENDANCE (Daily consolidated record per employee)
CREATE TABLE IF NOT EXISTS attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL DEFAULT CURRENT_DATE,
    check_in TIMESTAMP WITH TIME ZONE,
    check_out TIMESTAMP WITH TIME ZONE,
    status VARCHAR(30) DEFAULT 'PRESENT' CHECK (status IN ('PRESENT', 'LATE', 'HALF_DAY')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT uq_emp_attendance_date UNIQUE (employee_id, attendance_date)
);

-- 3. ATTENDANCE EVENTS (Raw immutable punch audit log)
CREATE TABLE IF NOT EXISTS attendance_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    event_type VARCHAR(20) NOT NULL CHECK (event_type IN ('CHECK_IN', 'CHECK_OUT')),
    event_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    recognition_score NUMERIC(5, 4) NOT NULL,
    liveness_result VARCHAR(30) NOT NULL DEFAULT 'PASSED',
    device_id VARCHAR(50) DEFAULT 'Redmi-Go-Gate-1',
    sync_status VARCHAR(20) DEFAULT 'SYNCED' CHECK (sync_status IN ('PENDING', 'SYNCED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for high-speed terminal lookups
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(attendance_date DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_emp ON attendance(employee_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_events_emp_time ON attendance_events(employee_id, event_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_employees_active ON employees(status);

-- Enable Row Level Security (RLS)
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_events ENABLE ROW LEVEL SECURITY;

-- Kiosk Terminal RLS Policies
CREATE POLICY "Terminal read employees" ON employees FOR SELECT USING (status = 'ACTIVE');
CREATE POLICY "Terminal manage attendance" ON attendance FOR ALL USING (true);
CREATE POLICY "Terminal insert events" ON attendance_events FOR ALL USING (true);

-- Enable Realtime for attendance table
ALTER PUBLICATION supabase_realtime ADD TABLE attendance;
ALTER PUBLICATION supabase_realtime ADD TABLE attendance_events;

-- Initial Seed Employees
INSERT INTO employees (id, employee_code, name, status) VALUES
('11111111-1111-1111-1111-111111111111', 'PF-101', 'Ravi Kumar', 'ACTIVE'),
('22222222-2222-2222-2222-222222222222', 'PF-102', 'Suresh Kumar', 'ACTIVE'),
('33333333-3333-3333-3333-333333333333', 'PF-103', 'Lakshmi Narayana', 'ACTIVE'),
('44444444-4444-4444-4444-444444444444', 'PF-104', 'Anitha Devi', 'ACTIVE'),
('55555555-5555-5555-5555-555555555555', 'PF-105', 'Venkat Ramana', 'ACTIVE')
ON CONFLICT (employee_code) DO NOTHING;
