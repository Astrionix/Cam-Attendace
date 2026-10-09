package com.poultry.attend.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.poultry.attend.data.local.AttendanceWithEmployee
import com.poultry.attend.data.local.EmployeeEntity
import com.poultry.attend.domain.ota.*
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*

@Composable
fun AdminDashboardScreen(
    employees: List<EmployeeEntity>,
    todayRecords: List<AttendanceWithEmployee>,
    pendingSyncCount: Int,
    otaUpdateManager: OtaUpdateManager? = null,
    onBackToKiosk: () -> Unit,
    onAddEmployeeClick: () -> Unit,
    onDeactivateEmployee: (String) -> Unit,
    onCleanAllData: () -> Unit = {},
    onSyncNowClick: () -> Unit
) {
    var selectedTab by remember { mutableStateOf(0) }
    val tabs = listOf("Today", "History", "Staff", "Settings", "Updates", "Sync")

    // Stats calculations for 4-phase daily routine (Morning In, Lunch Out, Lunch In, Evening Out)
    val totalEmployees = maxOf(employees.size, todayRecords.mapNotNull { it.employee?.id }.distinct().size)
    val presentCount = todayRecords.filter { it.attendance.checkIn != null }.size
    val checkedOutCount = todayRecords.filter { it.attendance.checkOut != null }.size
    val onLunchCount = todayRecords.filter {
        it.attendance.lunchOut != null && it.attendance.lunchIn == null && it.attendance.checkOut == null
    }.size
    val currentlyWorking = todayRecords.filter {
        it.attendance.checkIn != null && it.attendance.checkOut == null && (it.attendance.lunchOut == null || it.attendance.lunchIn != null)
    }.size
    val absentCount = (totalEmployees - presentCount).coerceAtLeast(0)

    val timeFormat = SimpleDateFormat("hh:mm a", Locale.getDefault())

    // Calibration settings state
    var matchThreshold by remember { mutableStateOf(0.62f) }
    var ambiguityMargin by remember { mutableStateOf(0.03f) }
    var requireActiveChallenge by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("Manager Dashboard", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = Color.White)
                        Text("Poultry Attendance Terminal", fontSize = 11.sp, color = Color(0xFF94A3B8))
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBackToKiosk) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back to Attendance", tint = Color.White)
                    }
                },
                actions = {
                    Button(
                        onClick = onAddEmployeeClick,
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF10B981)),
                        shape = RoundedCornerShape(10.dp),
                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp),
                        modifier = Modifier.padding(end = 8.dp)
                    ) {
                        Icon(Icons.Default.PersonAdd, contentDescription = null, tint = Color.Black, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Register Face", color = Color.Black, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color(0xFF0F172A)),
                modifier = Modifier.statusBarsPadding()
            )
        },
        containerColor = Color(0xFF070B14)
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            // KPI Summary Row (Routine status: TOTAL, PRESENT, WORKING, LUNCH, DONE)
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(12.dp),
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                MetricBox(title = "TOTAL", count = "$totalEmployees", color = Color(0xFF38BDF8), modifier = Modifier.weight(1f))
                MetricBox(title = "PRESENT", count = "$presentCount", color = Color(0xFF10B981), modifier = Modifier.weight(1f))
                MetricBox(title = "WORKING", count = "$currentlyWorking", color = Color(0xFF34D399), modifier = Modifier.weight(1f))
                MetricBox(title = "LUNCH", count = "$onLunchCount", color = Color(0xFFF59E0B), modifier = Modifier.weight(1f))
                MetricBox(title = "DONE", count = "$checkedOutCount", color = Color(0xFFA78BFA), modifier = Modifier.weight(1f))
            }

            // Tab Navigation
            ScrollableTabRow(
                selectedTabIndex = selectedTab,
                containerColor = Color(0xFF0F172A),
                contentColor = Color(0xFF10B981),
                edgePadding = 12.dp,
                divider = {}
            ) {
                tabs.forEachIndexed { idx, title ->
                    Tab(
                        selected = selectedTab == idx,
                        onClick = { selectedTab = idx },
                        text = {
                            Text(
                                text = title,
                                fontSize = 13.sp,
                                fontWeight = if (selectedTab == idx) FontWeight.Bold else FontWeight.Normal,
                                color = if (selectedTab == idx) Color(0xFF10B981) else Color(0xFF94A3B8)
                            )
                        }
                    )
                }
            }

            Box(modifier = Modifier.fillMaxSize().padding(12.dp)) {
                when (selectedTab) {
                    0 -> TodaySummaryView(records = todayRecords, timeFormat = timeFormat)
                    1 -> HistoryView(records = todayRecords, timeFormat = timeFormat)
                    2 -> EmployeeListView(employees = employees, onDeactivate = onDeactivateEmployee)
                    3 -> CalibrationSecurityView(
                        threshold = matchThreshold,
                        onThresholdChange = { matchThreshold = it },
                        ambiguity = ambiguityMargin,
                        onAmbiguityChange = { ambiguityMargin = it },
                        activeChallenge = requireActiveChallenge,
                        onActiveChallengeToggle = { requireActiveChallenge = it },
                        onCleanAllData = onCleanAllData
                    )
                    4 -> OtaUpdatesView(otaUpdateManager = otaUpdateManager)
                    5 -> DeviceSyncView(pendingCount = pendingSyncCount, onSync = onSyncNowClick)
                }
            }
        }
    }
}

@Composable
fun MetricBox(title: String, count: String, color: Color, modifier: Modifier = Modifier) {
    Surface(modifier = modifier, shape = RoundedCornerShape(10.dp), color = Color(0xFF131B2E)) {
        Column(modifier = Modifier.padding(8.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Text(text = count, fontSize = 20.sp, fontWeight = FontWeight.Black, color = color)
            Text(text = title, fontSize = 9.sp, color = Color(0xFF94A3B8), fontWeight = FontWeight.Bold)
        }
    }
}

@Composable
fun TodaySummaryView(records: List<AttendanceWithEmployee>, timeFormat: SimpleDateFormat) {
    if (records.isEmpty()) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Text("No attendance recorded yet today", color = Color(0xFF64748B))
        }
    } else {
        LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            items(records) { item ->
                val att = item.attendance
                val emp = item.employee
                val inTime = att.checkIn?.let { timeFormat.format(Date(it)) } ?: "--"
                val lunchOutTime = att.lunchOut?.let { timeFormat.format(Date(it)) }
                val lunchInTime = att.lunchIn?.let { timeFormat.format(Date(it)) }
                val outTime = att.checkOut?.let { timeFormat.format(Date(it)) }

                val isDone = att.checkOut != null
                val isOnLunch = att.lunchOut != null && att.lunchIn == null && !isDone
                val isWorking = att.checkIn != null && !isDone && !isOnLunch

                val statusLabel = when {
                    isDone -> "DONE (OUT)"
                    isOnLunch -> "AT LUNCH"
                    isWorking -> "WORKING"
                    else -> "PENDING"
                }
                val statusColor = when {
                    isDone -> Color(0xFFA78BFA)
                    isOnLunch -> Color(0xFFFBBF24)
                    isWorking -> Color(0xFF34D399)
                    else -> Color(0xFF94A3B8)
                }
                val statusBg = when {
                    isDone -> Color(0xFF2E1065)
                    isOnLunch -> Color(0xFF78350F)
                    isWorking -> Color(0xFF064E3B)
                    else -> Color(0xFF1E293B)
                }

                Surface(shape = RoundedCornerShape(10.dp), color = Color(0xFF131B2E), modifier = Modifier.fillMaxWidth()) {
                    Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(emp?.name ?: "Unknown", fontWeight = FontWeight.Bold, color = Color.White, fontSize = 15.sp)
                            val punchDetails = buildString {
                                append("IN: $inTime")
                                if (lunchOutTime != null) {
                                    append(" • LUNCH: $lunchOutTime")
                                    if (lunchInTime != null) append(" → $lunchInTime")
                                }
                                if (outTime != null) {
                                    append(" • OUT: $outTime")
                                }
                            }
                            Text("${emp?.employeeCode ?: ""} • $punchDetails", color = Color(0xFF94A3B8), fontSize = 11.sp)
                        }

                        Surface(
                            shape = RoundedCornerShape(6.dp),
                            color = statusBg
                        ) {
                            Text(
                                text = statusLabel,
                                color = statusColor,
                                fontWeight = FontWeight.Bold,
                                fontSize = 10.sp,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun HistoryView(records: List<AttendanceWithEmployee>, timeFormat: SimpleDateFormat) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text("Attendance History (Section 19)", fontWeight = FontWeight.Bold, color = Color.White, fontSize = 14.sp)

        LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            items(records) { item ->
                val att = item.attendance
                val emp = item.employee
                val inTime = att.checkIn?.let { timeFormat.format(Date(it)) } ?: "--"
                val lunchInfo = if (att.lunchOut != null && att.lunchIn != null) {
                    " • LUNCH: ${timeFormat.format(Date(att.lunchOut))}–${timeFormat.format(Date(att.lunchIn))}"
                } else if (att.lunchOut != null) {
                    " • LUNCH: ${timeFormat.format(Date(att.lunchOut))}"
                } else ""
                val outTime = att.checkOut?.let { timeFormat.format(Date(it)) } ?: "--"

                val durationStr = if (att.checkIn != null && att.checkOut != null) {
                    val mins = ((att.checkOut - att.checkIn) / (1000 * 60)).toInt()
                    "${mins / 60}h ${String.format("%02dm", mins % 60)}"
                } else if (att.checkIn != null) {
                    "In Progress"
                } else "--"

                Surface(shape = RoundedCornerShape(10.dp), color = Color(0xFF131B2E), modifier = Modifier.fillMaxWidth()) {
                    Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(emp?.name ?: "Unknown", fontWeight = FontWeight.Bold, color = Color.White, fontSize = 14.sp)
                            Text("${att.attendanceDate} • IN: $inTime$lunchInfo • OUT: $outTime", color = Color(0xFF94A3B8), fontSize = 12.sp)
                        }
                        Text(durationStr, color = Color(0xFF38BDF8), fontWeight = FontWeight.Bold, fontSize = 12.sp)
                    }
                }
            }
        }
    }
}

@Composable
fun EmployeeListView(employees: List<EmployeeEntity>, onDeactivate: (String) -> Unit) {
    if (employees.isEmpty()) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(32.dp),
            contentAlignment = Alignment.Center
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Icon(Icons.Default.People, contentDescription = null, tint = Color(0xFF64748B), modifier = Modifier.size(48.dp))
                Spacer(modifier = Modifier.height(12.dp))
                Text("No Enrolled Staff", fontWeight = FontWeight.Bold, color = Color.White, fontSize = 16.sp)
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "All demo data cleaned. Tap 'Register Face' above to enroll farm workers with face biometrics.",
                    color = Color(0xFF94A3B8),
                    fontSize = 12.sp,
                    textAlign = androidx.compose.ui.text.style.TextAlign.Center
                )
            }
        }
    } else {
        LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            items(employees) { emp ->
                Surface(shape = RoundedCornerShape(10.dp), color = Color(0xFF131B2E), modifier = Modifier.fillMaxWidth()) {
                    Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(emp.name, fontWeight = FontWeight.Bold, color = Color.White, fontSize = 14.sp)
                            Text("${emp.employeeCode} • ${if (emp.faceTemplateReference.isNotEmpty()) "Template Enrolled" else "No Template"}", color = Color(0xFF94A3B8), fontSize = 12.sp)
                        }
                        IconButton(onClick = { onDeactivate(emp.id) }) {
                            Icon(Icons.Default.Delete, contentDescription = "Delete", tint = Color(0xFFEF4444), modifier = Modifier.size(18.dp))
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun CalibrationSecurityView(
    threshold: Float,
    onThresholdChange: (Float) -> Unit,
    ambiguity: Float,
    onAmbiguityChange: (Float) -> Unit,
    activeChallenge: Boolean,
    onActiveChallengeToggle: (Boolean) -> Unit,
    onCleanAllData: () -> Unit = {}
) {
    LazyColumn(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        // Daily Routine Schedule Card
        item {
            Surface(shape = RoundedCornerShape(12.dp), color = Color(0xFF131B2E), modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Schedule, contentDescription = null, tint = Color(0xFF38BDF8), modifier = Modifier.size(22.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Daily Farm Routine Schedule", fontWeight = FontWeight.Bold, color = Color.White, fontSize = 15.sp)
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    RoutineItemRow("🌅 Morning Entry", "Until 12:00 PM", "Morning Check-In", Color(0xFF10B981))
                    RoutineItemRow("🍽️ Lunch Break", "12:00 PM – 01:00 PM", "Lunch Out", Color(0xFFF59E0B))
                    RoutineItemRow("🥪 Afternoon Entry", "01:00 PM – 05:00 PM", "Lunch Return / Check-In", Color(0xFF38BDF8))
                    RoutineItemRow("🏠 Evening Exit", "05:00 PM Onwards", "Shift Complete / Out", Color(0xFFA78BFA))
                }
            }
        }

        item {
            Surface(shape = RoundedCornerShape(12.dp), color = Color(0xFF131B2E), modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Tune, contentDescription = null, tint = Color(0xFF10B981), modifier = Modifier.size(22.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Recognition Threshold Calibration", fontWeight = FontWeight.Bold, color = Color.White, fontSize = 15.sp)
                    }

                    Text(
                        text = "Current Threshold: ${String.format("%.2f", threshold)} (Cosine Similarity)",
                        color = Color(0xFF38BDF8),
                        fontWeight = FontWeight.Bold,
                        fontSize = 13.sp,
                        modifier = Modifier.padding(top = 8.dp)
                    )

                    Slider(
                        value = threshold,
                        onValueChange = onThresholdChange,
                        valueRange = 0.75f..0.92f,
                        steps = 16,
                        colors = SliderDefaults.colors(
                            thumbColor = Color(0xFF10B981),
                            activeTrackColor = Color(0xFF10B981),
                            inactiveTrackColor = Color(0xFF334155)
                        )
                    )

                    val ratingLabel = when {
                        threshold >= 0.83f -> "🟢 CONSERVATIVE (Recommended for Poultry Farms — Prevents Photo Spoofing & False Matches)"
                        threshold >= 0.78f -> "🟡 BALANCED (Standard Indoor Lighting)"
                        else -> "🔴 PERMISSIVE (High Risk of False Match)"
                    }

                    Text(
                        text = ratingLabel,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = when {
                            threshold >= 0.83f -> Color(0xFF34D399)
                            threshold >= 0.78f -> Color(0xFFFBBF24)
                            else -> Color(0xFFEF4444)
                        },
                        modifier = Modifier.padding(top = 2.dp)
                    )
                }
            }
        }

        item {
            Surface(shape = RoundedCornerShape(12.dp), color = Color(0xFF131B2E), modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Security, contentDescription = null, tint = Color(0xFF38BDF8), modifier = Modifier.size(22.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Ambiguity Margin Rejection", fontWeight = FontWeight.Bold, color = Color.White, fontSize = 15.sp)
                    }

                    Text(
                        text = "Margin Gap: ${String.format("%.2f", ambiguity)}",
                        color = Color(0xFF38BDF8),
                        fontWeight = FontWeight.Bold,
                        fontSize = 13.sp,
                        modifier = Modifier.padding(top = 8.dp)
                    )

                    Slider(
                        value = ambiguity,
                        onValueChange = onAmbiguityChange,
                        valueRange = 0.02f..0.10f,
                        steps = 8,
                        colors = SliderDefaults.colors(
                            thumbColor = Color(0xFF38BDF8),
                            activeTrackColor = Color(0xFF38BDF8),
                            inactiveTrackColor = Color(0xFF334155)
                        )
                    )

                    Text(
                        text = "If Top Match and Second Match score difference is less than ${String.format("%.2f", ambiguity)}, the system REJECTS both instead of guessing.",
                        fontSize = 11.sp,
                        color = Color(0xFF94A3B8),
                        modifier = Modifier.padding(top = 2.dp)
                    )
                }
            }
        }

        item {
            Surface(shape = RoundedCornerShape(12.dp), color = Color(0xFF131B2E), modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Visibility, contentDescription = null, tint = Color(0xFFF59E0B), modifier = Modifier.size(22.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Liveness & Anti-Spoofing Defense", fontWeight = FontWeight.Bold, color = Color.White, fontSize = 15.sp)
                    }

                    Text(
                        text = "Prevents attendance via printed photo, phone-screen photo, or video replay attacks.",
                        fontSize = 12.sp,
                        color = Color(0xFF94A3B8),
                        modifier = Modifier.padding(vertical = 6.dp)
                    )

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text("Randomized Active Challenge", fontWeight = FontWeight.Bold, color = Color.White, fontSize = 13.sp)
                            Text("Prompts head turn or blink if passive dynamics are borderline", color = Color(0xFF64748B), fontSize = 11.sp)
                        }
                        Switch(
                            checked = activeChallenge,
                            onCheckedChange = onActiveChallengeToggle,
                            colors = SwitchDefaults.colors(checkedThumbColor = Color(0xFF10B981))
                        )
                    }
                }
            }
        }

        // Data Management / Clean Demo Data
        item {
            var showConfirm by remember { mutableStateOf(false) }
            Surface(shape = RoundedCornerShape(12.dp), color = Color(0xFF131B2E), modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.DeleteForever, contentDescription = null, tint = Color(0xFFEF4444), modifier = Modifier.size(22.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Data Management & Reset", fontWeight = FontWeight.Bold, color = Color.White, fontSize = 15.sp)
                    }

                    Text(
                        text = "Clean all dummy demo records (PF-101..105, sample templates) and clear test attendance punches.",
                        fontSize = 12.sp,
                        color = Color(0xFF94A3B8),
                        modifier = Modifier.padding(vertical = 8.dp)
                    )

                    if (!showConfirm) {
                        Button(
                            onClick = { showConfirm = true },
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF7F1D1D)),
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Icon(Icons.Default.Delete, contentDescription = null, tint = Color(0xFFFCA5A5), modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Clean Demo & Test Data", color = Color(0xFFFCA5A5), fontWeight = FontWeight.Bold)
                        }
                    } else {
                        Column {
                            Text("Are you sure? This will delete all demo staff & test punches.", color = Color(0xFFEF4444), fontSize = 12.sp, fontWeight = FontWeight.Bold)
                            Spacer(modifier = Modifier.height(8.dp))
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                Button(
                                    onClick = {
                                        showConfirm = false
                                        onCleanAllData()
                                    },
                                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFDC2626)),
                                    shape = RoundedCornerShape(8.dp),
                                    modifier = Modifier.weight(1f)
                                ) {
                                    Text("Yes, Delete All", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                                }
                                Button(
                                    onClick = { showConfirm = false },
                                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF334155)),
                                    shape = RoundedCornerShape(8.dp),
                                    modifier = Modifier.weight(1f)
                                ) {
                                    Text("Cancel", color = Color.White, fontSize = 12.sp)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun DeviceSyncView(pendingCount: Int, onSync: () -> Unit) {
    Surface(shape = RoundedCornerShape(16.dp), color = Color(0xFF131B2E), modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(20.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Icon(Icons.Default.CloudSync, contentDescription = null, tint = Color(0xFF10B981), modifier = Modifier.size(44.dp))
            Spacer(modifier = Modifier.height(10.dp))
            Text(
                text = if (pendingCount > 0) "$pendingCount offline attendance events in queue" else "All records synced to Supabase",
                fontWeight = FontWeight.Bold,
                color = Color.White
            )
            Spacer(modifier = Modifier.height(16.dp))
            Button(
                onClick = onSync,
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF10B981)),
                shape = RoundedCornerShape(8.dp)
            ) {
                Text("Sync with Supabase Now", color = Color.Black, fontWeight = FontWeight.Bold)
            }
        }
    }
}

@Composable
fun RoutineItemRow(title: String, timeWindow: String, action: String, accentColor: Color) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column {
            Text(title, fontWeight = FontWeight.Bold, color = Color.White, fontSize = 13.sp)
            Text(action, color = Color(0xFF94A3B8), fontSize = 11.sp)
        }
        Surface(
            shape = RoundedCornerShape(6.dp),
            color = accentColor.copy(alpha = 0.15f)
        ) {
            Text(
                text = timeWindow,
                color = accentColor,
                fontWeight = FontWeight.Bold,
                fontSize = 11.sp,
                modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
            )
        }
    }
}

@Composable
fun OtaUpdatesView(otaUpdateManager: OtaUpdateManager?) {
    val coroutineScope = rememberCoroutineScope()
    var isChecking by remember { mutableStateOf(false) }
    var checkResult by remember { mutableStateOf<UpdateCheckResult?>(null) }
    var downloadState by remember { mutableStateOf<DownloadState>(DownloadState.Idle) }
    var repoInput by remember { mutableStateOf(otaUpdateManager?.githubRepo ?: "Astrionix/Cam-Attendace") }
    var isEditingRepo by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        if (otaUpdateManager != null && checkResult == null) {
            isChecking = true
            checkResult = otaUpdateManager.checkForUpdates()
            isChecking = false
        }
    }

    LazyColumn(
        verticalArrangement = Arrangement.spacedBy(12.dp),
        modifier = Modifier.fillMaxSize()
    ) {
        // App Version & Status Card
        item {
            Surface(shape = RoundedCornerShape(16.dp), color = Color(0xFF131B2E), modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(18.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f)) {
                            Surface(
                                shape = RoundedCornerShape(10.dp),
                                color = Color(0xFF10B981).copy(alpha = 0.15f),
                                modifier = Modifier.size(44.dp)
                            ) {
                                Box(contentAlignment = Alignment.Center) {
                                    Icon(Icons.Default.SystemUpdate, contentDescription = null, tint = Color(0xFF10B981), modifier = Modifier.size(24.dp))
                                }
                            }
                            Spacer(modifier = Modifier.width(12.dp))
                            Column {
                                Text("PoultryAttend Kiosk", fontWeight = FontWeight.Bold, color = Color.White, fontSize = 16.sp)
                                Text(
                                    text = "Installed Version: v${otaUpdateManager?.currentVersion ?: "1.0.0"} (Build ${otaUpdateManager?.currentVersionCode ?: 1})",
                                    color = Color(0xFF94A3B8),
                                    fontSize = 12.sp
                                )
                            }
                        }

                        Button(
                            onClick = {
                                if (otaUpdateManager != null && !isChecking) {
                                    coroutineScope.launch {
                                        isChecking = true
                                        downloadState = DownloadState.Idle
                                        checkResult = otaUpdateManager.checkForUpdates()
                                        isChecking = false
                                    }
                                }
                            },
                            enabled = !isChecking,
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF10B981)),
                            shape = RoundedCornerShape(8.dp),
                            contentPadding = PaddingValues(horizontal = 12.dp, vertical = 8.dp)
                        ) {
                            if (isChecking) {
                                CircularProgressIndicator(modifier = Modifier.size(16.dp), color = Color.Black, strokeWidth = 2.dp)
                                Spacer(modifier = Modifier.width(6.dp))
                                Text("Checking...", color = Color.Black, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                            } else {
                                Icon(Icons.Default.Refresh, contentDescription = null, tint = Color.Black, modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(6.dp))
                                Text("Check for Updates", color = Color.Black, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(12.dp))
                    HorizontalDivider(color = Color(0xFF334155))
                    Spacer(modifier = Modifier.height(10.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("Cloud Repository: ${otaUpdateManager?.githubRepo ?: "Astrionix/Cam-Attendace"}", fontSize = 11.sp, color = Color(0xFF64748B))
                        Text(
                            text = if (isEditingRepo) "Done" else "Change",
                            color = Color(0xFF38BDF8),
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier
                                .clickable {
                                    if (isEditingRepo) {
                                        otaUpdateManager?.githubRepo = repoInput
                                    }
                                    isEditingRepo = !isEditingRepo
                                }
                                .padding(4.dp)
                        )
                    }

                    if (isEditingRepo) {
                        Spacer(modifier = Modifier.height(8.dp))
                        OutlinedTextField(
                            value = repoInput,
                            onValueChange = { repoInput = it },
                            label = { Text("GitHub Owner/Repo (e.g. Astrionix/Cam-Attendace)", fontSize = 11.sp) },
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth(),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedTextColor = Color.White,
                                unfocusedTextColor = Color.White,
                                focusedBorderColor = Color(0xFF10B981),
                                unfocusedBorderColor = Color(0xFF334155)
                            )
                        )
                    }
                }
            }
        }

        // Checking Indicator
        if (isChecking) {
            item {
                Surface(shape = RoundedCornerShape(12.dp), color = Color(0xFF1E293B), modifier = Modifier.fillMaxWidth()) {
                    Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                        CircularProgressIndicator(modifier = Modifier.size(20.dp), color = Color(0xFF38BDF8), strokeWidth = 2.dp)
                        Spacer(modifier = Modifier.width(12.dp))
                        Text("Querying GitHub Releases API for latest APK build...", color = Color.White, fontSize = 13.sp)
                    }
                }
            }
        }

        // Check Result Card
        when (val res = checkResult) {
            is UpdateCheckResult.UpToDate -> {
                item {
                    Surface(shape = RoundedCornerShape(14.dp), color = Color(0xFF064E3B).copy(alpha = 0.4f), border = BorderStroke(1.dp, Color(0xFF10B981).copy(alpha = 0.4f)), modifier = Modifier.fillMaxWidth()) {
                        Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.CheckCircle, contentDescription = null, tint = Color(0xFF10B981), modifier = Modifier.size(28.dp))
                            Spacer(modifier = Modifier.width(12.dp))
                            Column {
                                Text("App is Up to Date", fontWeight = FontWeight.Bold, color = Color(0xFF10B981), fontSize = 15.sp)
                                Text("You are running the latest version (v${res.currentVersion}). Kiosk is operating normally.", color = Color(0xFFE2E8F0), fontSize = 12.sp)
                            }
                        }
                    }
                }
            }

            is UpdateCheckResult.UpdateAvailable -> {
                val info = res.updateInfo
                item {
                    Surface(
                        shape = RoundedCornerShape(16.dp),
                        color = Color(0xFF0F2642),
                        border = BorderStroke(1.5.dp, Color(0xFF06B6D4)),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(modifier = Modifier.padding(18.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(Icons.Default.CloudDownload, contentDescription = null, tint = Color(0xFF38BDF8), modifier = Modifier.size(24.dp))
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text("New Update Available!", fontWeight = FontWeight.Bold, color = Color.White, fontSize = 16.sp)
                                }
                                Surface(shape = RoundedCornerShape(6.dp), color = Color(0xFF06B6D4).copy(alpha = 0.2f)) {
                                    Text(
                                        text = "v${info.versionName}",
                                        color = Color(0xFF38BDF8),
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 12.sp,
                                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                                    )
                                }
                            }

                            Spacer(modifier = Modifier.height(8.dp))
                            Text(text = info.releaseTitle, fontWeight = FontWeight.Bold, color = Color(0xFFF8FAFC), fontSize = 14.sp)
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(text = "Release Notes: ${info.releaseNotes}", color = Color(0xFF94A3B8), fontSize = 12.sp)

                            if (info.apkSize > 0) {
                                val sizeMb = String.format("%.1f", info.apkSize / (1024f * 1024f))
                                Text(text = "File: ${info.assetName} • $sizeMb MB", color = Color(0xFF64748B), fontSize = 11.sp, modifier = Modifier.padding(top = 4.dp))
                            }

                            Spacer(modifier = Modifier.height(14.dp))

                            when (val state = downloadState) {
                                is DownloadState.Idle -> {
                                    Button(
                                        onClick = {
                                            coroutineScope.launch {
                                                try {
                                                    downloadState = DownloadState.Downloading(0f, 0L, info.apkSize)
                                                    val apkFile = otaUpdateManager?.downloadApk(info.downloadUrl) { progress, downloaded, total ->
                                                        downloadState = DownloadState.Downloading(progress, downloaded, total)
                                                    }
                                                    if (apkFile != null && apkFile.exists()) {
                                                        downloadState = DownloadState.Downloaded(apkFile)
                                                        otaUpdateManager.installApk(apkFile)
                                                    } else {
                                                        downloadState = DownloadState.Failed("Downloaded file not found")
                                                    }
                                                } catch (e: Exception) {
                                                    downloadState = DownloadState.Failed(e.localizedMessage ?: "Download failed")
                                                }
                                            }
                                        },
                                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF10B981)),
                                        shape = RoundedCornerShape(10.dp),
                                        modifier = Modifier.fillMaxWidth()
                                    ) {
                                        Icon(Icons.Default.Download, contentDescription = null, tint = Color.Black)
                                        Spacer(modifier = Modifier.width(6.dp))
                                        Text("Download & Install Update", color = Color.Black, fontWeight = FontWeight.Bold)
                                    }
                                }

                                is DownloadState.Downloading -> {
                                    Column(modifier = Modifier.fillMaxWidth()) {
                                        LinearProgressIndicator(
                                            progress = { state.progress },
                                            color = Color(0xFF10B981),
                                            trackColor = Color(0xFF334155),
                                            modifier = Modifier.fillMaxWidth().height(8.dp).clip(RoundedCornerShape(4.dp))
                                        )
                                        Spacer(modifier = Modifier.height(6.dp))
                                        val downloadedMb = String.format("%.1f", state.downloadedBytes / (1024f * 1024f))
                                        val totalMb = if (state.totalBytes > 0) String.format("%.1f", state.totalBytes / (1024f * 1024f)) else "--"
                                        Text(
                                            text = "Downloading APK: ${(state.progress * 100).toInt()}% ($downloadedMb MB / $totalMb MB)",
                                            fontSize = 11.sp,
                                            color = Color(0xFF38BDF8)
                                        )
                                    }
                                }

                                is DownloadState.Downloaded -> {
                                    Button(
                                        onClick = {
                                            otaUpdateManager?.installApk(state.apkFile)
                                        },
                                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF06B6D4)),
                                        shape = RoundedCornerShape(10.dp),
                                        modifier = Modifier.fillMaxWidth()
                                    ) {
                                        Icon(Icons.Default.Check, contentDescription = null, tint = Color.Black)
                                        Spacer(modifier = Modifier.width(6.dp))
                                        Text("Update Downloaded! Tap to Install", color = Color.Black, fontWeight = FontWeight.Bold)
                                    }
                                }

                                is DownloadState.Failed -> {
                                    Column {
                                        Text("Error: ${state.error}", color = Color(0xFFEF4444), fontSize = 12.sp)
                                        Spacer(modifier = Modifier.height(6.dp))
                                        Button(
                                            onClick = { downloadState = DownloadState.Idle },
                                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFDC2626)),
                                            shape = RoundedCornerShape(8.dp)
                                        ) {
                                            Text("Retry Download", color = Color.White)
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }

            is UpdateCheckResult.Error -> {
                item {
                    Surface(shape = RoundedCornerShape(14.dp), color = Color(0xFF2E1C1A), border = BorderStroke(1.dp, Color(0xFFF59E0B).copy(alpha = 0.4f)), modifier = Modifier.fillMaxWidth()) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Default.Info, contentDescription = null, tint = Color(0xFFF59E0B), modifier = Modifier.size(22.dp))
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("Update Server Notice", fontWeight = FontWeight.Bold, color = Color(0xFFF59E0B), fontSize = 14.sp)
                            }
                            Spacer(modifier = Modifier.height(6.dp))
                            Text(text = res.message, color = Color(0xFFE2E8F0), fontSize = 12.sp)
                        }
                    }
                }
            }

            null -> {}
        }

        // Guide on How OTA Updates Work
        item {
            Surface(shape = RoundedCornerShape(14.dp), color = Color(0xFF131B2E), modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text("How to Push an OTA Update (Step-by-Step):", fontWeight = FontWeight.Bold, color = Color.White, fontSize = 14.sp)
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = "1. Build the APK using '.\\Build-APK.bat' on your computer.\n" +
                               "2. Go to your GitHub repository: github.com/Astrionix/Cam-Attendace\n" +
                               "3. Click 'Releases' → 'Draft a new release'.\n" +
                               "4. Set Tag to next version e.g. 'v1.0.1' and upload the built APK file.\n" +
                               "5. Click 'Publish release'.\n" +
                               "6. This kiosk terminal will automatically detect the new release and let you update Over-The-Air with 1 tap!",
                        color = Color(0xFF94A3B8),
                        fontSize = 11.sp,
                        lineHeight = 18.sp
                    )
                }
            }
        }
    }
}



