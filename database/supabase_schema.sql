-- ==============================================================================
-- POULTRY FARM DEDICATED FACE ATTENDANCE TERMINAL - SUPABASE SCHEMA
-- Synchronizes Android Kiosk Phone & Vercel Web Dashboard seamlessly
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. EMPLOYEES (Biometric face registry & employee details)
CREATE TABLE IF NOT EXISTS public.employees (
    id TEXT PRIMARY KEY,
    employee_code TEXT UNIQUE NOT NULL,
    emp_code TEXT,
    name TEXT NOT NULL,
    full_name TEXT,
    role TEXT DEFAULT 'Farm Staff',
    department TEXT DEFAULT 'Farm Operations',
    shed_name TEXT DEFAULT 'Broiler Shed #1',
    shift_name TEXT DEFAULT 'Morning Shift',
    face_template JSONB DEFAULT '[]'::jsonb,
    face_template_reference JSONB DEFAULT '[]'::jsonb,
    status VARCHAR(20) DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ATTENDANCE (Consolidated punches for Vercel Web Dashboard)
CREATE TABLE IF NOT EXISTS public.attendance (
    id TEXT PRIMARY KEY,
    employee_id TEXT NOT NULL,
    employee_name TEXT,
    emp_code TEXT,
    type TEXT DEFAULT 'CHECK_IN',
    punch_date TEXT NOT NULL,
    punch_time TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'ON_TIME',
    shift_name TEXT DEFAULT 'Morning Shift',
    shed_name TEXT DEFAULT 'Broiler Shed #1',
    confidence_score NUMERIC(5, 4) DEFAULT 0.9000,
    liveness_verified BOOLEAN DEFAULT TRUE,
    sync_status TEXT DEFAULT 'SYNCED',
    device_id TEXT DEFAULT 'Redmi-Go-Gate-1',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. ATTENDANCE EVENTS (Raw punches sent directly by Android Kiosk phone)
CREATE TABLE IF NOT EXISTS public.attendance_events (
    id TEXT PRIMARY KEY,
    employee_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    event_timestamp BIGINT NOT NULL,
    recognition_score NUMERIC(5, 4) NOT NULL,
    liveness_result TEXT DEFAULT 'PASSED',
    device_id TEXT DEFAULT 'Redmi-Go-Gate-1',
    sync_status TEXT DEFAULT 'SYNCED',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for lightning fast queries
CREATE INDEX IF NOT EXISTS idx_employees_status ON public.employees(status);
CREATE INDEX IF NOT EXISTS idx_employees_code ON public.employees(employee_code);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON public.attendance(punch_date DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_emp_date ON public.attendance(employee_id, punch_date);
CREATE INDEX IF NOT EXISTS idx_events_emp_time ON public.attendance_events(employee_id, event_timestamp DESC);

-- Trigger: Automatically bridge Android attendance_events into the web attendance table
CREATE OR REPLACE FUNCTION public.handle_attendance_event_sync()
RETURNS TRIGGER AS $$
DECLARE
    emp_rec RECORD;
    v_date TEXT;
    v_time TEXT;
    v_ts TIMESTAMPTZ;
    v_status TEXT;
    v_hour INT;
    v_min INT;
BEGIN
    -- 1. Find employee name and code
    SELECT * INTO emp_rec FROM public.employees 
    WHERE id = NEW.employee_id OR employee_code = NEW.employee_id OR emp_code = NEW.employee_id 
    LIMIT 1;

    -- 2. Convert epoch millisecond to timestamp (IST / Asia/Kolkata)
    IF NEW.event_timestamp > 1000000000000 THEN
        v_ts := to_timestamp(NEW.event_timestamp / 1000.0);
    ELSE
        v_ts := NOW();
    END IF;

    v_date := to_char(v_ts AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD');
    v_time := to_char(v_ts AT TIME ZONE 'Asia/Kolkata', 'HH12:MI:SS AM');
    v_hour := EXTRACT(HOUR FROM (v_ts AT TIME ZONE 'Asia/Kolkata'))::INT;
    v_min  := EXTRACT(MINUTE FROM (v_ts AT TIME ZONE 'Asia/Kolkata'))::INT;

    -- On-time rule: after 6:15 AM check-in is considered LATE
    IF NEW.event_type = 'CHECK_IN' AND (v_hour > 6 OR (v_hour = 6 AND v_min > 15)) THEN
        v_status := 'LATE';
    ELSE
        v_status := 'ON_TIME';
    END IF;

    -- 3. Upsert into public.attendance
    INSERT INTO public.attendance (
        id,
        employee_id,
        employee_name,
        emp_code,
        type,
        punch_date,
        punch_time,
        timestamp,
        status,
        shift_name,
        shed_name,
        confidence_score,
        liveness_verified,
        sync_status,
        device_id,
        created_at
    ) VALUES (
        NEW.id,
        NEW.employee_id,
        COALESCE(emp_rec.full_name, emp_rec.name, 'Worker'),
        COALESCE(emp_rec.emp_code, emp_rec.employee_code, 'PF-001'),
        NEW.event_type,
        v_date,
        v_time,
        v_ts,
        v_status,
        COALESCE(emp_rec.shift_name, 'Morning Shift'),
        COALESCE(emp_rec.shed_name, 'Broiler Shed #1'),
        NEW.recognition_score,
        (NEW.liveness_result = 'PASSED'),
        'SYNCED',
        NEW.device_id,
        v_ts
    )
    ON CONFLICT (id) DO UPDATE SET
        type = EXCLUDED.type,
        punch_date = EXCLUDED.punch_date,
        punch_time = EXCLUDED.punch_time,
        timestamp = EXCLUDED.timestamp,
        status = EXCLUDED.status,
        sync_status = 'SYNCED';

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_attendance_events_to_attendance ON public.attendance_events;
CREATE TRIGGER trg_attendance_events_to_attendance
AFTER INSERT OR UPDATE ON public.attendance_events
FOR EACH ROW EXECUTE FUNCTION public.handle_attendance_event_sync();

-- Disable RLS or allow full anonymous access for Kiosk & Web App
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anon public access employees" ON public.employees;
CREATE POLICY "Anon public access employees" ON public.employees FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anon public access attendance" ON public.attendance;
CREATE POLICY "Anon public access attendance" ON public.attendance FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anon public access attendance_events" ON public.attendance_events;
CREATE POLICY "Anon public access attendance_events" ON public.attendance_events FOR ALL USING (true) WITH CHECK (true);

-- Grant permissions to public anon & authenticated roles
GRANT ALL ON TABLE public.employees TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.attendance TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.attendance_events TO anon, authenticated, service_role;

-- Realtime replication publications
ALTER PUBLICATION supabase_realtime ADD TABLE public.employees;
ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance;
ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_events;
