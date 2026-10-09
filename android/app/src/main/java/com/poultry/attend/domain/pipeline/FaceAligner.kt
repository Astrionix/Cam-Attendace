package com.poultry.attend.domain.pipeline

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Matrix
import android.graphics.Paint
import android.graphics.PointF
import com.google.mlkit.vision.face.Face
import com.google.mlkit.vision.face.FaceLandmark
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.sin
import kotlin.math.sqrt

/**
 * Normalizes and aligns faces based on Eye, Nose, and Mouth landmarks (Section 4).
 * Rotates the face horizontally, normalizes scale, and crops to 112x112 target.
 */
class FaceAligner(
    val targetSize: Int = 112
) {

    fun align(sourceBitmap: Bitmap, face: Face): Bitmap {
        val leftEyeLandmark = face.getLandmark(FaceLandmark.LEFT_EYE)?.position
        val rightEyeLandmark = face.getLandmark(FaceLandmark.RIGHT_EYE)?.position

        // Fallback to bounding box crop if eyes are not landmarked
        if (leftEyeLandmark == null || rightEyeLandmark == null) {
            return standardCrop(sourceBitmap, face)
        }

        // Note: For front camera mirroring, calculate eye centers
        val eyeDeltaX = rightEyeLandmark.x - leftEyeLandmark.x
        val eyeDeltaY = rightEyeLandmark.y - leftEyeLandmark.y

        // Eye rotation angle in degrees
        val eyeAngleRadians = atan2(eyeDeltaY.toDouble(), eyeDeltaX.toDouble())
        val eyeAngleDegrees = Math.toDegrees(eyeAngleRadians).toFloat()

        // Eye midpoint
        val eyeMidX = (leftEyeLandmark.x + rightEyeLandmark.x) / 2f
        val eyeMidY = (leftEyeLandmark.y + rightEyeLandmark.y) / 2f

        // Inter-pupillary distance (IPD)
        val eyeDistance = sqrt((eyeDeltaX * eyeDeltaX + eyeDeltaY * eyeDeltaY).toDouble()).toFloat()

        // Desired distance between eyes on a 112x112 aligned template is ~38-42% of width (~44px)
        val desiredEyeDistance = targetSize * 0.38f
        val scale = if (eyeDistance > 10f) desiredEyeDistance / eyeDistance else 1.0f

        // Center of the aligned face should place eye midpoint at ~38% from top
        val desiredEyeMidY = targetSize * 0.38f
        val desiredEyeMidX = targetSize * 0.50f

        // Compute affine transformation matrix
        val matrix = Matrix().apply {
            // Translate eye midpoint to origin
            postTranslate(-eyeMidX, -eyeMidY)
            // Rotate to make eye line horizontal
            postRotate(-eyeAngleDegrees)
            // Scale to standard template size
            postScale(scale, scale)
            // Translate to destination eye center
            postTranslate(desiredEyeMidX, desiredEyeMidY)
        }

        // Render into clean 112x112 aligned bitmap
        val alignedBitmap = Bitmap.createBitmap(targetSize, targetSize, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(alignedBitmap)
        val paint = Paint(Paint.FILTER_BITMAP_FLAG or Paint.DITHER_FLAG)
        canvas.drawBitmap(sourceBitmap, matrix, paint)

        return alignedBitmap
    }

    private fun standardCrop(sourceBitmap: Bitmap, face: Face): Bitmap {
        val box = face.boundingBox
        val marginX = (box.width() * 0.15f).toInt()
        val marginY = (box.height() * 0.15f).toInt()

        val left = (box.left - marginX).coerceAtLeast(0)
        val top = (box.top - marginY).coerceAtLeast(0)
        val right = (box.right + marginX).coerceAtMost(sourceBitmap.width)
        val bottom = (box.bottom + marginY).coerceAtMost(sourceBitmap.height)

        val width = (right - left).coerceAtLeast(1)
        val height = (bottom - top).coerceAtLeast(1)

        val cropped = Bitmap.createBitmap(sourceBitmap, left, top, width, height)
        return Bitmap.createScaledBitmap(cropped, targetSize, targetSize, true)
    }
}
