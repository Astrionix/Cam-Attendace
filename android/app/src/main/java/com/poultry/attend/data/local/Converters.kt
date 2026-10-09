package com.poultry.attend.data.local

import androidx.room.TypeConverter
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

class Converters {
    private val json = Json { ignoreUnknownKeys = true }

    @TypeConverter
    fun fromFloatList(value: List<Float>?): String {
        return value?.let { json.encodeToString(it) } ?: "[]"
    }

    @TypeConverter
    fun toFloatList(value: String?): List<Float> {
        return try {
            if (value.isNullOrBlank()) emptyList()
            else json.decodeFromString(value)
        } catch (e: Exception) {
            emptyList()
        }
    }
}
