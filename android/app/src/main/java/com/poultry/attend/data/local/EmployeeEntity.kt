package com.poultry.attend.data.local

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey
import kotlinx.serialization.Serializable

@Serializable
@Entity(
    tableName = "employees",
    indices = [
        Index(value = ["employeeCode"], unique = true),
        Index(value = ["status"])
    ]
)
data class EmployeeEntity(
    @PrimaryKey
    val id: String, // UUID
    val employeeCode: String, // e.g. PF-101
    val name: String,
    val faceTemplateReference: List<Float> = emptyList(), // 192-dim MobileFaceNet embedding vector
    val status: String = "ACTIVE", // ACTIVE or INACTIVE
    val createdAt: Long = System.currentTimeMillis()
)
