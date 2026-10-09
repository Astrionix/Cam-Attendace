package com.poultry.attend.domain.pipeline

import com.google.mlkit.vision.face.Face
import kotlin.math.abs

enum class ActiveChallengeType {
    NONE,
    BLINK,
    TURN_LEFT,
    TURN_RIGHT
}

sealed class LivenessResult {
    data class Passed(val livenessScore: Float, val isPassiveOnly: Boolean) : LivenessResult()
    data class ChallengeRequired(val challenge: ActiveChallengeType, val promptMessage: String) : LivenessResult()
    data class Failed(val reason: String, val userMessage: String) : LivenessResult()
}

/**
 * Multi-layer Anti-Spoofing and Liveness Verification Engine (Section 7).
 * Combines passive temporal micro-dynamics (blinks, micro-motion, Euler variance)
 * with randomized active challenges when passive liveness is uncertain.
 */
class LivenessDetector(
    private val requireChallengeOnBorderline: Boolean = true
) {

    // Rolling window of recent face observations (last 10 frames)
    private data class FrameObservation(
        val timestamp: Long,
        val leftEyeOpen: Float,
        val rightEyeOpen: Float,
        val yaw: Float,
        val pitch: Float,
        val roll: Float
    )

    private val history = mutableListOf<FrameObservation>()
    private var activeChallenge: ActiveChallengeType = ActiveChallengeType.NONE
    private var challengeStartTime: Long = 0
    private var baselineYaw: Float = 0f
    private var blinkTransitionDetected = false

    fun processFrame(face: Face): LivenessResult {
        val now = System.currentTimeMillis()
        val leftEye = face.leftEyeOpenProbability ?: -1f
        val rightEye = face.rightEyeOpenProbability ?: -1f
        val yaw = face.headEulerAngleY
        val pitch = face.headEulerAngleX
        val roll = face.headEulerAngleZ

        // Maintain 10-frame rolling window
        history.add(FrameObservation(now, leftEye, rightEye, yaw, pitch, roll))
        if (history.size > 12) {
            history.removeAt(0)
        }

        // If an active challenge is ongoing, evaluate fulfillment
        if (activeChallenge != ActiveChallengeType.NONE) {
            return evaluateActiveChallenge(face, now)
        }

        // Need at least 4-5 frames to establish temporal variance
        if (history.size < 4) {
            return LivenessResult.ChallengeRequired(
                ActiveChallengeType.NONE,
                "Face detected — hold still"
            )
        }

        // 1. Check for Static Photo / Paper Spoof
        // In printed photos, Euler angles have near-zero variance (0.00°).
        val yawVariance = calculateVariance(history.map { it.yaw })
        val pitchVariance = calculateVariance(history.map { it.pitch })
        val eyeVariance = calculateVariance(history.map { (it.leftEyeOpen + it.rightEyeOpen) / 2f })

        val isCompletelyStatic = (yawVariance < 0.005f && pitchVariance < 0.005f && eyeVariance < 0.001f)
        if (isCompletelyStatic) {
            // No natural human tremor or micro-motion detected
            if (requireChallengeOnBorderline) {
                return startRandomChallenge(face)
            }
            return LivenessResult.Failed(
                reason = "ZERO_TEMPORAL_DYNAMICS",
                userMessage = "Unable to verify live person."
            )
        }

        // 2. Multi-Frame Blink Pattern Check
        val blinkObserved = detectBlinkPattern(history)

        // 3. Pose Micro-Dynamics Check
        val hasNaturalMicroMotion = (yawVariance in 0.01f..12f) && (pitchVariance in 0.01f..10f)

        // Passive scoring
        var passiveScore = 0.5f
        if (hasNaturalMicroMotion) passiveScore += 0.25f
        if (blinkObserved) passiveScore += 0.25f

        if (passiveScore >= 0.75f) {
            return LivenessResult.Passed(livenessScore = passiveScore, isPassiveOnly = true)
        }

        // If borderline, trigger randomized challenge instead of guessing
        return if (requireChallengeOnBorderline) {
            startRandomChallenge(face)
        } else {
            LivenessResult.Passed(livenessScore = passiveScore, isPassiveOnly = true)
        }
    }

    private fun startRandomChallenge(currentFace: Face): LivenessResult.ChallengeRequired {
        // Randomly pick Blink or Head Turn
        val pickBlink = (System.currentTimeMillis() % 2 == 0L)
        activeChallenge = if (pickBlink) ActiveChallengeType.BLINK else ActiveChallengeType.TURN_LEFT
        challengeStartTime = System.currentTimeMillis()
        baselineYaw = currentFace.headEulerAngleY
        blinkTransitionDetected = false

        val msg = when (activeChallenge) {
            ActiveChallengeType.BLINK -> "Please blink"
            ActiveChallengeType.TURN_LEFT -> "Please turn your head slightly left"
            ActiveChallengeType.TURN_RIGHT -> "Please turn your head slightly right"
            else -> "Look at the camera"
        }

        return LivenessResult.ChallengeRequired(activeChallenge, msg)
    }

    private fun evaluateActiveChallenge(face: Face, now: Long): LivenessResult {
        // Timeout after 3.5 seconds
        if (now - challengeStartTime > 3500) {
            reset()
            return LivenessResult.Failed(
                reason = "CHALLENGE_TIMEOUT",
                userMessage = "Unable to verify live person."
            )
        }

        when (activeChallenge) {
            ActiveChallengeType.BLINK -> {
                val left = face.leftEyeOpenProbability ?: -1f
                val right = face.rightEyeOpenProbability ?: -1f
                if (left in 0f..0.25f && right in 0f..0.25f) {
                    blinkTransitionDetected = true
                } else if (blinkTransitionDetected && left > 0.65f && right > 0.65f) {
                    // Full closed -> open transition completed!
                    reset()
                    return LivenessResult.Passed(livenessScore = 0.96f, isPassiveOnly = false)
                }
                return LivenessResult.ChallengeRequired(ActiveChallengeType.BLINK, "Please blink")
            }

            ActiveChallengeType.TURN_LEFT -> {
                val yawDiff = face.headEulerAngleY - baselineYaw
                if (yawDiff < -8f && yawDiff > -30f) {
                    reset()
                    return LivenessResult.Passed(livenessScore = 0.95f, isPassiveOnly = false)
                }
                return LivenessResult.ChallengeRequired(ActiveChallengeType.TURN_LEFT, "Please turn your head slightly left")
            }

            ActiveChallengeType.TURN_RIGHT -> {
                val yawDiff = face.headEulerAngleY - baselineYaw
                if (yawDiff > 8f && yawDiff < 30f) {
                    reset()
                    return LivenessResult.Passed(livenessScore = 0.95f, isPassiveOnly = false)
                }
                return LivenessResult.ChallengeRequired(ActiveChallengeType.TURN_RIGHT, "Please turn your head slightly right")
            }

            ActiveChallengeType.NONE -> {
                return LivenessResult.Passed(livenessScore = 0.85f, isPassiveOnly = true)
            }
        }
    }

    private fun detectBlinkPattern(obs: List<FrameObservation>): Boolean {
        var sawOpen = false
        var sawClose = false
        var sawOpenAgain = false

        for (o in obs) {
            val avgEye = (o.leftEyeOpen + o.rightEyeOpen) / 2f
            if (avgEye < 0f) continue // not calculated

            if (!sawOpen && avgEye > 0.6f) {
                sawOpen = true
            } else if (sawOpen && !sawClose && avgEye < 0.25f) {
                sawClose = true
            } else if (sawClose && avgEye > 0.6f) {
                sawOpenAgain = true
                break
            }
        }
        return sawOpen && sawClose && sawOpenAgain
    }

    private fun calculateVariance(values: List<Float>): Float {
        if (values.size < 2) return 0f
        val valid = values.filter { it >= -90f }
        if (valid.size < 2) return 0f
        val mean = valid.average()
        val sumSquares = valid.sumOf { (it - mean) * (it - mean) }
        return (sumSquares / (valid.size - 1)).toFloat()
    }

    fun reset() {
        history.clear()
        activeChallenge = ActiveChallengeType.NONE
        challengeStartTime = 0
        blinkTransitionDetected = false
    }
}
