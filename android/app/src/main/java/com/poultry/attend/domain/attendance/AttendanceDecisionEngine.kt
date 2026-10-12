package com.poultry.attend.domain.attendance

import com.poultry.attend.data.local.AppDatabase
import com.poultry.attend.data.local.AttendanceEntity
import com.poultry.attend.data.local.AttendanceEventEntity
import com.poultry.attend.data.local.EmployeeEntity
import java.text.SimpleDateFormat
import java.util.*
import java.util.concurrent.ConcurrentHashMap

sealed class DecisionResult {
    data class PunchRecorded(
        val employee: EmployeeEntity,
        val punchType: PunchType,
        val formattedTime: String
    ) : DecisionResult()

    data class AlreadyPunched(
        val employee: EmployeeEntity,
        val punchType: PunchType,
        val recordedTime: String,
        val message: String,
        val teluguMessage: String,
        val nextHint: String
    ) : DecisionResult()

    data class AlreadyCompleted(
        val employee: EmployeeEntity,
        val completedTime: String
    ) : DecisionResult()

    data class CooldownActive(
        val employee: EmployeeEntity,
        val remainingSeconds: Int,
        val recordedTime: String = "",
        val punchType: PunchType = PunchType.ENTRY
    ) : DecisionResult()

    data class Rejected(val reason: String, val userMessage: String) : DecisionResult()
}

/**
 * Poultry Farm Gate Attendance Decision Engine.
 * 
 * Flexible Multi-Punch System with 10-Minute Cooldown Protection:
 * 1. Workers can enter and exit multiple times a day (permission, chores, lunch break, shifts).
 * 2. 10-Minute Cooldown Rule (600 seconds):
 *    - Once an ENTRY or EXIT is recorded, no other punch (neither entry nor exit) can be recorded
 *      for that employee for the next 10 minutes.
 *    - If scanned within 10 minutes, triggers CooldownActive alert without altering any records.
 * 3. After 10 minutes:
 *    - If the employee was currently IN (last punch was CHECK_IN), next punch records EXIT (CHECK_OUT).
 *    - If the employee was currently OUT (last punch was CHECK_OUT or first of the day), next punch records ENTRY (CHECK_IN).
 * 4. All punches are recorded in real-time and synced to Supabase / Web Dashboard.
 */
class AttendanceDecisionEngine(
    private val database: AppDatabase,
    private val cooldownSeconds: Int = 600 // 10 minutes default
) {
    private val recentPunches = ConcurrentHashMap<String, Long>()
    private val dateFormat = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
    private val timeFormat = SimpleDateFormat("hh:mm a", Locale.getDefault())

    suspend fun evaluate(
        employee: EmployeeEntity,
        confidenceScore: Float,
        livenessScore: Float
    ): DecisionResult {
        val now = System.currentTimeMillis()
        val todayStr = dateFormat.format(Date(now))
        val displayTime = timeFormat.format(Date(now))

        // Calculate start of day (midnight) in local time
        val calendar = Calendar.getInstance().apply {
            timeInMillis = now
            set(Calendar.HOUR_OF_DAY, 0)
            set(Calendar.MINUTE, 0)
            set(Calendar.SECOND, 0)
            set(Calendar.MILLISECOND, 0)
        }
        val startOfDay = calendar.timeInMillis

        // 1. Fetch latest punch event today from DB
        val latestEventToday = database.attendanceDao().getLatestEventToday(employee.id, startOfDay)

        // Find last punch timestamp (either in memory or from persisted DB event)
        val lastPunchTs = recentPunches[employee.id] ?: latestEventToday?.eventTimestamp

        // 2. 10-MINUTE COOLDOWN PROTECTION
        // Once an employee gives entry or exit, neither exit nor entry can be recorded for the next 10 minutes
        if (lastPunchTs != null) {
            val elapsedSecs = (now - lastPunchTs) / 1000
            if (elapsedSecs < cooldownSeconds) {
                val remainingSecs = (cooldownSeconds - elapsedSecs).toInt()
                val lastFormatted = timeFormat.format(Date(lastPunchTs))
                val isLastEntry = (latestEventToday?.eventType ?: "CHECK_IN") == "CHECK_IN"
                val lastPunchType = if (isLastEntry) PunchType.ENTRY else PunchType.EXIT

                return DecisionResult.CooldownActive(
                    employee = employee,
                    remainingSeconds = remainingSecs,
                    recordedTime = lastFormatted,
                    punchType = lastPunchType
                )
            }
        }

        // 3. DETERMINE NEXT PUNCH (ENTRY vs EXIT)
        // If employee has no event today, or last event was CHECK_OUT -> Next is ENTRY
        // If last event today was CHECK_IN -> Next is EXIT (going on permission, lunch, or leaving)
        val nextPunchType = if (latestEventToday == null || latestEventToday.eventType == "CHECK_OUT") {
            PunchType.ENTRY
        } else {
            PunchType.EXIT
        }

        // 4. UPDATE TODAY'S CONSOLIDATED ATTENDANCE RECORD
        val todayRecord = database.attendanceDao().getAttendanceRecord(employee.id, todayStr)
        val updatedRecord = if (todayRecord == null) {
            AttendanceEntity(
                id = UUID.randomUUID().toString(),
                employeeId = employee.id,
                attendanceDate = todayStr,
                checkIn = now,
                checkOut = null,
                status = "WORKING",
                createdAt = now,
                updatedAt = now
            )
        } else {
            if (nextPunchType == PunchType.ENTRY) {
                todayRecord.copy(
                    checkIn = todayRecord.checkIn ?: now,
                    status = "WORKING",
                    updatedAt = now
                )
            } else {
                todayRecord.copy(
                    checkOut = now,
                    status = "EXITED",
                    updatedAt = now
                )
            }
        }
        database.attendanceDao().insertOrUpdateAttendance(updatedRecord)

        // 5. PERSIST RAW EVENT FOR REAL-TIME SYNC
        val rawEvent = AttendanceEventEntity(
            id = UUID.randomUUID().toString(),
            employeeId = employee.id,
            eventType = nextPunchType.eventCode,
            eventTimestamp = now,
            recognitionScore = confidenceScore,
            livenessResult = "PASSED",
            deviceId = "Redmi-Go-Gate-1",
            syncStatus = "PENDING"
        )
        database.attendanceDao().insertEvent(rawEvent)

        // 6. RECORD TIMESTAMP IN IN-MEMORY COOLDOWN TRACKER
        recentPunches[employee.id] = now

        return DecisionResult.PunchRecorded(
            employee = employee,
            punchType = nextPunchType,
            formattedTime = displayTime
        )
    }
}
