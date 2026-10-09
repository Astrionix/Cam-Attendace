package com.poultry.attend.ui.viewmodels

import android.graphics.Bitmap
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.poultry.attend.data.local.AppDatabase
import com.poultry.attend.data.local.EmployeeEntity
import com.poultry.attend.domain.attendance.AttendanceDecisionEngine
import com.poultry.attend.domain.attendance.DecisionResult
import com.poultry.attend.domain.attendance.PunchType
import com.poultry.attend.domain.attendance.TtsSpeaker
import com.poultry.attend.domain.ml.FaceDetectorHelper
import com.poultry.attend.domain.ml.MobileFaceNet
import com.poultry.attend.domain.pipeline.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.util.concurrent.atomic.AtomicBoolean

sealed class KioskUiState {
    object Idle : KioskUiState()
    object Detecting : KioskUiState()
    data class QualityWarning(val message: String) : KioskUiState()
    data class LivenessChallenge(val prompt: String) : KioskUiState()
    data class PunchSuccess(
        val employee: EmployeeEntity,
        val punchType: PunchType,
        val type: String,
        val time: String,
        val teluguTitle: String = ""
    ) : KioskUiState()
    data class AlreadyDone(
        val employee: EmployeeEntity,
        val punchType: PunchType,
        val time: String,
        val message: String,
        val telugu: String,
        val nextHint: String
    ) : KioskUiState()
    data class AlreadyCompleted(val name: String, val completedTime: String = "") : KioskUiState()
    data class InfoNotice(val message: String, val telugu: String) : KioskUiState()
    data class Cooldown(val name: String, val remainingSeconds: Int) : KioskUiState()
    data class Unknown(val message: String = "FACE NOT RECOGNIZED") : KioskUiState()
}

class KioskViewModel(
    private val database: AppDatabase,
    private val faceDetector: FaceDetectorHelper,
    private val qualityChecker: FaceQualityChecker,
    private val faceAligner: FaceAligner,
    private val livenessDetector: LivenessDetector,
    private val mobileFaceNet: MobileFaceNet,
    private val recognitionEngine: FaceRecognitionEngine,
    private val attendanceDecisionEngine: AttendanceDecisionEngine,
    private val ttsSpeaker: TtsSpeaker,
    private val supabaseManager: com.poultry.attend.data.remote.SupabaseManager? = null
) : ViewModel() {

    private val _uiState = MutableStateFlow<KioskUiState>(KioskUiState.Idle)
    val uiState: StateFlow<KioskUiState> = _uiState.asStateFlow()

    private val isProcessingFrame = AtomicBoolean(false)
    private var isPopupActive = false

    init {
        loadEmployees()

        // Live 2-way sync with Desktop Admin Dashboard (every 10 seconds)
        viewModelScope.launch(Dispatchers.IO) {
            while (true) {
                delay(10000)
                try {
                    val changed = supabaseManager?.syncWithDesktop(database) ?: false
                    if (changed) {
                        val list = database.employeeDao().getAllActiveEmployees()
                        recognitionEngine.updateEmployees(list)
                    }
                } catch (e: Exception) {
                    // Ignore offline
                }
            }
        }
    }

    fun loadEmployees() {
        viewModelScope.launch(Dispatchers.IO) {
            // 1. Immediately load local employees so face recognition works right away without delay
            val immediateList = database.employeeDao().getAllActiveEmployees()
            val enrolledImmediate = immediateList.count { it.faceTemplateReference.isNotEmpty() }
            android.util.Log.d("PoultryAttend", "KioskViewModel: immediately loaded ${immediateList.size} employees, $enrolledImmediate enrolled")
            recognitionEngine.updateEmployees(immediateList)

            // 2. Perform background desktop sync & upload newly registered employees
            try {
                supabaseManager?.syncWithDesktop(database)
            } catch (e: Exception) {
                // Ignore offline
            }

            // 3. Re-read after sync to include any updates
            val list = database.employeeDao().getAllActiveEmployees()
            val enrolled = list.count { it.faceTemplateReference.isNotEmpty() }
            android.util.Log.d("PoultryAttend", "KioskViewModel: after sync loaded ${list.size} employees, $enrolled enrolled")
            recognitionEngine.updateEmployees(list)
        }
    }

    fun onFrameAvailable(frame: Bitmap) {
        if (isPopupActive) return

        if (!isProcessingFrame.compareAndSet(false, true)) {
            // Drop frame while processing to maintain responsive 60fps UI on Redmi Go (Section 21)
            return
        }

        viewModelScope.launch(Dispatchers.Default) {
            try {
                // 1. Lightweight Face Detection (Section 4 & 5)
                val faces = faceDetector.detectFaces(frame)
                if (faces.isEmpty()) {
                    if (_uiState.value !is KioskUiState.Idle) {
                        _uiState.value = KioskUiState.Idle
                    }
                    livenessDetector.reset()
                    return@launch
                }

                // 2. Face Quality Check (Section 6)
                val quality = qualityChecker.validate(faces, frame)
                if (quality is QualityResult.Rejected) {
                    _uiState.value = KioskUiState.QualityWarning(quality.userMessage)
                    return@launch
                }

                val approvedFace = (quality as QualityResult.Passed).face

                // 3. Liveness Check (Non-blocking passive)
                val liveness = livenessDetector.processFrame(approvedFace)
                if (liveness is LivenessResult.Failed) {
                    _uiState.value = KioskUiState.QualityWarning(liveness.userMessage)
                    return@launch
                }

                _uiState.value = KioskUiState.Detecting

                // 4. Face Alignment (Section 7)
                val alignedFace = faceAligner.align(frame, approvedFace)

                // 5. Feature Extraction (Section 9)
                val probeEmbedding = mobileFaceNet.extractEmbedding(alignedFace)

                // 6. Face Recognition & Calibrated Thresholding (Section 9 & 10)
                val recognition = recognitionEngine.recognize(probeEmbedding)

                when (recognition) {
                    is RecognitionResult.Match -> {
                        // 7. Attendance Decision Engine (Section 12, 13, 14)
                        val decision = attendanceDecisionEngine.evaluate(
                            employee = recognition.employee,
                            confidenceScore = recognition.confidenceScore,
                            livenessScore = 0.95f
                        )
                        handleDecisionResult(decision)
                    }

                    is RecognitionResult.AmbiguousMatch -> {
                        _uiState.value = KioskUiState.Unknown("AMBIGUOUS FACE MATCH")
                        triggerDismissAfter(1500)
                    }

                    is RecognitionResult.Uncertain -> {
                        val scorePct = (recognition.highestScore * 100).toInt()
                        _uiState.value = KioskUiState.Unknown("FACE NOT RECOGNIZED ($scorePct%)")
                        triggerDismissAfter(1500)
                    }

                    is RecognitionResult.NoEnrolledEmployees -> {
                        _uiState.value = KioskUiState.Unknown("NO FACES ENROLLED")
                        triggerDismissAfter(2000)
                    }
                }

            } finally {
                isProcessingFrame.set(false)
            }
        }
    }

    private suspend fun handleDecisionResult(decision: DecisionResult) {
        when (decision) {
            is DecisionResult.PunchRecorded -> {
                viewModelScope.launch(Dispatchers.IO) {
                    try {
                        supabaseManager?.syncWithDesktop(database)
                    } catch (e: Exception) {
                        // Ignore network hiccups, will retry in periodic sync
                    }
                }
                isPopupActive = true
                _uiState.value = KioskUiState.PunchSuccess(
                    employee = decision.employee,
                    punchType = decision.punchType,
                    type = decision.punchType.title,
                    time = decision.formattedTime,
                    teluguTitle = decision.punchType.teluguTitle
                )
                ttsSpeaker.speakPunch(decision.employee.name, decision.punchType, decision.formattedTime)
                triggerDismissAfter(2800)
            }

            is DecisionResult.AlreadyPunched -> {
                isPopupActive = true
                _uiState.value = KioskUiState.AlreadyDone(
                    employee = decision.employee,
                    punchType = decision.punchType,
                    time = decision.recordedTime,
                    message = decision.message,
                    telugu = decision.teluguMessage,
                    nextHint = decision.nextHint
                )
                ttsSpeaker.speakAlreadyPunched(decision.employee.name, decision.punchType, decision.recordedTime)
                triggerDismissAfter(2800)
            }

            is DecisionResult.AlreadyCompleted -> {
                isPopupActive = true
                _uiState.value = KioskUiState.AlreadyCompleted(
                    name = decision.employee.name,
                    completedTime = decision.completedTime
                )
                ttsSpeaker.speakGuidance("${decision.employee.name}, duty completed for today at ${decision.completedTime}")
                triggerDismissAfter(2800)
            }

            is DecisionResult.CooldownActive -> {
                _uiState.value = KioskUiState.Cooldown(decision.employee.name, decision.remainingSeconds)
                triggerDismissAfter(1500)
            }

            is DecisionResult.Rejected -> {
                _uiState.value = KioskUiState.QualityWarning(decision.userMessage)
                triggerDismissAfter(1500)
            }
        }
    }

    private fun triggerDismissAfter(millis: Long) {
        viewModelScope.launch {
            delay(millis)
            isPopupActive = false
            _uiState.value = KioskUiState.Idle
            livenessDetector.reset()
        }
    }

    fun dismissPopup() {
        isPopupActive = false
        _uiState.value = KioskUiState.Idle
        livenessDetector.reset()
    }
}
