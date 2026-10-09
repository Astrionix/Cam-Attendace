package com.poultry.attend.data.local

import androidx.room.Entity
import androidx.room.PrimaryKey
import kotlinx.serialization.Serializable

@Serializable
@Entity(tableName = "shifts")
data class ShiftEntity(
    @PrimaryKey
    val id: String,
    val name: String, // e.g. "Morning Shift"
    val startTime: String, // "06:00:00"
    val endTime: String,   // "14:00:00"
    val gracePeriodMins: Int = 15
)

@Serializable
@Entity(tableName = "sheds")
data class ShedEntity(
    @PrimaryKey
    val id: String,
    val name: String, // e.g. "Broiler Shed #1"
    val code: String, // e.g. "SHED-01"
    val capacity: Int = 5000
)
