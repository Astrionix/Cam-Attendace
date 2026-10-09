package com.poultry.attend.domain.ml

import android.graphics.Bitmap
import android.graphics.Matrix
import android.graphics.Rect
import androidx.annotation.OptIn
import androidx.camera.core.ExperimentalGetImage
import androidx.camera.core.ImageProxy
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.face.Face
import com.google.mlkit.vision.face.FaceDetection
import com.google.mlkit.vision.face.FaceDetector
import com.google.mlkit.vision.face.FaceDetectorOptions
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlin.coroutines.resume
import kotlin.math.max
import kotlin.math.min

class FaceDetectorHelper {

    private val detector: FaceDetector

    init {
        val options = FaceDetectorOptions.Builder()
            .setPerformanceMode(FaceDetectorOptions.PERFORMANCE_MODE_FAST)
            .setClassificationMode(FaceDetectorOptions.CLASSIFICATION_MODE_ALL) // For eye open probability
            .setLandmarkMode(FaceDetectorOptions.LANDMARK_MODE_ALL) // Enables Eye landmark alignment
            .setMinFaceSize(0.15f) // Natural kiosk standing distance
            .build()

        detector = FaceDetection.getClient(options)
    }

    suspend fun detectFaces(bitmap: Bitmap, rotationDegrees: Int = 0): List<Face> {
        val image = InputImage.fromBitmap(bitmap, rotationDegrees)
        return suspendCancellableCoroutine { cont ->
            detector.process(image)
                .addOnSuccessListener { faces ->
                    if (cont.isActive) cont.resume(faces)
                }
                .addOnFailureListener {
                    if (cont.isActive) cont.resume(emptyList())
                }
        }
    }

    @OptIn(ExperimentalGetImage::class)
    suspend fun detectFacesFromImageProxy(imageProxy: ImageProxy): Pair<List<Face>, ImageProxy> {
        val mediaImage = imageProxy.image
        if (mediaImage == null) {
            return Pair(emptyList(), imageProxy)
        }
        val image = InputImage.fromMediaImage(mediaImage, imageProxy.imageInfo.rotationDegrees)
        return suspendCancellableCoroutine { cont ->
            detector.process(image)
                .addOnSuccessListener { faces ->
                    if (cont.isActive) cont.resume(Pair(faces, imageProxy))
                }
                .addOnFailureListener {
                    if (cont.isActive) cont.resume(Pair(emptyList(), imageProxy))
                }
        }
    }

    /**
     * Crops the detected face rectangle from the source bitmap with safety margins.
     */
    fun cropFace(source: Bitmap, boundingBox: Rect): Bitmap? {
        try {
            // Expand box by 15% margin for better facial feature context
            val marginX = (boundingBox.width() * 0.15f).toInt()
            val marginY = (boundingBox.height() * 0.15f).toInt()

            val left = max(0, boundingBox.left - marginX)
            val top = max(0, boundingBox.top - marginY)
            val right = min(source.width, boundingBox.right + marginX)
            val bottom = min(source.height, boundingBox.bottom + marginY)

            val width = right - left
            val height = bottom - top

            if (width <= 0 || height <= 0) return null

            return Bitmap.createBitmap(source, left, top, width, height)
        } catch (e: Exception) {
            return null
        }
    }

    fun close() {
        detector.close()
    }
}
