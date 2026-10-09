import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

const DB_PATH = path.resolve(__dirname, 'data/poultry_db.json')

function readDb() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })
      fs.writeFileSync(DB_PATH, JSON.stringify({ employees: [], attendance: [] }, null, 2))
    }
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'))
  } catch (e) {
    return { employees: [], attendance: [] }
  }
}

function writeDb(data) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2))
  } catch (e) {
    console.error('Failed to write db', e)
  }
}

function syncApiPlugin() {
  return {
    name: 'sync-api-plugin',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        // Enable CORS for mobile app & local browser access
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, apikey, Prefer')

        if (req.method === 'OPTIONS') {
          res.statusCode = 204
          res.end()
          return
        }

        const url = new URL(req.url, `http://${req.headers.host}`)

        // 1. EMPLOYEES: GET (Web dashboard and Android app sync)
        if ((url.pathname === '/api/employees' || url.pathname === '/rest/v1/employees') && req.method === 'GET') {
          const db = readDb()
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(db.employees || []))
          return
        }

        // 2. EMPLOYEES: POST (Register worker from Desk or Phone)
        if ((url.pathname === '/api/employees' || url.pathname === '/rest/v1/employees') && req.method === 'POST') {
          let body = ''
          req.on('data', chunk => { body += chunk })
          req.on('end', () => {
            try {
              const data = JSON.parse(body || '{}')
              const db = readDb()
              const emp = Array.isArray(data) ? data[0] : data
              if (emp && (emp.id || emp.full_name || emp.name)) {
                const id = String(emp.id || 'emp-' + Date.now())
                const code = emp.employee_code || emp.emp_code || `PF-${Math.floor(100 + Math.random() * 900)}`
                const name = emp.name || emp.full_name || 'Worker'
                const formatted = {
                  id: id,
                  employee_code: code,
                  emp_code: code,
                  name: name,
                  full_name: name,
                  role: emp.role || 'Farm Staff',
                  department: emp.department || 'Farm Operations',
                  status: emp.status || 'ACTIVE',
                  is_active: emp.status !== 'INACTIVE',
                  face_template: emp.face_template || emp.face_template_reference || [],
                  face_template_reference: emp.face_template_reference || emp.face_template || [],
                  created_at: emp.created_at || new Date().toISOString()
                }

                db.employees = (db.employees || []).filter(e => e.id !== id && e.employee_code !== code)
                db.employees.unshift(formatted)
                writeDb(db)

                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify(formatted))
                return
              }
            } catch (err) {
              console.error(err)
            }
            res.statusCode = 400
            res.end(JSON.stringify({ error: 'Invalid employee payload' }))
          })
          return
        }

        // 3. EMPLOYEES: DELETE (Desk Admin delete worker)
        if (url.pathname.startsWith('/api/employees/') && req.method === 'DELETE') {
          const id = url.pathname.replace('/api/employees/', '').trim()
          const db = readDb()
          db.employees = (db.employees || []).filter(e => e.id !== id && e.employee_code !== id)
          db.deleted_ids = db.deleted_ids || []
          if (!db.deleted_ids.includes(id)) {
            db.deleted_ids.push(id)
          }
          writeDb(db)
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ success: true, deletedId: id }))
          return
        }

        // 3b. DELETED EMPLOYEES: GET (Phone sync to remove only explicitly deleted workers)
        if ((url.pathname === '/api/deleted-employees' || url.pathname === '/rest/v1/deleted_employees') && req.method === 'GET') {
          const db = readDb()
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(db.deleted_ids || []))
          return
        }

function enrichAttendanceRecord(raw, employees = []) {
  if (!raw) return null
  const empId = raw.employee_id || raw.emp_id || ''
  const emp = employees.find(e => e.id === empId || e.employee_code === empId || e.emp_code === empId) || {}

  const ts = raw.event_timestamp || (raw.timestamp ? new Date(raw.timestamp).getTime() : Date.now())
  const d = new Date(ts)
  
  // Format YYYY-MM-DD
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const punchDate = raw.punch_date || raw.attendance_date || `${y}-${m}-${day}`

  // Format 12-hour hh:mm:ss a
  const hours = d.getHours()
  const mins = String(d.getMinutes()).padStart(2, '0')
  const secs = String(d.getSeconds()).padStart(2, '0')
  const ampm = hours >= 12 ? 'PM' : 'AM'
  const h12 = hours % 12 || 12
  const punchTime = raw.punch_time || `${String(h12).padStart(2, '0')}:${mins}:${secs} ${ampm}`

  const punchType = raw.type || raw.event_type || 'CHECK_IN'

  return {
    id: raw.id || `att-${ts}-${Math.random().toString(36).substr(2, 6)}`,
    employee_id: empId || emp.id || 'unknown',
    employee_name: raw.employee_name || emp.name || emp.full_name || 'Worker',
    emp_code: raw.emp_code || emp.employee_code || emp.emp_code || '1',
    type: punchType,
    event_type: punchType,
    punch_date: punchDate,
    attendance_date: punchDate,
    punch_time: punchTime,
    timestamp: raw.timestamp || d.toISOString(),
    event_timestamp: ts,
    status: raw.status || (hours > 6 || (hours === 6 && d.getMinutes() > 15) ? 'LATE' : 'ON_TIME'),
    sync_status: 'SYNCED',
    recognition_score: raw.recognition_score || raw.confidence_score || 0.9,
    confidence_score: raw.confidence_score || raw.recognition_score || 0.9,
    liveness_result: raw.liveness_result || 'PASSED',
    device_id: raw.device_id || 'Redmi-Go-Gate-1'
  }
}

        // 4. ATTENDANCE: GET
        if ((url.pathname === '/api/attendance' || url.pathname === '/rest/v1/attendance') && req.method === 'GET') {
          const db = readDb()
          const employees = db.employees || []
          const enrichedList = (db.attendance || []).map(a => enrichAttendanceRecord(a, employees)).filter(Boolean)

          const date = url.searchParams.get('date') || url.searchParams.get('punch_date')
          const filtered = (date && date !== 'ALL')
            ? enrichedList.filter(a => a.punch_date === date || a.attendance_date === date)
            : enrichedList

          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(filtered))
          return
        }

        // 5. ATTENDANCE: POST (Record punch from app or web)
        if ((url.pathname === '/api/attendance' || url.pathname === '/rest/v1/attendance_events' || url.pathname === '/rest/v1/attendance') && req.method === 'POST') {
          let body = ''
          req.on('data', chunk => { body += chunk })
          req.on('end', () => {
            try {
              const data = JSON.parse(body || '{}')
              const db = readDb()
              const rawRecord = Array.isArray(data) ? data[0] : data
              if (rawRecord) {
                const formatted = enrichAttendanceRecord(rawRecord, db.employees || [])
                db.attendance = db.attendance || []
                db.attendance = db.attendance.filter(a => a.id !== formatted.id)
                db.attendance.unshift(formatted)
                writeDb(db)
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ success: true, record: formatted }))
                return
              }
            } catch (err) {
              console.error(err)
            }
            res.statusCode = 400
            res.end(JSON.stringify({ error: 'Invalid punch payload' }))
          })
          return
        }

        // 6. CLEAN DATA: POST
        if (url.pathname === '/api/clean-data' && req.method === 'POST') {
          const db = readDb()
          const nextSeq = (db.clean_seq || 0) + 1
          writeDb({ employees: [], attendance: [], deleted_ids: [], clean_seq: nextSeq })
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ success: true, clean_seq: nextSeq, message: 'All demo data cleaned' }))
          return
        }

        // 7. SYNC META: GET
        if ((url.pathname === '/api/sync-meta' || url.pathname === '/rest/v1/sync_meta') && req.method === 'GET') {
          const db = readDb()
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ clean_seq: db.clean_seq || 0 }))
          return
        }

        next()
      })
    }
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), syncApiPlugin()],
  server: {
    port: 3000,
    host: true // accessible on LAN for Android phone
  }
})
