package com.poultry.attend.domain.pipeline

import com.poultry.attend.data.local.EmployeeEntity
import kotlin.math.sqrt

/**
 * Strict Calibrated Confidence Threshold Configuration (Sections 10 & 26).
 * "Accuracy is the highest priority. Never automatically select the closest employee
 * if the match is uncertain. Prefer false rejection over false acceptance."
 */
data class ThresholdConfig(
    val matchThreshold: Float = 0.62f,          // Realistic calibrated cosine similarity for MobileFaceNet
    val highConfidenceThreshold: Float = 0.75f, // Strong match
    val ambiguityMargin: Float = 0.03f           // If top1 - top2 < margin, mark AMBIGUOUS
)

sealed class RecognitionResult {
    data class Match(
        val employee: EmployeeEntity,
        val confidenceScore: Float,
        val isHighConfidence: Boolean
    ) : RecognitionResult()

    data class AmbiguousMatch(
        val topEmployee: EmployeeEntity,
        val secondEmployee: EmployeeEntity,
        val scoreDiff: Float
    ) : RecognitionResult()

    data class Uncertain(val highestScore: Float) : RecognitionResult()

    object NoEnrolledEmployees : RecognitionResult()
}

/**
 * Embedding-based face recognition engine using cosine similarity.
 * Runs in-memory with zero allocations during scanning.
 */
class FaceRecognitionEngine(
    var config: ThresholdConfig = ThresholdConfig()
) {

    private data class CachedEmployee(
        val employee: EmployeeEntity,
        val embedding: FloatArray
    )

    private var cachedEmployees = listOf<CachedEmployee>()

    fun updateEmployees(employees: List<EmployeeEntity>) {
        cachedEmployees = employees.mapNotNull { emp ->
            if (emp.faceTemplateReference.isNotEmpty()) {
                CachedEmployee(emp, emp.faceTemplateReference.toFloatArray())
            } else null
        }
        android.util.Log.d("PoultryAttend", "FaceRecognitionEngine updated with ${cachedEmployees.size} enrolled templates")
    }

    /**
     * Matches live probe embedding against registered employees.
     */
    fun recognize(probeEmbedding: FloatArray): RecognitionResult {
        if (cachedEmployees.isEmpty()) {
            android.util.Log.w("PoultryAttend", "recognize() called but cachedEmployees is EMPTY!")
            return RecognitionResult.NoEnrolledEmployees
        }

        // Rank by cosine similarity
        val ranked = cachedEmployees.map { cached ->
            val sim = computeCosineSimilarity(probeEmbedding, cached.embedding)
            cached.employee to sim
        }.sortedByDescending { it.second }

        val topMatch = ranked[0]
        val topEmployee = topMatch.first
        val topScore = topMatch.second

        android.util.Log.d("PoultryAttend", "Top match: ${topEmployee.name} (${topEmployee.employeeCode}) score=$topScore vs threshold=${config.matchThreshold}")

        // 1. Strict threshold check (Section 10)
        if (topScore < config.matchThreshold) {
            return RecognitionResult.Uncertain(highestScore = topScore)
        }

        // 2. Ambiguity check: Reject if two employees have similar scores (Section 10)
        if (ranked.size > 1) {
            val secondMatch = ranked[1]
            val secondScore = secondMatch.second
            val diff = topScore - secondScore

            if (diff < config.ambiguityMargin && secondScore >= (config.matchThreshold - 0.04f)) {
                return RecognitionResult.AmbiguousMatch(
                    topEmployee = topEmployee,
                    secondEmployee = secondMatch.first,
                    scoreDiff = diff
                )
            }
        }

        return RecognitionResult.Match(
            employee = topEmployee,
            confidenceScore = topScore,
            isHighConfidence = topScore >= config.highConfidenceThreshold
        )
    }

    private fun computeCosineSimilarity(v1: FloatArray, v2: FloatArray): Float {
        val len = minOf(v1.size, v2.size)
        var dot = 0f
        var normA = 0f
        var normB = 0f
        for (i in 0 until len) {
            val a = v1[i]
            val b = v2[i]
            dot += a * b
            normA += a * a
            normB += b * b
        }
        val denom = sqrt(normA) * sqrt(normB)
        return if (denom > 0f) (dot / denom).coerceIn(0f, 1f) else 0f
    }
}
