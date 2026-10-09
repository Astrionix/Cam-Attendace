package com.poultry.attend.domain.attendance

import java.util.Calendar

/**
 * Poultry Farm Daily Work Routine:
 * 1. Morning Enter (Shift Start): Until 12:00 PM -> MORNING IN
 * 2. After 12:00 PM Lunch Break: 12:00 PM - 01:00 PM -> LUNCH OUT
 * 3. Again After 1:00 PM Return: 01:00 PM - 05:00 PM -> LUNCH IN (Afternoon Entry)
 * 4. From 5:00 PM Onwards: 05:00 PM+ -> EVENING OUT (Day Complete)
 */
enum class PunchType(
    val eventCode: String,
    val title: String,
    val teluguTitle: String,
    val iconEmoji: String,
    val badgeColorHex: Long
) {
    MORNING_IN(
        eventCode = "CHECK_IN",
        title = "ENTRY (MORNING)",
        teluguTitle = "ఉదయం ఎంట్రీ",
        iconEmoji = "🌅",
        badgeColorHex = 0xFF10B981 // Emerald
    ),
    LUNCH_OUT(
        eventCode = "LUNCH_OUT",
        title = "HALF-DAY EXIT",
        teluguTitle = "హాఫ్ డే ఎగ్జిట్ (విరామం)",
        iconEmoji = "🚪",
        badgeColorHex = 0xFFF59E0B // Amber
    ),
    LUNCH_IN(
        eventCode = "LUNCH_IN",
        title = "FARM RE-ENTRY",
        teluguTitle = "ఫామ్ రీ-ఎంట్రీ",
        iconEmoji = "🚶‍♂️",
        badgeColorHex = 0xFF0EA5E9 // Cyan / Sky
    ),
    EVENING_OUT(
        eventCode = "CHECK_OUT",
        title = "EVENING EXIT",
        teluguTitle = "సాయంత్రం ఎగ్జిట్ (పని పూర్తయింది)",
        iconEmoji = "🏠",
        badgeColorHex = 0xFF8B5CF6 // Purple
    )
}

enum class RoutinePhase(
    val title: String,
    val telugu: String,
    val timeRange: String,
    val emoji: String
) {
    MORNING_ENTRY(
        title = "Morning Entry",
        telugu = "మార్నింగ్ ఎంట్రీ",
        timeRange = "Morning – 12:00 PM",
        emoji = "🌅"
    ),
    LUNCH_OUT(
        title = "Lunch Break",
        telugu = "భోజన విరామం",
        timeRange = "12:00 PM – 01:00 PM",
        emoji = "🍽️"
    ),
    AFTERNOON_ENTRY(
        title = "Afternoon Entry",
        telugu = "మధ్యాహ్నం ఎంట్రీ",
        timeRange = "01:00 PM – 05:00 PM",
        emoji = "🥪"
    ),
    EVENING_EXIT(
        title = "Evening Exit",
        telugu = "పని ముగింపు",
        timeRange = "05:00 PM Onwards",
        emoji = "🏠"
    )
}

object FarmRoutine {
    fun getCurrentPhase(calendar: Calendar = Calendar.getInstance()): RoutinePhase {
        val hour = calendar.get(Calendar.HOUR_OF_DAY)
        return when {
            hour < 12 -> RoutinePhase.MORNING_ENTRY
            hour == 12 -> RoutinePhase.LUNCH_OUT
            hour in 13..16 -> RoutinePhase.AFTERNOON_ENTRY
            else -> RoutinePhase.EVENING_EXIT
        }
    }
}
