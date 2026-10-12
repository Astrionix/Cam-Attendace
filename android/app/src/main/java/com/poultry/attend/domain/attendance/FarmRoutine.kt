package com.poultry.attend.domain.attendance

import java.util.Calendar

/**
 * Poultry Farm Gate Attendance Routine:
 * - Dynamic Multi-Punch (ENTRY & EXIT) throughout the day
 * - Strict 10-Minute Cooldown Buffer between punches to prevent duplicate scans
 * - Allows workers to go out on permissions, field work, lunch breaks, and re-enter freely
 */
enum class PunchType(
    val eventCode: String,
    val title: String,
    val teluguTitle: String,
    val iconEmoji: String,
    val badgeColorHex: Long
) {
    ENTRY(
        eventCode = "CHECK_IN",
        title = "ENTRY (IN)",
        teluguTitle = "ఎంట్రీ (లోపలికి)",
        iconEmoji = "🟢",
        badgeColorHex = 0xFF10B981 // Emerald
    ),
    EXIT(
        eventCode = "CHECK_OUT",
        title = "EXIT (OUT)",
        teluguTitle = "ఎగ్జిట్ (బయటకు)",
        iconEmoji = "🔴",
        badgeColorHex = 0xFFF59E0B // Amber
    ),
    // Backward compatibility aliases
    MORNING_IN(
        eventCode = "CHECK_IN",
        title = "ENTRY (IN)",
        teluguTitle = "ఎంట్రీ (లోపలికి)",
        iconEmoji = "🟢",
        badgeColorHex = 0xFF10B981
    ),
    LUNCH_OUT(
        eventCode = "CHECK_OUT",
        title = "EXIT (OUT)",
        teluguTitle = "ఎగ్జిట్ (బయటకు)",
        iconEmoji = "🔴",
        badgeColorHex = 0xFFF59E0B
    ),
    LUNCH_IN(
        eventCode = "CHECK_IN",
        title = "ENTRY (IN)",
        teluguTitle = "ఎంట్రీ (లోపలికి)",
        iconEmoji = "🟢",
        badgeColorHex = 0xFF10B981
    ),
    EVENING_OUT(
        eventCode = "CHECK_OUT",
        title = "EXIT (OUT)",
        teluguTitle = "ఎగ్జిట్ (బయటకు)",
        iconEmoji = "🔴",
        badgeColorHex = 0xFF8B5CF6
    )
}

enum class RoutinePhase(
    val title: String,
    val telugu: String,
    val timeRange: String,
    val emoji: String
) {
    MORNING_SHIFT(
        title = "Morning Shift",
        telugu = "మార్నింగ్ షిఫ్ట్",
        timeRange = "Morning – 12:00 PM",
        emoji = "🌅"
    ),
    AFTERNOON_SHIFT(
        title = "Afternoon Shift",
        telugu = "మధ్యాహ్నం షిఫ్ట్",
        timeRange = "12:00 PM – 05:00 PM",
        emoji = "☀️"
    ),
    EVENING_SHIFT(
        title = "Evening Shift",
        telugu = "సాయంత్రం షిఫ్ట్",
        timeRange = "05:00 PM Onwards",
        emoji = "🌙"
    )
}

object FarmRoutine {
    fun getCurrentPhase(calendar: Calendar = Calendar.getInstance()): RoutinePhase {
        val hour = calendar.get(Calendar.HOUR_OF_DAY)
        return when {
            hour < 12 -> RoutinePhase.MORNING_SHIFT
            hour in 12..16 -> RoutinePhase.AFTERNOON_SHIFT
            else -> RoutinePhase.EVENING_SHIFT
        }
    }
}
