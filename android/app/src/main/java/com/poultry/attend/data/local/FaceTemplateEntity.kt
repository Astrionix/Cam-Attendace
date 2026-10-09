package com.poultry.attend.data.local

import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey
import kotlinx.serialization.Serializable

@Serializable
@Entity(
    tableName = "face_templates",
    foreignKeys = [
        ForeignKey(
            entity = EmployeeEntity::class,
            parentColumns = ["id"],
            childColumns = ["employeeId"],
            onDelete = ForeignKey.CASCADE
        )
    ],
    indices = [
        Index(value = ["employeeId"]),
        Index(value = ["sampleAngle"])
    ]
)
data class FaceTemplateEntity(
    @PrimaryKey
    val id: String, // UUID
    val employeeId: String,
    val embedding: List<Float>, // 192-dim L2-normalized float embedding
    val modelVersion: String = "MobileFaceNet-int8-192",
    val sampleAngle: String = "FRONT", // FRONT, LEFT, RIGHT, UP, DOWN
    val qualityScore: Float = 0.95f,
    val createdAt: Long = System.currentTimeMillis()
)
