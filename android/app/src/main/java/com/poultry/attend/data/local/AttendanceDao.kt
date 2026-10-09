package com.poultry.attend.data.local

import androidx.room.*
import kotlinx.coroutines.flow.Flow

data class AttendanceWithEmployee(
    @Embedded val attendance: AttendanceEntity,
    @Relation(
        parentColumn = "employeeId",
        entityColumn = "id"
    )
    val employee: EmployeeEntity?
)

@Dao
interface AttendanceDao {

    @Query("SELECT * FROM attendance WHERE attendanceDate = :date ORDER BY updatedAt DESC")
    fun getTodayAttendanceFlow(date: String): Flow<List<AttendanceEntity>>

    @Transaction
    @Query("SELECT * FROM attendance WHERE attendanceDate = :date ORDER BY updatedAt DESC")
    fun getTodayAttendanceWithEmployeeFlow(date: String): Flow<List<AttendanceWithEmployee>>

    @Query("SELECT * FROM attendance WHERE attendanceDate = :date ORDER BY updatedAt DESC")
    suspend fun getTodayAttendanceSync(date: String): List<AttendanceEntity>

    @Query("SELECT * FROM attendance WHERE employeeId = :employeeId AND attendanceDate = :date LIMIT 1")
    suspend fun getAttendanceRecord(employeeId: String, date: String): AttendanceEntity?

    @Transaction
    @Query("SELECT * FROM attendance WHERE attendanceDate >= :startDate AND attendanceDate <= :endDate ORDER BY attendanceDate DESC, updatedAt DESC")
    suspend fun getHistoryWithEmployee(startDate: String, endDate: String): List<AttendanceWithEmployee>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertOrUpdateAttendance(attendance: AttendanceEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertEvent(event: AttendanceEventEntity)

    @Query("SELECT * FROM attendance_events WHERE syncStatus = 'PENDING' ORDER BY eventTimestamp ASC")
    suspend fun getPendingEvents(): List<AttendanceEventEntity>

    @Query("UPDATE attendance_events SET syncStatus = 'SYNCED' WHERE id = :id")
    suspend fun markEventSynced(id: String)

    @Query("SELECT COUNT(*) FROM attendance_events WHERE syncStatus = 'PENDING'")
    fun getPendingSyncCountFlow(): Flow<Int>

    @Query("SELECT COUNT(*) FROM attendance_events WHERE syncStatus = 'PENDING'")
    suspend fun getPendingSyncCount(): Int

    @Query("DELETE FROM attendance")
    suspend fun deleteAllAttendance()

    @Query("DELETE FROM attendance_events")
    suspend fun deleteAllEvents()
}
