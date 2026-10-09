package com.poultry.attend.domain.pipeline

import android.graphics.Bitmap
import android.graphics.Rect
import com.google.mlkit.vision.face.Face
import com.google.mlkit.vision.face.FaceLandmark
import kotlin.math.abs
import kotlin.math.max
import kotlin.math.min

sealed class QualityResult {
    data class Passed(val face: Face, val qualityScore: Float) : QualityResult()
    data class Rejected(val reason: String, val userMessage: String) : QualityResult()
}

/**
 * Strict Face Quality Validator conforming to Sections 2 & 3.
 * Prevents recognition on blurred, poorly lit, or poorly positioned faces.
 */
class FaceQualityChecker(
    private val minFaceRatio: Float = 0.15f, // Allow standing at comfortable distance
    private val maxPoseYawDegrees: Float = 28f,  // Euler Y
    private val maxPosePitchDegrees: Float = 25f, // Euler X
    private val minLuminance: Float = 30f,   // Standard indoor room lighting
    private val maxLuminance: Float = 250f,
    private val minBlurScore: Float = 35f    // Realistic variance threshold for mobile cameras
) {

    fun validate(faces: List<Face>, frameBitmap: Bitmap): QualityResult {
        // 1. Exactly one face check (Section 2)
        if (faces.isEmpty()) {
            return QualityResult.Rejected(
                reason = "NO_FACE",
                userMessage = "Look at the camera"
            )
        }
        if (faces.size > 1) {
            return QualityResult.Rejected(
                reason = "MULTIPLE_FACES",
                userMessage = "Only one person at a time"
            )
        }

        val face = faces[0]
        val box = face.boundingBox
        val frameWidth = frameBitmap.width
        val frameHeight = frameBitmap.height

        // 2. Face Size Check (Section 3)
        val faceWidthRatio = box.width().toFloat() / frameWidth.toFloat()
        if (faceWidthRatio < minFaceRatio) {
            return QualityResult.Rejected(
                reason = "FACE_TOO_SMALL",
                userMessage = "Move closer"
            )
        }

        // 3. Face Centering Check
        val centerX = box.centerX()
        val centerY = box.centerY()
        val offsetX = abs(centerX - (frameWidth / 2f)) / (frameWidth / 2f)
        val offsetY = abs(centerY - (frameHeight / 2f)) / (frameHeight / 2f)
        if (offsetX > 0.40f || offsetY > 0.45f) {
            return QualityResult.Rejected(
                reason = "FACE_NOT_CENTERED",
                userMessage = "Face detected — hold still"
            )
        }

        // 4. Pose Angle Check (Yaw & Pitch)
        val yaw = abs(face.headEulerAngleY)
        val pitch = abs(face.headEulerAngleX)
        if (yaw > maxPoseYawDegrees || pitch > maxPosePitchDegrees) {
            return QualityResult.Rejected(
                reason = "EXCESSIVE_ROTATION",
                userMessage = "Look directly at camera"
            )
        }

        // 5. Crop face patch safely for image checks
        val safeLeft = max(0, box.left)
        val safeTop = max(0, box.top)
        val safeWidth = min(frameWidth - safeLeft, box.width())
        val safeHeight = min(frameHeight - safeTop, box.height())

        if (safeWidth <= 32 || safeHeight <= 32) {
            return QualityResult.Rejected(
                reason = "INVALID_CROP",
                userMessage = "Move closer"
            )
        }

        val facePatch = Bitmap.createBitmap(frameBitmap, safeLeft, safeTop, safeWidth, safeHeight)

        // 6. Lighting / Brightness Check
        val luminance = calculateMeanLuminance(facePatch)
        if (luminance < minLuminance) {
            return QualityResult.Rejected(
                reason = "TOO_DARK",
                userMessage = "Please move to a brighter area"
            )
        }
        if (luminance > maxLuminance) {
            return QualityResult.Rejected(
                reason = "TOO_BRIGHT",
                userMessage = "Lighting too harsh"
            )
        }

        // 7. Blur Detection (Gradient / High Frequency Variance)
        val blurScore = calculateSharpnessScore(facePatch)
        if (blurScore < minBlurScore) {
            return QualityResult.Rejected(
                reason = "BLURRED",
                userMessage = "Face detected — hold still"
            )
        }

        // 7b. Screen Glare / Specular Reflection Check (Phone Screen & Glossy Print Defense)
        val glareRatio = calculateSpecularGlareRatio(facePatch)
        if (glareRatio > 0.08f) { // If >8% of face is blown-out glass reflection
            return QualityResult.Rejected(
                reason = "SPECULAR_GLARE_SPOOF",
                userMessage = "Hold still — remove screen or glare"
            )
        }

        // 8. Facial Landmark Visibility Check
        val leftEye = face.getLandmark(FaceLandmark.LEFT_EYE)
        val rightEye = face.getLandmark(FaceLandmark.RIGHT_EYE)
        if (leftEye == null && rightEye == null && (face.leftEyeOpenProbability ?: -1f) < 0.2f) {
            return QualityResult.Rejected(
                reason = "EYES_NOT_VISIBLE",
                userMessage = "Look directly at camera"
            )
        }

        // Combined Quality Score between 0.0 and 1.0
        val sizeFactor = (faceWidthRatio / 0.5f).coerceIn(0.7f, 1.0f)
        val angleFactor = (1f - (yaw / maxPoseYawDegrees) * 0.25f)
        val sharpnessFactor = (blurScore / 250f).coerceIn(0.8f, 1.0f)
        val qualityScore = (sizeFactor * angleFactor * sharpnessFactor).coerceIn(0.5f, 0.99f)

        return QualityResult.Passed(face, qualityScore)
    }

    private fun calculateMeanLuminance(bitmap: Bitmap): Float {
        val w = bitmap.width
        val h = bitmap.height
        val step = max(1, min(w, h) / 16)
        var totalLuma = 0.0
        var count = 0

        for (y in 0 until h step step) {
            for (x in 0 until w step step) {
                val color = bitmap.getPixel(x, y)
                val r = (color shr 16) and 0xFF
                val g = (color shr 8) and 0xFF
                val b = color and 0xFF
                // Standard ITU-R BT.601 luma formula
                val luma = 0.299 * r + 0.587 * g + 0.114 * b
                totalLuma += luma
                count++
            }
        }
        return if (count > 0) (totalLuma / count).toFloat() else 128f
    }

    /**
     * Estimates image sharpness using high-frequency horizontal and vertical differences.
     * Fast O(N) estimation with zero heap allocation, optimal for Redmi Go.
     */
    private fun calculateSharpnessScore(bitmap: Bitmap): Float {
        val w = bitmap.width
        val h = bitmap.height
        val step = max(1, min(w, h) / 32)
        var sumGradient = 0.0
        var count = 0

        for (y in 0 until h - 1 step step) {
            for (x in 0 until w - 1 step step) {
                val p0 = bitmap.getPixel(x, y)
                val px = bitmap.getPixel(x + 1, y)
                val py = bitmap.getPixel(x, y + 1)

                val lum0 = ((p0 shr 16 and 0xFF) + (p0 shr 8 and 0xFF) + (p0 and 0xFF)) / 3
                val lumX = ((px shr 16 and 0xFF) + (px shr 8 and 0xFF) + (px and 0xFF)) / 3
                val lumY = ((py shr 16 and 0xFF) + (py shr 8 and 0xFF) + (py and 0xFF)) / 3

                val dx = abs(lum0 - lumX)
                val dy = abs(lum0 - lumY)
                sumGradient += (dx * dx + dy * dy)
                count++
            }
        }

        return if (count > 0) kotlin.math.sqrt(sumGradient / count).toFloat() * 10f else 100f
    }

    /**
     * Detects specular reflections characteristic of phone screens or glossy photo paper.
     */
    private fun calculateSpecularGlareRatio(bitmap: Bitmap): Float {
        val w = bitmap.width
        val h = bitmap.height
        val step = max(1, min(w, h) / 16)
        var glareCount = 0
        var totalCount = 0

        for (y in 0 until h step step) {
            for (x in 0 until w step step) {
                val color = bitmap.getPixel(x, y)
                val r = (color shr 16) and 0xFF
                val g = (color shr 8) and 0xFF
                val b = color and 0xFF
                // Saturated white reflection hotspot
                if (r > 248 && g > 248 && b > 248) {
                    glareCount++
                }
                totalCount++
            }
        }
        return if (totalCount > 0) glareCount.toFloat() / totalCount.toFloat() else 0f
    }
}

