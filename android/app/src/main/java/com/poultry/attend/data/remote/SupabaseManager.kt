package com.poultry.attend.data.remote

import android.content.Context
import android.content.SharedPreferences
import com.poultry.attend.data.local.AppDatabase
import com.poultry.attend.data.local.AttendanceEventEntity
import com.poultry.attend.data.local.EmployeeEntity
import io.ktor.client.HttpClient
import io.ktor.client.engine.android.Android
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.request.get
import io.ktor.client.request.header
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.client.statement.bodyAsText
import io.ktor.http.ContentType
import io.ktor.http.contentType
import io.ktor.http.isSuccess
import io.ktor.serialization.kotlinx.json.json
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import kotlinx.serialization.json.putJsonArray

@Serializable
data class SupabaseEventPayload(
    val id: String,
    val employee_id: String,
    val event_type: String,
    val event_timestamp: Long,
    val recognition_score: Float,
    val liveness_result: String,
    val device_id: String
)

@Serializable
data class SupabaseEmployeeDto(
    val id: String,
    val employee_code: String? = null,
    val emp_code: String? = null,
    val name: String? = null,
    val full_name: String? = null,
    val status: String = "ACTIVE",
    val face_template: List<Float>? = null,
    val face_template_reference: List<Float>? = null
)

@Serializable
data class SyncMetaDto(
    val clean_seq: Int = 0
)

class SupabaseManager(context: Context) {

    private val prefs: SharedPreferences = context.getSharedPreferences("poultry_supabase_prefs", Context.MODE_PRIVATE)

    var supabaseUrl: String
        get() {
            val url = prefs.getString("supabase_url", null)
            if (url.isNullOrBlank() || url.contains("192.168.") || url.contains("127.0.0.1")) {
                return "https://jgukiuyocejzyhojafyk.supabase.co"
            }
            return url
        }
        set(value) = prefs.edit().putString("supabase_url", value).apply()

    var supabaseAnonKey: String
        get() = prefs.getString("supabase_anon_key", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpndWtpdXlvY2Vqenlob2phZnlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0NjE2NjAsImV4cCI6MjEwNzAzNzY2MH0.2Ad6fwlq2X4LMssPzl93uQbSEqZKEgTeoraF5SQXRuw") ?: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpndWtpdXlvY2Vqenlob2phZnlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0NjE2NjAsImV4cCI6MjEwNzAzNzY2MH0.2Ad6fwlq2X4LMssPzl93uQbSEqZKEgTeoraF5SQXRuw"
        set(value) = prefs.edit().putString("supabase_anon_key", value).apply()

    var deviceId: String
        get() = prefs.getString("device_id", "Redmi-Go-Kiosk-1") ?: "Redmi-Go-Kiosk-1"
        set(value) = prefs.edit().putString("device_id", value).apply()

    private val client = HttpClient(Android) {
        install(ContentNegotiation) {
            json(Json {
                ignoreUnknownKeys = true
                isLenient = true
                encodeDefaults = true
            })
        }
    }

    private fun getUrlsToTry(): List<String> {
        val urls = mutableListOf<String>()
        if (supabaseUrl.startsWith("https://")) {
            urls.add(supabaseUrl)
        }
        urls.add("http://192.168.29.99:3000")
        urls.add("http://127.0.0.1:3000")
        if (!urls.contains(supabaseUrl)) {
            urls.add(supabaseUrl)
        }
        return urls.distinct()
    }

    suspend fun syncAttendanceEvent(event: AttendanceEventEntity): Boolean {
        val payload = SupabaseEventPayload(
            id = event.id,
            employee_id = event.employeeId,
            event_type = event.eventType,
            event_timestamp = event.eventTimestamp,
            recognition_score = event.recognitionScore,
            liveness_result = event.livenessResult,
            device_id = event.deviceId
        )

        for (base in getUrlsToTry()) {
            try {
                val endpoint = "$base/rest/v1/attendance_events"
                val response = client.post(endpoint) {
                    header("apikey", supabaseAnonKey)
                    header("Authorization", "Bearer $supabaseAnonKey")
                    header("Prefer", "resolution=merge-duplicates")
                    contentType(ContentType.Application.Json)
                    setBody(payload)
                }
                if (response.status.isSuccess()) {
                    return true
                }
            } catch (e: Exception) {
                // Try next url
            }
        }
        return false
    }

    suspend fun fetchEmployees(): List<SupabaseEmployeeDto>? {
        for (base in getUrlsToTry()) {
            try {
                val endpoint = "$base/rest/v1/employees"
                val response = client.get(endpoint) {
                    header("apikey", supabaseAnonKey)
                    header("Authorization", "Bearer $supabaseAnonKey")
                }
                if (response.status.isSuccess()) {
                    val jsonText = response.bodyAsText()
                    return Json { ignoreUnknownKeys = true }.decodeFromString(jsonText)
                }
            } catch (e: Exception) {
                // Try next
            }
        }
        return null
    }

    suspend fun registerEmployeeOnline(emp: EmployeeEntity): Boolean {
        val bodyObj = buildJsonObject {
            put("id", emp.id)
            put("employee_code", emp.employeeCode)
            put("emp_code", emp.employeeCode)
            put("name", emp.name)
            put("full_name", emp.name)
            put("status", emp.status)
            putJsonArray("face_template") {
                emp.faceTemplateReference.forEach { add(JsonPrimitive(it)) }
            }
            putJsonArray("face_template_reference") {
                emp.faceTemplateReference.forEach { add(JsonPrimitive(it)) }
            }
        }

        for (base in getUrlsToTry()) {
            try {
                val endpoint = "$base/rest/v1/employees"
                val response = client.post(endpoint) {
                    header("apikey", supabaseAnonKey)
                    header("Authorization", "Bearer $supabaseAnonKey")
                    header("Prefer", "resolution=merge-duplicates")
                    contentType(ContentType.Application.Json)
                    setBody(bodyObj)
                }
                if (response.status.isSuccess()) {
                    return true
                }
            } catch (e: Exception) {
                // Try next
            }
        }
        return false
    }

    suspend fun fetchDeletedEmployeeIds(): List<String> {
        for (base in getUrlsToTry()) {
            try {
                val endpoint = "$base/api/deleted-employees"
                val response = client.get(endpoint) {
                    header("apikey", supabaseAnonKey)
                    header("Authorization", "Bearer $supabaseAnonKey")
                }
                if (response.status.isSuccess()) {
                    val text = response.bodyAsText()
                    return Json { ignoreUnknownKeys = true }.decodeFromString(text)
                }
            } catch (e: Exception) {
                // Try next
            }
        }
        return emptyList()
    }

    suspend fun fetchSyncMeta(): Int? {
        for (base in getUrlsToTry()) {
            try {
                val endpoint = "$base/api/sync-meta"
                val response = client.get(endpoint) {
                    header("apikey", supabaseAnonKey)
                    header("Authorization", "Bearer $supabaseAnonKey")
                }
                if (response.status.isSuccess()) {
                    val text = response.bodyAsText()
                    val meta = Json { ignoreUnknownKeys = true }.decodeFromString<SyncMetaDto>(text)
                    return meta.clean_seq
                }
            } catch (e: Exception) {
                // Try next
            }
        }
        return null
    }

    suspend fun syncWithDesktop(database: AppDatabase): Boolean {
        return try {
            // 1. Check if desktop explicitly performed a "Clean Demo Data" action
            val remoteCleanSeq = fetchSyncMeta()
            if (remoteCleanSeq != null) {
                val lastCleanSeq = prefs.getInt("last_clean_seq", 0)
                if (remoteCleanSeq > lastCleanSeq) {
                    database.employeeDao().deleteDemoEmployees()
                    database.attendanceDao().deleteAllAttendance()
                    database.attendanceDao().deleteAllEvents()
                    prefs.edit().putInt("last_clean_seq", remoteCleanSeq).apply()
                }
            }

            // 2. Fetch current remote employees from desktop
            val remoteList = fetchEmployees() ?: return false
            val remoteMap = remoteList.associateBy { it.id }

            // 3. Fetch all current local active employees
            val localEmployees = database.employeeDao().getAllActiveEmployees()
            val localMap = localEmployees.associateBy { it.id }

            // 4. BI-DIRECTIONAL PUSH: Any local employee with face template not yet on desktop -> UPLOAD!
            for (local in localEmployees) {
                if (!remoteMap.containsKey(local.id) && local.faceTemplateReference.isNotEmpty()) {
                    registerEmployeeOnline(local)
                }
            }

            // 5. BI-DIRECTIONAL PULL: Merge remote employees into Room, preserving local face templates
            val entities = remoteList.map { dto ->
                val local = localMap[dto.id]
                val code = dto.employee_code ?: dto.emp_code ?: "PF-001"
                val empName = dto.name ?: dto.full_name ?: "Worker"
                val faceTemplate = when {
                    !dto.face_template.isNullOrEmpty() -> dto.face_template
                    !dto.face_template_reference.isNullOrEmpty() -> dto.face_template_reference
                    local != null && local.faceTemplateReference.isNotEmpty() -> local.faceTemplateReference
                    else -> emptyList()
                }
                EmployeeEntity(
                    id = dto.id,
                    employeeCode = code,
                    name = empName,
                    faceTemplateReference = faceTemplate,
                    status = dto.status
                )
            }
            if (entities.isNotEmpty()) {
                database.employeeDao().insertEmployees(entities)
            }

            // 6. Delete ONLY employees that were explicitly deleted on desktop admin
            val deletedIds = fetchDeletedEmployeeIds()
            for (delId in deletedIds) {
                database.employeeDao().deleteEmployee(delId)
            }

            // 7. Push pending offline attendance events to desktop
            val pendingEvents = database.attendanceDao().getPendingEvents()
            for (event in pendingEvents) {
                if (syncAttendanceEvent(event)) {
                    database.attendanceDao().markEventSynced(event.id)
                }
            }

            true
        } catch (e: Exception) {
            false
        }
    }
}
