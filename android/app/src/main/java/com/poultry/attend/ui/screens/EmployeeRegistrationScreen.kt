package com.poultry.attend.ui.screens

import android.graphics.Bitmap
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.FlashOn
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.poultry.attend.domain.registration.RegistrationManager
import com.poultry.attend.ui.components.CameraViewfinder
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EmployeeRegistrationScreen(
    registrationManager: RegistrationManager,
    onBack: () -> Unit,
    onComplete: () -> Unit
) {
    val coroutineScope = rememberCoroutineScope()

    var employeeCode by remember { mutableStateOf("") }
    var name by remember { mutableStateOf("") }
    // 0: Form Details, 1: Quick Front Camera, 2: Registration Successful
    var currentStep by remember { mutableStateOf(0) }

    var currentFrame by remember { mutableStateOf<Bitmap?>(null) }
    var validationFeedback by remember { mutableStateOf<String?>(null) }
    var isChecking by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("Quick Face Registration", fontWeight = FontWeight.Bold, fontSize = 17.sp, color = Color.White)
                        Text("Front Face Only • Single Step", fontSize = 11.sp, color = Color(0xFF10B981))
                    }
                },
                navigationIcon = {
                    IconButton(onClick = {
                        if (currentStep > 0) {
                            currentStep = 0
                            validationFeedback = null
                        } else {
                            onBack()
                        }
                    }) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back", tint = Color.White)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color(0xFF0F172A))
            )
        },
        containerColor = Color(0xFF070B14)
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // STEP PROGRESS INDICATOR (Details -> Front Face -> Done)
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 24.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                QuickStepBadge(stepNum = 1, label = "Worker Details", isDone = currentStep > 0, isActive = currentStep == 0)
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .height(2.dp)
                        .background(if (currentStep >= 1) Color(0xFF10B981) else Color(0xFF1E293B))
                        .padding(horizontal = 4.dp)
                )
                QuickStepBadge(stepNum = 2, label = "Front Face", isDone = currentStep > 1, isActive = currentStep == 1)
            }

            when (currentStep) {
                0 -> {
                    // STEP 1: MINIMAL EMPLOYEE DETAILS FORM
                    Surface(
                        shape = RoundedCornerShape(16.dp),
                        color = Color(0xFF131B2E),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(
                            modifier = Modifier.padding(20.dp),
                            verticalArrangement = Arrangement.spacedBy(14.dp)
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Default.FlashOn, contentDescription = null, tint = Color(0xFF10B981), modifier = Modifier.size(20.dp))
                                Spacer(modifier = Modifier.width(6.dp))
                                Text("New Worker Registration", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = Color.White)
                            }

                            Text(
                                "Enter the employee ID and name. In the next step, capture the front face photo once to immediately enroll the worker.",
                                fontSize = 12.sp,
                                color = Color(0xFF94A3B8)
                            )

                            OutlinedTextField(
                                value = employeeCode,
                                onValueChange = { employeeCode = it.uppercase() },
                                label = { Text("Employee ID / Code (e.g. PF-106)") },
                                placeholder = { Text("PF-106") },
                                singleLine = true,
                                modifier = Modifier.fillMaxWidth(),
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedBorderColor = Color(0xFF10B981),
                                    focusedLabelColor = Color(0xFF10B981),
                                    focusedTextColor = Color.White,
                                    unfocusedTextColor = Color.White
                                )
                            )

                            OutlinedTextField(
                                value = name,
                                onValueChange = { name = it },
                                label = { Text("Employee Full Name") },
                                placeholder = { Text("Ramesh Kumar") },
                                singleLine = true,
                                modifier = Modifier.fillMaxWidth(),
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedBorderColor = Color(0xFF10B981),
                                    focusedLabelColor = Color(0xFF10B981),
                                    focusedTextColor = Color.White,
                                    unfocusedTextColor = Color.White
                                )
                            )

                            Spacer(modifier = Modifier.height(6.dp))

                            Button(
                                onClick = {
                                    if (employeeCode.isNotBlank() && name.isNotBlank()) {
                                        validationFeedback = null
                                        currentStep = 1 // Proceed directly to Front Camera
                                    }
                                },
                                enabled = employeeCode.isNotBlank() && name.isNotBlank(),
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF10B981)),
                                shape = RoundedCornerShape(10.dp),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(50.dp)
                            ) {
                                Text("Next: Capture Front Face →", fontWeight = FontWeight.Bold, color = Color.Black, fontSize = 15.sp)
                            }
                        }
                    }
                }

                1 -> {
                    // STEP 2: INSTANT FRONT FACE CAPTURE
                    Surface(
                        shape = RoundedCornerShape(16.dp),
                        color = Color(0xFF131B2E),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(
                            modifier = Modifier.padding(16.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Text(
                                text = "Front Face Capture",
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFF10B981),
                                fontSize = 18.sp
                            )
                            Text(
                                text = "Hold still and look directly into the camera",
                                fontSize = 13.sp,
                                color = Color(0xFF94A3B8),
                                modifier = Modifier.padding(top = 4.dp, bottom = 12.dp)
                            )

                            // Camera Viewfinder Box
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(320.dp)
                                    .clip(RoundedCornerShape(12.dp)),
                                contentAlignment = Alignment.Center
                            ) {
                                CameraViewfinder(
                                    modifier = Modifier.fillMaxSize(),
                                    onFrameCaptured = { bmp -> currentFrame = bmp }
                                )

                                // Oval guidance border overlay
                                Box(
                                    modifier = Modifier
                                        .size(width = 180.dp, height = 230.dp)
                                        .border(2.dp, Color(0xFF10B981).copy(alpha = 0.8f), CircleShape)
                                )
                            }

                            if (validationFeedback != null) {
                                Surface(
                                    shape = RoundedCornerShape(8.dp),
                                    color = Color(0xFF7F1D1D),
                                    modifier = Modifier.padding(vertical = 10.dp)
                                ) {
                                    Text(
                                        text = "⚠️ $validationFeedback",
                                        color = Color.White,
                                        fontSize = 13.sp,
                                        fontWeight = FontWeight.Bold,
                                        modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp)
                                    )
                                }
                            }

                            Spacer(modifier = Modifier.height(14.dp))

                            // Action button: 1-Tap Capture & Register
                            Button(
                                onClick = {
                                    val frame = currentFrame
                                    if (frame == null) {
                                        validationFeedback = "Camera not ready yet, please wait 1 second"
                                        return@Button
                                    }
                                    isChecking = true
                                    validationFeedback = null

                                    coroutineScope.launch {
                                        val (success, message) = registrationManager.registerSingleFrontFace(
                                            employeeCode = employeeCode,
                                            name = name,
                                            frame = frame
                                        )
                                        isChecking = false
                                        if (success) {
                                            currentStep = 2 // Move to Success!
                                        } else {
                                            validationFeedback = message
                                        }
                                    }
                                },
                                enabled = !isChecking,
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF10B981)),
                                shape = RoundedCornerShape(10.dp),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(52.dp)
                            ) {
                                if (isChecking) {
                                    CircularProgressIndicator(color = Color.Black, modifier = Modifier.size(22.dp))
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text("Extracting Face Features...", color = Color.Black, fontWeight = FontWeight.Bold)
                                } else {
                                    Icon(Icons.Default.CameraAlt, contentDescription = null, tint = Color.Black)
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text("📸 Capture Front Face & Register", fontWeight = FontWeight.Bold, color = Color.Black, fontSize = 15.sp)
                                }
                            }

                            TextButton(
                                onClick = { currentStep = 0 },
                                modifier = Modifier.padding(top = 4.dp)
                            ) {
                                Text("Edit Worker Details", color = Color(0xFF94A3B8), fontSize = 12.sp)
                            }
                        }
                    }
                }

                2 -> {
                    // STEP 3: SUCCESS CONFIRMATION
                    Surface(
                        shape = RoundedCornerShape(16.dp),
                        color = Color(0xFF131B2E),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(
                            modifier = Modifier.padding(28.dp),
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.spacedBy(14.dp)
                        ) {
                            Icon(
                                Icons.Default.CheckCircle,
                                contentDescription = null,
                                tint = Color(0xFF10B981),
                                modifier = Modifier.size(64.dp)
                            )

                            Text(
                                text = "Registration Successful!",
                                fontWeight = FontWeight.Black,
                                fontSize = 20.sp,
                                color = Color.White
                            )

                            Text(
                                text = "Employee $name ($employeeCode) has been enrolled with MobileFaceNet biometrics.",
                                fontSize = 13.sp,
                                color = Color(0xFF94A3B8),
                                textAlign = androidx.compose.ui.text.style.TextAlign.Center
                            )

                            Text(
                                text = "The worker can now immediately scan their face on the Kiosk to Check-In / Check-Out.",
                                fontSize = 12.sp,
                                color = Color(0xFF38BDF8),
                                textAlign = androidx.compose.ui.text.style.TextAlign.Center
                            )

                            Spacer(modifier = Modifier.height(8.dp))

                            Button(
                                onClick = onComplete,
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF10B981)),
                                shape = RoundedCornerShape(10.dp),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(48.dp)
                            ) {
                                Text("Done & Return to Dashboard", fontWeight = FontWeight.Bold, color = Color.Black)
                            }
                        }
                    }

                    // Auto-return after 2.5 seconds
                    LaunchedEffect(Unit) {
                        delay(2500)
                        onComplete()
                    }
                }
            }
        }
    }
}

@Composable
fun QuickStepBadge(stepNum: Int, label: String, isDone: Boolean, isActive: Boolean) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Box(
            modifier = Modifier
                .size(32.dp)
                .clip(CircleShape)
                .background(
                    when {
                        isDone -> Color(0xFF10B981)
                        isActive -> Color(0xFF38BDF8)
                        else -> Color(0xFF1E293B)
                    }
                )
                .border(1.dp, if (isActive || isDone) Color.Transparent else Color(0xFF334155), CircleShape),
            contentAlignment = Alignment.Center
        ) {
            if (isDone) {
                Icon(Icons.Default.Check, contentDescription = null, tint = Color.Black, modifier = Modifier.size(16.dp))
            } else {
                Text("$stepNum", color = if (isActive) Color.Black else Color.White, fontSize = 12.sp, fontWeight = FontWeight.Bold)
            }
        }
        Text(
            text = label,
            fontSize = 10.sp,
            fontWeight = if (isActive) FontWeight.Bold else FontWeight.Normal,
            color = if (isActive || isDone) Color.White else Color(0xFF64748B),
            modifier = Modifier.padding(top = 4.dp)
        )
    }
}
