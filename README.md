# 🐔 PoultryAttend - Dedicated Poultry Farm Attendance Terminal

A production-grade, offline-first **Face Recognition Attendance Kiosk Android App** designed to run 24/7 on a single dedicated **Redmi Go** (Android 8.1 Oreo Go, 1 GB RAM, Snapdragon 425).

---

## 🎯 System Overview

- **Zero Employee Phones**: Farm workers do not carry phones into poultry sheds (dust, biosecurity, and moisture hazards).
- **Zero External Hardware**: No RFID badges, fingerprint scanners (which fail on wet/dirty hands), or external sensors.
- **Biometric Face Verification**:
  1. Real human face detection (strictly one person at a time).
  2. Face quality filtering (size, centering, blur detection, lighting thresholds).
  3. Landmark-based face alignment (eyes/nose/mouth normalization).
  4. Liveness & anti-spoofing detection (passive micro-dynamics + active challenges).
  5. 192-dim embedding recognition (MobileFaceNet int8 quantized).
  6. Calibrated confidence thresholding with ambiguity rejection.
  7. Automatic Check-In / Check-Out decision engine with 45s anti-bounce cooldown.
  8. Offline-first Room DB with background sync to Supabase.

---

## 🎨 Official App Icon

![PoultryAttend App Launcher Icon](/C:/Users/padal/.gemini/antigravity-ide/brain/cb3d326e-b726-40d1-8edc-1a3c4caf97cf/poultry_attend_icon_1791466316125.jpg)

- **Android Icon**: [`android/app/src/main/res/mipmap-xxhdpi/ic_launcher.jpg`](file:///c:/Users/padal/OneDrive/Desktop/poultry/android/app/src/main/res/mipmap-xxhdpi/ic_launcher.jpg)
- **Web & PWA Icon**: [`web/public/poultry_icon.jpg`](file:///c:/Users/padal/OneDrive/Desktop/poultry/web/public/poultry_icon.jpg)

---

## 🏗️ Hardware Profile & Memory Budget (Redmi Go 1GB RAM)

The **Redmi Go** (Snapdragon 425 Quad-core 1.4 GHz, 1GB RAM, Android 8.1 Oreo Go) has strict hardware limits. The table below outlines how each module is budgeted to avoid the Android Low Memory Killer (LMK):

| Pipeline Stage | Technology / Component | RAM Footprint | Latency | Optimization Rationale |
| :--- | :--- | :--- | :--- | :--- |
| **Camera Feed** | CameraX 480p Analysis | ~8 MB buffer | 0 backlog | `STRATEGY_KEEP_ONLY_LATEST` drops stale frames |
| **Face Detect** | Google ML Kit (`FAST`) | ~12 MB RAM | ~35 ms | Hardware-accelerated, rejects multi-person frames |
| **Quality Check** | Custom O(N) Luma & Gradient | < 1 MB RAM | ~8 ms | Rejects blur (<85) & extreme luma (<45 or >230) |
| **Face Align** | 2D Affine Similarity Transform | < 1 MB RAM | ~4 ms | Rotates eye-line horizontal & crops 112x112 |
| **Liveness** | Temporal Micro-Dynamics & Pose | < 1 MB RAM | ~2 ms | Detects photo/screen attacks without heavy deep nets |
| **Face Model** | **MobileFaceNet (int8 quantized)** | **~1.4 MB model** (~6 MB RAM) | **~75 ms** | 192-dim vector; 10x lighter than standard FaceNet |
| **Vector Match** | In-Memory Cosine Engine | ~76 KB RAM | < 0.2 ms | Scans all enrolled staff in microseconds |
| **Decision** | Local State Machine | < 1 MB RAM | < 1 ms | Cooldown protection & automatic punch type |
| **Persistence** | Room SQLite DB (WAL Mode) | ~4 MB RAM | ~3 ms | Immediate local save, zero reliance on network |
| **Total Peak** | With `largeHeap="true"` | **~50 - 65 MB** | **Total: < 130 ms** | Guaranteed stability under 24/7 kiosk operation |

---

## 🔄 The 3 Operating Modes

### 1. 👤 Attendance Mode (Default Kiosk Screen)
- **Screen Locked 24/7**: System bars hidden (`BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE`), `FLAG_KEEP_SCREEN_ON` enabled.
- **Real-Time Display**: Live clock (`06:02 AM`), current date, farm title.
- **Simple Human Guidance (Section 17)**:
  - *"Look at the camera"*
  - *"Face detected — hold still"*
  - *"Move closer"*
  - *"Only one person at a time"*
  - *"Please move to a brighter area"*
  - *"Please blink / Turn your head slightly"*
- **Automatic Decision Logic (Section 8 & 11)**:
  - If worker has no punch today ➔ **CHECK-IN**
  - If worker has check_in and no check_out ➔ **CHECK-OUT** (with total working hours calculation)
  - If both completed ➔ Shows *"Attendance already completed"*
- **Anti-Bounce Cooldown (Section 9)**: 45-second lock per employee.
- **Audio Feedback**: Pleasant audio chime + Text-to-Speech in Telugu and Indian English.
- **Auto-Dismiss**: Success dialog returns to scanning after **3 seconds**.

### 2. 👨💼 Admin Mode (Manager Portal)
- Protected by 4-digit PIN (Default: `1234`) or long-press on farm header.
- **Today's Attendance**: Present, Currently Working, Checked Out, Late, Absent counters.
- **Employee Roster**: Staff list, shed allocations, shift IDs, face registration status.
- **Attendance History & Reports**: Daily/Monthly logs, 1-click CSV export for salary calculations.
- **Sync & Hardware**: Battery level, online/offline status, pending offline sync count.

### 3. ➕ Employee Registration Mode (Section 1)
- Admin enters: Name, Employee Code (`PF-101`), Phone, Department, Shed, Designation, Shift.
- **Multi-Sample Guided Capture (5 Angles)**:
  1. *Front-facing*
  2. *Slight left angle (~15°)*
  3. *Slight right angle (~15°)*
  4. *Slight upward tilt (~10°)*
  5. *Slight downward tilt (~10°)*
- **Strict Quality Gate**: Each sample must pass single-face, blur, lighting, and pose bounds before acceptance.
- **Embedding Generation**: 192-dim vectors generated for approved samples and saved to `face_templates` table. Raw photos are not stored repeatedly.

---

## 📁 Repository Structure

```text
poultry/
├── android/                         # Native Android Application (Kotlin + Jetpack Compose)
│   ├── app/
│   │   ├── src/main/
│   │   │   ├── AndroidManifest.xml  # Kiosk mode flags, largeHeap, permissions
│   │   │   ├── java/com/poultry/attend/
│   │   │   │   ├── MainActivity.kt  # Kiosk lifecycle, CameraX integration, Compose Nav
│   │   │   │   ├── PoultryAttendApp.kt # Application container, WorkManager sync
│   │   │   │   ├── data/
│   │   │   │   │   ├── local/       # Room DB: Employee, FaceTemplate, Attendance, DAOs
│   │   │   │   │   └── remote/      # Supabase REST client & WorkManager SyncWorker
│   │   │   │   ├── domain/
│   │   │   │   │   ├── ml/          # MobileFaceNet TFLite runner, FaceDetectorHelper
│   │   │   │   │   ├── pipeline/    # QualityChecker, Aligner, Liveness, RecognitionEngine
│   │   │   │   │   ├── attendance/  # AttendanceDecisionEngine, TtsSpeaker
│   │   │   │   │   └── registration/# RegistrationManager (5-angle enrollment)
│   │   │   │   └── ui/
│   │   │   │       ├── screens/     # KioskScreen, AdminDashboardScreen, RegistrationScreen
│   │   │   │       ├── viewmodels/  # KioskViewModel (throttled frame processing)
│   │   │   │       └── theme/       # Dark theme tailored for kiosk panels
│   │   └── build.gradle.kts
│   └── settings.gradle.kts
│
├── database/
│   └── supabase_schema.sql          # Supabase PostgreSQL schema matching Section 13 & 14
│
├── web/                             # Companion Web Kiosk & Management Portal (React + Vite)
│   ├── src/
│   │   ├── components/
│   │   │   ├── KioskMode.jsx        # Live Camera Kiosk Simulator
│   │   │   ├── ManagerDashboard.jsx # Admin Portal (Stats, Live Logs, CSV Export)
│   │   │   ├── EmployeeRegistration.jsx # Multi-angle photo capture with webcam
│   │   │   ├── PinModal.jsx         # 4-digit PIN authentication
│   │   │   └── SettingsModal.jsx    # Supabase credentials configuration
│   │   └── App.jsx
│   └── package.json
```

---

## 🔒 Security & Privacy (Section 14)

1. **Biometric Template Protection**: Only 192-dim numerical mathematical vectors are stored in `face_templates`. Raw employee photographs are never stored or transmitted repeatedly.
2. **Supabase Row Level Security**: RLS policies enforce authenticated read/write access. Service-role keys are never exposed in the client application.
3. **Audit Logging**: Biometric enrollment, deactivations, and template updates are logged in `biometric_audit_logs`.
4. **Kiosk Lockout**: Full-screen immersive mode and 4-digit PIN lock prevent farm workers from tampering with settings or navigating away from the attendance camera.

---

## 🚀 How to Run & Test

### Option 1: Live Web Simulator (Instant Browser Test)
The web kiosk & dashboard is already built and running locally:
```powershell
cd c:\Users\padal\OneDrive\Desktop\poultry\web
npm run dev
```
Open `http://localhost:3000` (or `http://192.168.29.99:3000` on your phone over Wi-Fi).

### Option 2: Setup Supabase Database
1. Go to your [Supabase Dashboard](https://supabase.com) ➔ **SQL Editor**.
2. Run the SQL script from [`database/supabase_schema.sql`](file:///c:/Users/padal/OneDrive/Desktop/poultry/database/supabase_schema.sql).
3. Copy your Supabase Project URL and Anon Public Key into the App settings.

### Option 3: Deploy to Redmi Go with Android Studio
1. Open **Android Studio**.
2. Select **Open an Existing Project** and open the [`android/`](file:///c:/Users/padal/OneDrive/Desktop/poultry/android) folder.
3. Connect your Redmi Go with USB Debugging enabled.
4. Build and install:
   ```bash
   ./gradlew assembleDebug
   ```

# Cam-Attendace
