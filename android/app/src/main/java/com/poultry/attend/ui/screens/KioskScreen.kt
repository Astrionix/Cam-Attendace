package com.poultry.attend.ui.screens

import android.graphics.Bitmap
import androidx.compose.animation.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.poultry.attend.domain.attendance.FarmRoutine
import com.poultry.attend.domain.attendance.RoutinePhase
import com.poultry.attend.ui.components.CameraViewfinder
import com.poultry.attend.ui.theme.*
import com.poultry.attend.ui.viewmodels.KioskUiState
import kotlinx.coroutines.delay
import java.text.SimpleDateFormat
import java.util.*

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun KioskScreen(
    farmName: String = "FARM ATTENDANCE",
    uiState: KioskUiState,
    isOnline: Boolean = true,
    pendingSyncCount: Int = 0,
    onAdminClick: () -> Unit = {},
    onFrameCaptured: (Bitmap) -> Unit = {},
    onDismissPopup: () -> Unit = {}
) {
    var currentTimeStr by remember { mutableStateOf("") }
    var currentDateStr by remember { mutableStateOf("") }
    var currentPhase by remember { mutableStateOf(FarmRoutine.getCurrentPhase()) }

    LaunchedEffect(Unit) {
        val timeFmt = SimpleDateFormat("hh:mm a", Locale.getDefault())
        val dateFmt = SimpleDateFormat("dd MMMM yyyy", Locale.getDefault())
        while (true) {
            val now = Calendar.getInstance()
            currentTimeStr = timeFmt.format(now.time)
            currentDateStr = dateFmt.format(now.time)
            currentPhase = FarmRoutine.getCurrentPhase(now)
            delay(1000)
        }
    }

    // High-contrast Status Message (Section 23)
    val statusText = when (uiState) {
        is KioskUiState.Idle -> "LOOK AT THE CAMERA"
        is KioskUiState.Detecting -> "VERIFYING..."
        is KioskUiState.QualityWarning -> uiState.message.uppercase()
        is KioskUiState.LivenessChallenge -> uiState.prompt.uppercase()
        is KioskUiState.Unknown -> "FACE NOT RECOGNIZED"
        is KioskUiState.Cooldown -> "ATTENDANCE RECORDED"
        is KioskUiState.InfoNotice -> uiState.message.uppercase()
        is KioskUiState.AlreadyDone -> "${uiState.punchType.title} ALREADY DONE"
        is KioskUiState.AlreadyCompleted -> "ALL SHIFTS COMPLETED TODAY"
        is KioskUiState.PunchSuccess -> "✓ ${uiState.employee.name.uppercase()}"
    }

    val isError = uiState is KioskUiState.Unknown || uiState is KioskUiState.QualityWarning
    val isChallenge = uiState is KioskUiState.LivenessChallenge

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF070B14))
            .padding(16.dp)
    ) {
        Column(
            modifier = Modifier.fillMaxSize(),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            // 1. TOP HEADER: Clean, Modern Kiosk Header with Safe Area Insets
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .statusBarsPadding()
                    .padding(horizontal = 4.dp, vertical = 6.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Sleek Branding Card
                Surface(
                    shape = RoundedCornerShape(14.dp),
                    color = Color(0xFF0F172A),
                    border = BorderStroke(1.dp, Color(0xFF1E293B)),
                    modifier = Modifier.combinedClickable(
                        onClick = {},
                        onLongClick = onAdminClick
                    )
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(
                            modifier = Modifier
                                .size(8.dp)
                                .clip(CircleShape)
                                .background(if (isOnline) Color(0xFF10B981) else Color(0xFFF59E0B))
                        )
                        Spacer(modifier = Modifier.width(10.dp))
                        Column {
                            Text(
                                text = "PoultryAttend",
                                color = Color.White,
                                fontWeight = FontWeight.Bold,
                                fontSize = 15.sp,
                                letterSpacing = 0.3.sp
                            )
                            Text(
                                text = "Farm Attendance Terminal",
                                color = Color(0xFF94A3B8),
                                fontSize = 10.sp
                            )
                        }
                    }
                }

                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    // Status Badge (Clean subtle pill)
                    Surface(
                        shape = RoundedCornerShape(20.dp),
                        color = if (isOnline) Color(0xFF064E3B).copy(alpha = 0.7f) else Color(0xFF78350F).copy(alpha = 0.7f),
                        border = BorderStroke(1.dp, if (isOnline) Color(0xFF10B981).copy(alpha = 0.4f) else Color(0xFFF59E0B).copy(alpha = 0.4f))
                    ) {
                        Text(
                            text = if (pendingSyncCount > 0) "Offline ($pendingSyncCount)" else if (isOnline) "Online" else "Offline",
                            color = if (isOnline) Color(0xFF34D399) else Color(0xFFFBBF24),
                            fontSize = 11.sp,
                            fontWeight = FontWeight.SemiBold,
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp)
                        )
                    }

                    // Sleek Admin Mode Lock Button
                    IconButton(
                        onClick = onAdminClick,
                        modifier = Modifier
                            .size(38.dp)
                            .background(Color(0xFF0F172A), RoundedCornerShape(12.dp))
                            .border(1.dp, Color(0xFF1E293B), RoundedCornerShape(12.dp))
                    ) {
                        Icon(
                            Icons.Default.Lock,
                            contentDescription = "Admin Mode",
                            tint = Color(0xFF94A3B8),
                            modifier = Modifier.size(16.dp)
                        )
                    }
                }
            }

            // 2. LARGE CAMERA PREVIEW (Section 3 & 23)
            Box(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth()
                    .padding(vertical = 8.dp),
                contentAlignment = Alignment.Center
            ) {
                CameraViewfinder(
                    modifier = Modifier
                        .fillMaxHeight(0.96f)
                        .aspectRatio(3f / 4f),
                    isFaceDetected = (uiState !is KioskUiState.Idle),
                    onFrameCaptured = onFrameCaptured
                )

                // CONFIRMATION OVERLAY (Section 14 & 23)
                androidx.compose.animation.AnimatedVisibility(
                    visible = (uiState is KioskUiState.PunchSuccess || uiState is KioskUiState.AlreadyDone || uiState is KioskUiState.AlreadyCompleted),
                    enter = fadeIn() + scaleIn(initialScale = 0.9f),
                    exit = fadeOut()
                ) {
                    when (uiState) {
                        is KioskUiState.PunchSuccess -> {
                            val success = uiState
                            val badgeColor = Color(success.punchType.badgeColorHex)

                            Surface(
                                shape = RoundedCornerShape(20.dp),
                                color = Color(0xFF0F172A).copy(alpha = 0.98f),
                                shadowElevation = 24.dp,
                                modifier = Modifier.fillMaxWidth(0.92f).padding(16.dp)
                            ) {
                                Column(
                                    modifier = Modifier.padding(24.dp),
                                    horizontalAlignment = Alignment.CenterHorizontally
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.CheckCircle,
                                        contentDescription = null,
                                        tint = badgeColor,
                                        modifier = Modifier.size(56.dp)
                                    )

                                    Spacer(modifier = Modifier.height(10.dp))

                                    Text(
                                        text = "✓ ${success.employee.name.uppercase()}",
                                        fontSize = 22.sp,
                                        fontWeight = FontWeight.Black,
                                        color = Color.White,
                                        textAlign = TextAlign.Center
                                    )

                                    Spacer(modifier = Modifier.height(8.dp))

                                    Surface(
                                        shape = RoundedCornerShape(8.dp),
                                        color = badgeColor
                                    ) {
                                        Text(
                                            text = "${success.punchType.iconEmoji} ${success.punchType.title} — ${success.time}",
                                            color = Color.Black,
                                            fontWeight = FontWeight.Black,
                                            fontSize = 16.sp,
                                            modifier = Modifier.padding(horizontal = 16.dp, vertical = 6.dp)
                                        )
                                    }

                                    Spacer(modifier = Modifier.height(6.dp))

                                    Text(
                                        text = success.punchType.teluguTitle,
                                        color = Color(0xFF94A3B8),
                                        fontSize = 13.sp,
                                        fontWeight = FontWeight.Bold
                                    )
                                }
                            }
                        }

                        is KioskUiState.AlreadyDone -> {
                            val done = uiState
                            Surface(
                                shape = RoundedCornerShape(20.dp),
                                color = Color(0xFF0F172A).copy(alpha = 0.98f),
                                shadowElevation = 24.dp,
                                border = BorderStroke(1.5.dp, Color(0xFF0284C7)),
                                modifier = Modifier.fillMaxWidth(0.92f).padding(16.dp)
                            ) {
                                Column(
                                    modifier = Modifier.padding(24.dp),
                                    horizontalAlignment = Alignment.CenterHorizontally
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.CheckCircle,
                                        contentDescription = null,
                                        tint = Color(0xFF38BDF8),
                                        modifier = Modifier.size(56.dp)
                                    )

                                    Spacer(modifier = Modifier.height(10.dp))

                                    Text(
                                        text = "✓ ${done.employee.name.uppercase()}",
                                        fontSize = 22.sp,
                                        fontWeight = FontWeight.Black,
                                        color = Color.White,
                                        textAlign = TextAlign.Center
                                    )

                                    Spacer(modifier = Modifier.height(8.dp))

                                    Surface(
                                        shape = RoundedCornerShape(8.dp),
                                        color = Color(0xFF0369A1)
                                    ) {
                                        Text(
                                            text = "${done.punchType.iconEmoji} ${done.punchType.title} ALREADY DONE (${done.time})",
                                            color = Color.White,
                                            fontWeight = FontWeight.Black,
                                            fontSize = 14.sp,
                                            modifier = Modifier.padding(horizontal = 14.dp, vertical = 6.dp)
                                        )
                                    }

                                    Spacer(modifier = Modifier.height(6.dp))

                                    Text(
                                        text = done.telugu,
                                        color = Color(0xFF38BDF8),
                                        fontSize = 13.sp,
                                        fontWeight = FontWeight.Bold,
                                        textAlign = TextAlign.Center
                                    )

                                    Spacer(modifier = Modifier.height(4.dp))

                                    Text(
                                        text = done.nextHint,
                                        color = Color(0xFF94A3B8),
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.Medium
                                    )
                                }
                            }
                        }

                        is KioskUiState.AlreadyCompleted -> {
                            val comp = uiState
                            Surface(
                                shape = RoundedCornerShape(20.dp),
                                color = Color(0xFF0F172A).copy(alpha = 0.98f),
                                shadowElevation = 24.dp,
                                border = BorderStroke(1.5.dp, Color(0xFF7C3AED)),
                                modifier = Modifier.fillMaxWidth(0.92f).padding(16.dp)
                            ) {
                                Column(
                                    modifier = Modifier.padding(24.dp),
                                    horizontalAlignment = Alignment.CenterHorizontally
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.CheckCircle,
                                        contentDescription = null,
                                        tint = Color(0xFFA78BFA),
                                        modifier = Modifier.size(56.dp)
                                    )

                                    Spacer(modifier = Modifier.height(10.dp))

                                    Text(
                                        text = "✓ ${comp.name.uppercase()}",
                                        fontSize = 22.sp,
                                        fontWeight = FontWeight.Black,
                                        color = Color.White,
                                        textAlign = TextAlign.Center
                                    )

                                    Spacer(modifier = Modifier.height(8.dp))

                                    Surface(
                                        shape = RoundedCornerShape(8.dp),
                                        color = Color(0xFF5B21B6)
                                    ) {
                                        Text(
                                            text = "🏠 DAY COMPLETED" + if (comp.completedTime.isNotEmpty()) " (${comp.completedTime})" else "",
                                            color = Color.White,
                                            fontWeight = FontWeight.Black,
                                            fontSize = 14.sp,
                                            modifier = Modifier.padding(horizontal = 14.dp, vertical = 6.dp)
                                        )
                                    }

                                    Spacer(modifier = Modifier.height(6.dp))

                                    Text(
                                        text = "ఈ రోజుకి అన్ని పంచ్‌లు పూర్తయ్యాయి",
                                        color = Color(0xFFA78BFA),
                                        fontSize = 13.sp,
                                        fontWeight = FontWeight.Bold
                                    )
                                }
                            }
                        }

                        else -> {}
                    }
                }
            }

            // 3. INSTRUCTION / STATUS BANNER (Bilingual & High-Contrast)
            Surface(
                shape = RoundedCornerShape(16.dp),
                color = when {
                    isError -> Color(0xFF7F1D1D)
                    isChallenge -> Color(0xFF78350F)
                    uiState is KioskUiState.Detecting -> Color(0xFF0E7490)
                    else -> Color(0xFF0F172A)
                },
                border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF334155)),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 10.dp)
            ) {
                Column(
                    modifier = Modifier.padding(vertical = 10.dp, horizontal = 16.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        text = statusText,
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Black,
                        color = Color.White,
                        textAlign = TextAlign.Center,
                        letterSpacing = 0.5.sp
                    )
                    Text(
                        text = when {
                            isError -> "దయచేసి మళ్లీ ప్రయత్నించండి"
                            isChallenge -> "దయచేసి సూచనలను పాటించండి"
                            uiState is KioskUiState.Detecting -> "ముఖాన్ని గుర్తిస్తోంది..."
                            uiState is KioskUiState.InfoNotice -> uiState.telugu
                            uiState is KioskUiState.AlreadyDone -> uiState.telugu
                            uiState is KioskUiState.PunchSuccess -> "${uiState.punchType.teluguTitle} నమోదయింది"
                            uiState is KioskUiState.AlreadyCompleted -> "ఈ రోజుకి అన్ని పంచ్‌లు పూర్తయ్యాయి"
                            else -> "దయచేసి కెమెరా వైపు చూడండి"
                        },
                        fontSize = 12.sp,
                        color = Color(0xFF38BDF8),
                        fontWeight = FontWeight.Bold,
                        textAlign = TextAlign.Center,
                        modifier = Modifier.padding(top = 2.dp)
                    )
                }
            }

            // 4. BIG DIGITAL CLOCK & DATE (Section 3)
            Surface(
                shape = RoundedCornerShape(16.dp),
                color = Color(0xFF131B2E),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 4.dp)
            ) {
                Column(
                    modifier = Modifier.padding(vertical = 12.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        text = currentTimeStr.ifEmpty { "06:02 AM" },
                        fontSize = 36.sp,
                        fontWeight = FontWeight.Black,
                        color = Color.White,
                        letterSpacing = 1.sp
                    )
                    Text(
                        text = currentDateStr.ifEmpty { "08 October 2026" },
                        fontSize = 14.sp,
                        color = Color(0xFF38BDF8),
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(top = 2.dp)
                    )
                    Surface(
                        shape = RoundedCornerShape(20.dp),
                        color = Color(0xFF0F172A),
                        border = BorderStroke(1.dp, Color(0xFF1E293B)),
                        modifier = Modifier.padding(top = 8.dp)
                    ) {
                        Text(
                            text = "${currentPhase.emoji} ${currentPhase.title} • ${currentPhase.timeRange}",
                            color = Color(0xFF94A3B8),
                            fontSize = 11.sp,
                            fontWeight = FontWeight.SemiBold,
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp)
                        )
                    }
                }
            }
        }
    }
}
