package com.poultry.attend

import android.Manifest
import android.content.pm.PackageManager
import android.os.Bundle
import android.view.WindowManager
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.core.content.ContextCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import com.poultry.attend.ui.screens.*
import com.poultry.attend.ui.theme.PoultryAttendTheme
import com.poultry.attend.ui.viewmodels.KioskViewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*

enum class AppScreen {
    KIOSK,
    ADMIN_DASHBOARD,
    EMPLOYEE_REGISTRATION
}

class MainActivity : ComponentActivity() {

    private var hasCameraPermission by mutableStateOf(false)

    private val cameraPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { isGranted ->
        hasCameraPermission = isGranted
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Lock screen ON for 24/7 dedicated attendance kiosk operation (Section 1 & 3)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        // Immersive sticky full-screen mode to prevent workers from exiting kiosk
        WindowCompat.setDecorFitsSystemWindows(window, false)
        val controller = WindowInsetsControllerCompat(window, window.decorView)
        controller.hide(WindowInsetsCompat.Type.systemBars())
        controller.systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE

        // Check Camera permission
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) {
            hasCameraPermission = true
        } else {
            cameraPermissionLauncher.launch(Manifest.permission.CAMERA)
        }

        val app = application as PoultryAttendApp

        setContent {
            PoultryAttendTheme {
                val coroutineScope = rememberCoroutineScope()
                var currentScreen by remember { mutableStateOf(AppScreen.KIOSK) }
                var showAdminPinDialog by remember { mutableStateOf(false) }

                // ViewModel initialization
                val kioskViewModel = remember {
                    KioskViewModel(
                        database = app.database,
                        faceDetector = app.faceDetector,
                        qualityChecker = app.qualityChecker,
                        faceAligner = app.faceAligner,
                        livenessDetector = app.livenessDetector,
                        mobileFaceNet = app.mobileFaceNet,
                        recognitionEngine = app.recognitionEngine,
                        attendanceDecisionEngine = app.attendanceDecisionEngine,
                        ttsSpeaker = app.ttsSpeaker,
                        supabaseManager = app.supabaseManager
                    )
                }

                val uiState by kioskViewModel.uiState.collectAsState()

                val todayDate = remember { SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date()) }
                val todayRecords by app.database.attendanceDao().getTodayAttendanceWithEmployeeFlow(todayDate).collectAsState(initial = emptyList())
                val employeeList by app.database.employeeDao().getAllActiveEmployeesFlow().collectAsState(initial = emptyList())
                val pendingSyncCount by app.database.attendanceDao().getPendingSyncCountFlow().collectAsState(initial = 0)

                if (!hasCameraPermission) {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Text("Camera permission required for Dedicated Attendance Terminal")
                    }
                    return@PoultryAttendTheme
                }

                if (showAdminPinDialog) {
                    AdminLoginDialog(
                        correctPin = "6999",
                        onDismiss = { showAdminPinDialog = false },
                        onSuccess = {
                            showAdminPinDialog = false
                            currentScreen = AppScreen.ADMIN_DASHBOARD
                        }
                    )
                }

                when (currentScreen) {
                    AppScreen.KIOSK -> {
                        KioskScreen(
                            farmName = "FARM ATTENDANCE",
                            uiState = uiState,
                            isOnline = true,
                            pendingSyncCount = pendingSyncCount,
                            onAdminClick = { showAdminPinDialog = true },
                            onFrameCaptured = { frame ->
                                kioskViewModel.onFrameAvailable(frame)
                            },
                            onDismissPopup = {
                                kioskViewModel.dismissPopup()
                            }
                        )
                    }

                    AppScreen.ADMIN_DASHBOARD -> {
                        AdminDashboardScreen(
                            employees = employeeList,
                            todayRecords = todayRecords,
                            pendingSyncCount = pendingSyncCount,
                            onBackToKiosk = {
                                kioskViewModel.loadEmployees() // Reload on return
                                currentScreen = AppScreen.KIOSK
                            },
                            onAddEmployeeClick = { currentScreen = AppScreen.EMPLOYEE_REGISTRATION },
                            onDeactivateEmployee = { id ->
                                coroutineScope.launch(Dispatchers.IO) {
                                    app.database.employeeDao().deleteEmployee(id)
                                    kioskViewModel.loadEmployees()
                                }
                            },
                            onCleanAllData = {
                                coroutineScope.launch(Dispatchers.IO) {
                                    app.database.employeeDao().deleteDemoEmployees()
                                    app.database.attendanceDao().deleteAllAttendance()
                                    app.database.attendanceDao().deleteAllEvents()
                                    kioskViewModel.loadEmployees()
                                }
                            },
                            onSyncNowClick = {
                                coroutineScope.launch(Dispatchers.IO) {
                                    app.supabaseManager.syncWithDesktop(app.database)
                                    kioskViewModel.loadEmployees()
                                }
                            }
                        )
                    }

                    AppScreen.EMPLOYEE_REGISTRATION -> {
                        EmployeeRegistrationScreen(
                            registrationManager = app.registrationManager,
                            onBack = { currentScreen = AppScreen.ADMIN_DASHBOARD },
                            onComplete = {
                                kioskViewModel.loadEmployees()
                                currentScreen = AppScreen.KIOSK
                            }
                        )
                    }
                }
            }
        }
    }
}
