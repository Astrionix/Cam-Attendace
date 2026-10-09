package com.poultry.attend.data.remote

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.poultry.attend.data.local.AppDatabase

class SyncWorker(
    appContext: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(appContext, workerParams) {

    override suspend fun doWork(): Result {
        val database = AppDatabase.getInstance(applicationContext)
        val supabase = SupabaseManager(applicationContext)

        val pendingEvents = database.attendanceDao().getPendingEvents()
        if (pendingEvents.isEmpty()) {
            return Result.success()
        }

        var allSuccess = true
        for (event in pendingEvents) {
            val success = supabase.syncAttendanceEvent(event)
            if (success) {
                database.attendanceDao().markEventSynced(event.id)
            } else {
                allSuccess = false
            }
        }

        return if (allSuccess) Result.success() else Result.retry()
    }
}
