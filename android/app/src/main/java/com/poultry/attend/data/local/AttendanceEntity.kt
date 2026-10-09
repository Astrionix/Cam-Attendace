package com.poultry.attend.data.local

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey
import kotlinx.serialization.Serializable

@Serializable
@Entity(
    tableName = "attendance",
    indices = [
        Index(value = ["employeeId", "attendanceDate"], unique = true),
        Index(value = ["attendanceDate"])
    ]
)
data class AttendanceEntity(
    @PrimaryKey
    val id: String, // UUID
    val employeeId: String,
    val attendanceDate: String, // YYYY-MM-DD
    val checkIn: Long? = null,  // Morning entry (epoch millis)
    val lunchOut: Long? = null, // Lunch exit after 12:00 PM (epoch millis)
    val lunchIn: Long? = null,  // Lunch return after 01:00 PM (epoch millis)
    val checkOut: Long? = null, // Evening exit from 05:00 PM (epoch millis)
    val status: String = "PRESENT", // PRESENT, WORKING, LUNCH, COMPLETED, HALF_DAY
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis()
)

@Serializable
@Entity(
    tableName = "attendance_events",
    indices = [
        Index(value = ["employeeId"]),
        Index(value = ["eventTimestamp"]),
        Index(value = ["syncStatus"])
    ]
)
data class AttendanceEventEntity(
    @PrimaryKey
    val id: String, // UUID
    val employeeId: String,
    val eventType: String, // CHECK_IN or CHECK_OUT
    val eventTimestamp: Long = System.currentTimeMillis(),
    val recognitionScore: Float,
    val livenessResult: String = "PASSED",
    val deviceId: String = "Redmi-Go-Gate-1",
    val syncStatus: String = "PENDING" // PENDING, SYNCED
)
