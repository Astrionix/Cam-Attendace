package com.poultry.attend.ui.components

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Matrix
import androidx.camera.core.*
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.compose.animation.core.*
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import com.poultry.attend.ui.theme.PrimaryEmerald
import com.poultry.attend.ui.theme.SecondaryCyan
import java.util.concurrent.Executors

@Composable
fun CameraViewfinder(
    modifier: Modifier = Modifier,
    isFaceDetected: Boolean = false,
    onFrameCaptured: (Bitmap) -> Unit = {}
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val cameraExecutor = remember { Executors.newSingleThreadExecutor() }

    // Pulsing scan line animation
    val infiniteTransition = rememberInfiniteTransition(label = "scanLine")
    val scanProgress by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(2200, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "scanAnim"
    )

    Box(
        modifier = modifier
            .clip(RoundedCornerShape(24.dp))
            .background(Color.Black)
            .border(
                width = 3.dp,
                color = if (isFaceDetected) PrimaryEmerald else SecondaryCyan.copy(alpha = 0.5f),
                shape = RoundedCornerShape(24.dp)
            ),
        contentAlignment = Alignment.Center
    ) {
        AndroidView(
            modifier = Modifier.fillMaxSize(),
            factory = { ctx ->
                val previewView = PreviewView(ctx).apply {
                    scaleType = PreviewView.ScaleType.FILL_CENTER
                    implementationMode = PreviewView.ImplementationMode.COMPATIBLE
                }

                val cameraProviderFuture = ProcessCameraProvider.getInstance(ctx)
                cameraProviderFuture.addListener({
                    val cameraProvider = cameraProviderFuture.get()

                    val preview = Preview.Builder()
                        .setTargetResolution(android.util.Size(480, 640))
                        .build()
                        .also {
                            it.setSurfaceProvider(previewView.surfaceProvider)
                        }

                    // Low-memory analysis for Redmi Go Snapdragon 425
                    val imageAnalysis = ImageAnalysis.Builder()
                        .setTargetResolution(android.util.Size(320, 240))
                        .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                        .setOutputImageFormat(ImageAnalysis.OUTPUT_IMAGE_FORMAT_RGBA_8888)
                        .build()

                    imageAnalysis.setAnalyzer(cameraExecutor) { imageProxy ->
                        val bitmap = imageProxy.toBitmap()
                        val rotationDegrees = imageProxy.imageInfo.rotationDegrees
                        val rotatedBitmap = if (rotationDegrees != 0) {
                            val matrix = Matrix().apply { postRotate(rotationDegrees.toFloat()) }
                            Bitmap.createBitmap(bitmap, 0, 0, bitmap.width, bitmap.height, matrix, true)
                        } else {
                            bitmap
                        }
                        onFrameCaptured(rotatedBitmap)
                        imageProxy.close()
                    }

                    // Prefer front camera for kiosk attendance, fallback to back
                    val cameraSelector = if (cameraProvider.hasCamera(CameraSelector.DEFAULT_FRONT_CAMERA)) {
                        CameraSelector.DEFAULT_FRONT_CAMERA
                    } else {
                        CameraSelector.DEFAULT_BACK_CAMERA
                    }

                    try {
                        cameraProvider.unbindAll()
                        cameraProvider.bindToLifecycle(
                            lifecycleOwner,
                            cameraSelector,
                            preview,
                            imageAnalysis
                        )
                    } catch (exc: Exception) {
                        // Handled safely
                    }
                }, ContextCompat.getMainExecutor(ctx))

                previewView
            }
        )

        // Overlay with scanning reticle & corner markers
        Canvas(modifier = Modifier.fillMaxSize().padding(16.dp)) {
            val width = size.width
            val height = size.height

            // Corner bracket guides
            val cornerLength = 40.dp.toPx()
            val strokeWidth = 5.dp.toPx()
            val bracketColor = if (isFaceDetected) PrimaryEmerald else SecondaryCyan

            // Top-Left
            drawLine(bracketColor, Offset(0f, 0f), Offset(cornerLength, 0f), strokeWidth)
            drawLine(bracketColor, Offset(0f, 0f), Offset(0f, cornerLength), strokeWidth)

            // Top-Right
            drawLine(bracketColor, Offset(width, 0f), Offset(width - cornerLength, 0f), strokeWidth)
            drawLine(bracketColor, Offset(width, 0f), Offset(width, cornerLength), strokeWidth)

            // Bottom-Left
            drawLine(bracketColor, Offset(0f, height), Offset(cornerLength, height), strokeWidth)
            drawLine(bracketColor, Offset(0f, height), Offset(0f, height - cornerLength), strokeWidth)

            // Bottom-Right
            drawLine(bracketColor, Offset(width, height), Offset(width - cornerLength, height), strokeWidth)
            drawLine(bracketColor, Offset(width, height), Offset(width, height - cornerLength), strokeWidth)

            // Dynamic scan line
            val scanY = height * scanProgress
            drawLine(
                color = if (isFaceDetected) PrimaryEmerald.copy(alpha = 0.8f) else SecondaryCyan.copy(alpha = 0.6f),
                start = Offset(0f, scanY),
                end = Offset(width, scanY),
                strokeWidth = 3.dp.toPx()
            )
        }
    }
}
