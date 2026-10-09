package com.poultry.attend.domain.registration

import android.graphics.Bitmap
import com.poultry.attend.data.local.AppDatabase
import com.poultry.attend.data.local.EmployeeEntity
import com.poultry.attend.domain.ml.FaceDetectorHelper
import com.poultry.attend.domain.ml.MobileFaceNet
import com.poultry.attend.domain.pipeline.FaceAligner
import com.poultry.attend.domain.pipeline.FaceQualityChecker
import com.poultry.attend.domain.pipeline.QualityResult
import java.util.UUID
import kotlin.math.sqrt

enum class CapturePose(val label: String, val prompt: String) {
    FRONT("FRONT", "Look straight at the camera"),
    SLIGHT_LEFT("LEFT", "Turn your head slightly left"),
    SLIGHT_RIGHT("RIGHT", "Turn your head slightly right"),
    SLIGHT_UP("UP", "Tilt your chin slightly up"),
    SLIGHT_DOWN("DOWN", "Tilt your chin slightly down")
}

data class ValidatedSample(
    val pose: CapturePose,
    val embedding: FloatArray
)

/**
 * Registration Manager implementing Section 8.
 * Admin inputs only Employee ID & Employee Name, captures 5 guided poses,
 * validates quality, and synthesizes a robust face template.
 */
class RegistrationManager(
    private val database: AppDatabase,
    private val faceDetector: FaceDetectorHelper,
    private val qualityChecker: FaceQualityChecker,
    private val faceAligner: FaceAligner,
    private val mobileFaceNet: MobileFaceNet,
    private val supabaseManager: com.poultry.attend.data.remote.SupabaseManager? = null
) {

    suspend fun validateAndExtract(
        frame: Bitmap,
        pose: CapturePose
    ): Pair<Boolean, Pair<FloatArray?, String>> {
        val faces = faceDetector.detectFaces(frame)
        val quality = qualityChecker.validate(faces, frame)

        if (quality is QualityResult.Rejected) {
            return false to (null to quality.userMessage)
        }

        val approvedFace = (quality as QualityResult.Passed).face
        val alignedFace = faceAligner.align(frame, approvedFace)
        val embedding = mobileFaceNet.extractEmbedding(alignedFace)

        return true to (embedding to "Sample accepted")
    }

    suspend fun registerSingleFrontFace(
        employeeCode: String,
        name: String,
        frame: Bitmap
    ): Pair<Boolean, String> {
        val faces = faceDetector.detectFaces(frame)
        val quality = qualityChecker.validate(faces, frame)

        if (quality is QualityResult.Rejected) {
            return false to quality.userMessage
        }

        val approvedFace = (quality as QualityResult.Passed).face
        val alignedFace = faceAligner.align(frame, approvedFace)
        val embedding = mobileFaceNet.extractEmbedding(alignedFace)

        val newEmployee = EmployeeEntity(
            id = UUID.randomUUID().toString(),
            employeeCode = employeeCode.trim().uppercase(),
            name = name.trim(),
            faceTemplateReference = embedding.toList(),
            status = "ACTIVE",
            createdAt = System.currentTimeMillis()
        )

        database.employeeDao().insertEmployee(newEmployee)
        android.util.Log.d("PoultryAttend", "SUCCESS: Saved employee ${newEmployee.name} (${newEmployee.id}) to Room DB")

        try {
            supabaseManager?.registerEmployeeOnline(newEmployee)
            android.util.Log.d("PoultryAttend", "SUCCESS: Pushed new employee ${newEmployee.name} to desktop admin")
        } catch (e: Exception) {
            android.util.Log.w("PoultryAttend", "Offline fallback: syncWithDesktop will upload it later")
        }

        return true to "Employee registered successfully!"
    }

    suspend fun saveEmployee(
        employeeCode: String,
        name: String,
        samples: List<ValidatedSample>
    ): EmployeeEntity {
        // Average and L2-normalize multiple valid embeddings (Section 8)
        val averaged = averageEmbeddings(samples.map { it.embedding }, mobileFaceNet.embeddingDim)

        val newEmployee = EmployeeEntity(
            id = UUID.randomUUID().toString(),
            employeeCode = employeeCode.trim().uppercase(),
            name = name.trim(),
            faceTemplateReference = averaged.toList(),
            status = "ACTIVE",
            createdAt = System.currentTimeMillis()
        )

        database.employeeDao().insertEmployee(newEmployee)
        return newEmployee
    }

    private fun averageEmbeddings(list: List<FloatArray>, dim: Int): FloatArray {
        if (list.isEmpty()) return FloatArray(dim)
        val result = FloatArray(dim)
        for (vec in list) {
            for (i in 0 until dim) {
                result[i] += vec[i]
            }
        }
        val count = list.size.toFloat()
        var sumSquares = 0f
        for (i in 0 until dim) {
            result[i] /= count
            sumSquares += result[i] * result[i]
        }
        val norm = sqrt(sumSquares)
        if (norm > 0) {
            for (i in 0 until dim) {
                result[i] /= norm
            }
        }
        return result
    }
}
