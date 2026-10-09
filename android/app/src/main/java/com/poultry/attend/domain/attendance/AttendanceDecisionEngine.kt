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
        val remainingSeconds: Int
    ) : DecisionResult()

    data class Rejected(val reason: String, val userMessage: String) : DecisionResult()
}

/**
 * Poultry Farm Attendance Decision Engine.
 * 
 * Strict Daily Routine Rule:
 * 1. Morning Enter (Shift Start): Morning until 12:00 PM -> MORNING IN
 *    - Scanned at 8:00 AM -> Recorded at 8:00 AM.
 *    - Scanned again at 8:02 AM -> Already Entry Done (Time NOT altered).
 * 2. Lunch Break: 12:00 PM - 01:00 PM -> LUNCH OUT
 *    - Scanned at 12:05 PM -> Recorded at 12:05 PM.
 *    - Scanned again at 12:15 PM -> Already Lunch Out (Time NOT altered).
 * 3. Lunch Return / Afternoon Entry: 01:00 PM - 05:00 PM -> LUNCH IN
 *    - Scanned at 01:05 PM -> Recorded at 01:05 PM.
 *    - Scanned again at 02:00 PM -> Already Afternoon Entry (Time NOT altered).
 * 4. Evening Exit: 05:00 PM Onwards -> EVENING OUT
 *    - Scanned at 05:05 PM -> Recorded at 05:05 PM.
 *    - Scanned again at 05:15 PM -> Day Completed (Time NOT altered).
 */
class AttendanceDecisionEngine(
    private val database: AppDatabase,
    private val cooldownSeconds: Int = 20
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
        val calendar = Calendar.getInstance().apply { timeInMillis = now }
        val hour = calendar.get(Calendar.HOUR_OF_DAY)
        val todayStr = dateFormat.format(Date(now))
        val displayTime = timeFormat.format(Date(now))

        // 1. Duplicate Protection Cooldown
        val lastSeen = recentPunches[employee.id]
        if (lastSeen != null) {
            val elapsedSecs = (now - lastSeen) / 1000
            if (elapsedSecs < cooldownSeconds) {
                return DecisionResult.CooldownActive(
                    employee = employee,
                    remainingSeconds = (cooldownSeconds - elapsedSecs).toInt()
                )
            }
        }

        // 2. Fetch today's consolidated attendance record
        val todayRecord = database.attendanceDao().getAttendanceRecord(employee.id, todayStr)

        val punchToRecord: Pair<PunchType, AttendanceEntity>

        // =========================================================================
        // CASE 1: NO CHECK-IN TODAY YET -> MORNING ENTRY
        // =========================================================================
        if (todayRecord == null || todayRecord.checkIn == null) {
            val newRec = (todayRecord ?: AttendanceEntity(
                id = UUID.randomUUID().toString(),
                employeeId = employee.id,
                attendanceDate = todayStr,
                createdAt = now,
                updatedAt = now
            )).copy(
                checkIn = now,
                status = "WORKING",
                updatedAt = now
            )
            punchToRecord = PunchType.MORNING_IN to newRec
        }
        // =========================================================================
        // CASE 2: CHECKED IN, BUT NO HALF-DAY EXIT YET (lunchOut == null)
        // Rule: "after 3 hours only or more only for the half day exit"
        // =========================================================================
        else if (todayRecord.lunchOut == null) {
            val elapsedMillis = now - todayRecord.checkIn
            val elapsedHours = elapsedMillis / (1000.0 * 60 * 60)
            val inTime = timeFormat.format(Date(todayRecord.checkIn))

            // Only allow exit if at least 3 hours have passed or it's 12 PM or later
            if (elapsedHours < 3.0 && hour < 12) {
                // LESS than 3 hours since entry:
                // DO NOT CREATE DUPLICATE! DO NOT ALTER TIME! DO NOT EXIT!
                recentPunches[employee.id] = now
                return DecisionResult.AlreadyPunched(
                    employee = employee,
                    punchType = PunchType.MORNING_IN,
                    recordedTime = inTime,
                    message = "Entry already done at $inTime",
                    teluguMessage = "ఉదయం ఎంట్రీ ఇప్పటికే పూర్తయింది ($inTime)",
                    nextHint = "Half-day exit allowed after 3 hours"
                )
            } else {
                // 3 or more hours worked -> Record Half-Day Exit!
                val newRec = todayRecord.copy(
                    lunchOut = now,
                    status = "HALF_DAY_EXIT",
                    updatedAt = now
                )
                punchToRecord = PunchType.LUNCH_OUT to newRec
            }
        }
        // =========================================================================
        // CASE 3: HALF-DAY EXIT DONE, WAITING FOR AFTERNOON RE-ENTRY (lunchIn == null)
        // Rule: "and again after 1pm entry means after again entered to farm"
        // =========================================================================
        else if (todayRecord.lunchIn == null) {
            val outTime = timeFormat.format(Date(todayRecord.lunchOut))

            if (hour < 13) {
                // Exited, but not yet 1:00 PM:
                // DO NOT ALTER TIME!
                recentPunches[employee.id] = now
                return DecisionResult.AlreadyPunched(
                    employee = employee,
                    punchType = PunchType.LUNCH_OUT,
                    recordedTime = outTime,
                    message = "Half-Day Exit done at $outTime",
                    teluguMessage = "హాఫ్ డే ఎగ్జిట్ ఇప్పటికే పూర్తయింది ($outTime)",
                    nextHint = "Re-entry allowed from 01:00 PM"
                )
            } else {
                // 1:00 PM onwards: Record Farm Re-entry!
                val newRec = todayRecord.copy(
                    lunchIn = now,
                    status = "WORKING",
                    updatedAt = now
                )
                punchToRecord = PunchType.LUNCH_IN to newRec
            }
        }
        // =========================================================================
        // CASE 4: RE-ENTERED IN AFTERNOON, WAITING FOR EVENING EXIT (checkOut == null)
        // Rule: "and what ever time evening is considered as the evening"
        // =========================================================================
        else if (todayRecord.checkOut == null) {
            val reentryTime = timeFormat.format(Date(todayRecord.lunchIn))
            val elapsedSinceReentrySecs = (now - todayRecord.lunchIn) / 1000

            // If scanned shortly after re-entering (less than 15 min) and not evening (before 4:30 PM):
            if (elapsedSinceReentrySecs < 900 && hour < 16) {
                recentPunches[employee.id] = now
                return DecisionResult.AlreadyPunched(
                    employee = employee,
                    punchType = PunchType.LUNCH_IN,
                    recordedTime = reentryTime,
                    message = "Farm Re-entry already done at $reentryTime",
                    teluguMessage = "ఫామ్ రీ-ఎంట్రీ ఇప్పటికే పూర్తయింది ($reentryTime)",
                    nextHint = "Evening exit when leaving the farm"
                )
            } else {
                // Evening Exit! Whatever time evening they leave:
                val newRec = todayRecord.copy(
                    checkOut = now,
                    status = "COMPLETED",
                    updatedAt = now
                )
                punchToRecord = PunchType.EVENING_OUT to newRec
            }
        }
        // =========================================================================
        // CASE 5: DAY COMPLETED (checkOut != null)
        // Rule: "dont create duplicate entries...if they did entry dont alter"
        // =========================================================================
        else {
            recentPunches[employee.id] = now
            val outTime = timeFormat.format(Date(todayRecord.checkOut))
            return DecisionResult.AlreadyCompleted(
                employee = employee,
                completedTime = outTime
            )
        }

        // 3. Persist consolidated record & raw event
        val (nextPunchType, updatedRecord) = punchToRecord
        database.attendanceDao().insertOrUpdateAttendance(updatedRecord)

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
        recentPunches[employee.id] = now

        return DecisionResult.PunchRecorded(
            employee = employee,
            punchType = nextPunchType,
            formattedTime = displayTime
        )
    }
}
