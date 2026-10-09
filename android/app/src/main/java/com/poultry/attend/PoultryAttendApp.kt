package com.poultry.attend

import android.app.Application
import androidx.work.Constraints
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import com.poultry.attend.data.local.AppDatabase
import com.poultry.attend.data.local.EmployeeEntity
import com.poultry.attend.data.remote.SupabaseManager
import com.poultry.attend.data.remote.SyncWorker
import com.poultry.attend.domain.attendance.AttendanceDecisionEngine
import com.poultry.attend.domain.attendance.TtsSpeaker
import com.poultry.attend.domain.ml.FaceDetectorHelper
import com.poultry.attend.domain.ml.MobileFaceNet
import com.poultry.attend.domain.pipeline.*
import com.poultry.attend.domain.registration.RegistrationManager
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.util.concurrent.TimeUnit

class PoultryAttendApp : Application() {

    lateinit var database: AppDatabase
        private set
    lateinit var supabaseManager: SupabaseManager
        private set
    lateinit var faceDetector: FaceDetectorHelper
        private set
    lateinit var qualityChecker: FaceQualityChecker
        private set
    lateinit var faceAligner: FaceAligner
        private set
    lateinit var livenessDetector: LivenessDetector
        private set
    lateinit var mobileFaceNet: MobileFaceNet
        private set
    lateinit var recognitionEngine: FaceRecognitionEngine
        private set
    lateinit var attendanceDecisionEngine: AttendanceDecisionEngine
        private set
    lateinit var registrationManager: RegistrationManager
        private set
    lateinit var ttsSpeaker: TtsSpeaker
        private set

    private val applicationScope = CoroutineScope(Dispatchers.IO)

    override fun onCreate() {
        super.onCreate()

        // 1. Initialize local SQLite Room database & Supabase REST manager
        database = AppDatabase.getInstance(this)
        supabaseManager = SupabaseManager(this)

        // 2. Initialize Computer Vision & ML Pipeline (Sections 4, 5, 6, 7, 9)
        faceDetector = FaceDetectorHelper()
        qualityChecker = FaceQualityChecker()
        faceAligner = FaceAligner(targetSize = 112)
        livenessDetector = LivenessDetector(requireChallengeOnBorderline = false)
        mobileFaceNet = MobileFaceNet(this)
        recognitionEngine = FaceRecognitionEngine(config = ThresholdConfig(matchThreshold = 0.62f, ambiguityMargin = 0.03f))

        // 3. Initialize Decision Engine & Registration Manager (Sections 8, 12)
        attendanceDecisionEngine = AttendanceDecisionEngine(database = database, cooldownSeconds = 45)
        registrationManager = RegistrationManager(
            database = database,
            faceDetector = faceDetector,
            qualityChecker = qualityChecker,
            faceAligner = faceAligner,
            mobileFaceNet = mobileFaceNet,
            supabaseManager = supabaseManager
        )
        ttsSpeaker = TtsSpeaker(this)

        // 4. Preload enrolled employee templates into memory (clean slate, no dummy data)
        applicationScope.launch {
            // Purge any lingering mock/demo employees
            database.employeeDao().deleteDemoEmployees()

            val active = database.employeeDao().getAllActiveEmployees()
            recognitionEngine.updateEmployees(active)
        }

        // 5. Schedule background offline sync (Section 16)
        scheduleOfflineSync()
    }

    private fun scheduleOfflineSync() {
        val constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build()

        val syncRequest = PeriodicWorkRequestBuilder<SyncWorker>(15, TimeUnit.MINUTES)
            .setConstraints(constraints)
            .build()

        WorkManager.getInstance(this).enqueueUniquePeriodicWork(
            "PoultryKioskSync",
            ExistingPeriodicWorkPolicy.KEEP,
            syncRequest
        )
    }

    override fun onTerminate() {
        super.onTerminate()
        faceDetector.close()
        mobileFaceNet.close()
        ttsSpeaker.shutdown()
    }
}
